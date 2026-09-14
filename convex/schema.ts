import { defineSchema, defineTable } from "convex/server";
import { authTables } from "@convex-dev/auth/server";
import { v } from "convex/values";

/**
 * Money is stored everywhere as an integer number of KOBO (1 naira = 100 kobo).
 * Never store money as a float. Format for display with `formatNaira` in src/lib/format.ts.
 */

export const roleValidator = v.union(
  v.literal("admin"), // full control, including staff and settings
  v.literal("manager"), // orders, payments, inventory, customers
  v.literal("cashier"), // walk-in POS only
);

export const orderStatusValidator = v.union(
  v.literal("awaiting_payment"), // order placed, customer has not told us they paid
  v.literal("payment_review"), // customer submitted proof, admin must verify
  v.literal("paid"), // payment verified
  v.literal("processing"), // being packed
  v.literal("ready"), // ready for pickup / handed to dispatch
  v.literal("dispatched"), // out for delivery
  v.literal("completed"), // customer has it
  v.literal("cancelled"),
);

export const paymentMethodValidator = v.union(
  v.literal("bank_transfer"),
  v.literal("cash"),
  v.literal("pos_terminal"),
);

export const paymentStatusValidator = v.union(
  v.literal("pending"), // awaiting the customer
  v.literal("submitted"), // customer says they have paid
  v.literal("verified"),
  v.literal("rejected"),
  v.literal("refunded"),
);

const addressValidator = v.object({
  street: v.string(),
  city: v.string(),
  state: v.string(),
  landmark: v.optional(v.string()),
  instructions: v.optional(v.string()),
});

const orderItemValidator = v.object({
  productId: v.id("products"),
  title: v.string(),
  author: v.optional(v.string()),
  sku: v.optional(v.string()),
  imageUrl: v.optional(v.string()),
  unitPrice: v.number(), // kobo, snapshotted at order time
  quantity: v.number(),
  lineTotal: v.number(), // kobo
});

const timelineEntryValidator = v.object({
  status: v.string(),
  note: v.optional(v.string()),
  at: v.number(),
  byName: v.optional(v.string()),
});

export default defineSchema({
  ...authTables,

  // `users` comes from authTables; these are the fields we add on top of it.
  // Convex Auth creates the row on first sign-in, then `staff.ts` fills the rest.
  users: defineTable({
    name: v.optional(v.string()),
    email: v.optional(v.string()),
    emailVerificationTime: v.optional(v.number()),
    image: v.optional(v.string()),
    phone: v.optional(v.string()),
    phoneVerificationTime: v.optional(v.number()),
    isAnonymous: v.optional(v.boolean()),
    role: v.optional(roleValidator),
    active: v.optional(v.boolean()),
    createdAt: v.optional(v.number()),
  }).index("email", ["email"]),

  categories: defineTable({
    name: v.string(),
    slug: v.string(),
    description: v.optional(v.string()),
    kind: v.union(v.literal("book"), v.literal("gift")),
    sortOrder: v.number(),
    active: v.boolean(),
  })
    .index("by_slug", ["slug"])
    .index("by_kind", ["kind", "sortOrder"]),

  products: defineTable({
    title: v.string(),
    slug: v.string(),
    kind: v.union(v.literal("book"), v.literal("gift")),
    sku: v.string(),
    description: v.string(),
    categoryId: v.id("categories"),

    // Book-specific
    author: v.optional(v.string()),
    publisher: v.optional(v.string()),
    isbn: v.optional(v.string()),
    format: v.optional(
      v.union(v.literal("paperback"), v.literal("hardcover"), v.literal("boxset")),
    ),
    pages: v.optional(v.number()),
    language: v.optional(v.string()),
    publishedYear: v.optional(v.number()),

    price: v.number(), // kobo
    compareAtPrice: v.optional(v.number()), // kobo, for strike-through
    costPrice: v.optional(v.number()), // kobo, margin reporting

    stock: v.number(),
    lowStockThreshold: v.number(),

    imageStorageIds: v.array(v.id("_storage")),
    imageUrls: v.array(v.string()), // external URLs, used when not uploading

    tags: v.array(v.string()),
    published: v.boolean(),
    featured: v.boolean(),
    archived: v.boolean(),

    unitsSold: v.number(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_slug", ["slug"])
    .index("by_sku", ["sku"])
    .index("by_category", ["categoryId"])
    .index("by_published", ["published", "archived"])
    .index("by_featured", ["featured", "published"])
    .searchIndex("search_title", {
      searchField: "title",
      filterFields: ["published", "archived", "kind", "categoryId"],
    })
    .searchIndex("search_author", {
      searchField: "author",
      filterFields: ["published", "archived"],
    }),

  customers: defineTable({
    name: v.string(),
    phone: v.string(), // normalised to 0XXXXXXXXXX
    email: v.optional(v.string()),
    addresses: v.array(addressValidator),
    totalOrders: v.number(),
    totalSpent: v.number(), // kobo, verified revenue only
    lastOrderAt: v.optional(v.number()),
    notes: v.optional(v.string()),
    createdAt: v.number(),
  })
    .index("by_phone", ["phone"])
    .index("by_email", ["email"])
    .searchIndex("search_name", { searchField: "name" }),

  orders: defineTable({
    orderNumber: v.string(), // AV-7K2M — human readable, used as transfer narration
    channel: v.union(v.literal("online"), v.literal("walk_in")),

    customerId: v.optional(v.id("customers")),
    customerName: v.string(),
    customerPhone: v.string(),
    customerEmail: v.optional(v.string()),

    items: v.array(orderItemValidator),

    subtotal: v.number(),
    deliveryFee: v.number(),
    discount: v.number(),
    total: v.number(),
    amountPaid: v.number(), // sum of verified payments

    fulfilment: v.union(v.literal("delivery"), v.literal("pickup")),
    address: v.optional(addressValidator),

    status: orderStatusValidator,
    paymentStatus: paymentStatusValidator,
    paymentMethod: paymentMethodValidator,

    timeline: v.array(timelineEntryValidator),
    staffNote: v.optional(v.string()),
    customerNote: v.optional(v.string()),

    createdByStaffId: v.optional(v.id("users")),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_orderNumber", ["orderNumber"])
    .index("by_status", ["status"])
    .index("by_paymentStatus", ["paymentStatus"])
    .index("by_customer", ["customerId"])
    .index("by_channel", ["channel"])
    .index("by_createdAt", ["createdAt"])
    .searchIndex("search_order", {
      searchField: "customerName",
      filterFields: ["status", "channel"],
    }),

  payments: defineTable({
    orderId: v.id("orders"),
    orderNumber: v.string(),
    amount: v.number(), // kobo, what the customer says they sent
    method: paymentMethodValidator,
    status: paymentStatusValidator,

    // Bank transfer evidence
    senderName: v.optional(v.string()),
    bankName: v.optional(v.string()),
    reference: v.optional(v.string()),
    paidAt: v.optional(v.number()),
    proofStorageId: v.optional(v.id("_storage")),

    verifiedByStaffId: v.optional(v.id("users")),
    verifiedByName: v.optional(v.string()),
    verifiedAt: v.optional(v.number()),
    rejectionReason: v.optional(v.string()),

    recordedByStaffId: v.optional(v.id("users")), // walk-in payments
    createdAt: v.number(),
  })
    .index("by_order", ["orderId"])
    .index("by_status", ["status", "createdAt"]),

  stockMovements: defineTable({
    productId: v.id("products"),
    productTitle: v.string(),
    delta: v.number(), // negative = out
    balanceAfter: v.number(),
    reason: v.union(
      v.literal("sale"),
      v.literal("restock"),
      v.literal("correction"),
      v.literal("return"),
      v.literal("damage"),
    ),
    orderId: v.optional(v.id("orders")),
    note: v.optional(v.string()),
    byStaffId: v.optional(v.id("users")),
    byName: v.optional(v.string()),
    at: v.number(),
  })
    .index("by_product", ["productId", "at"])
    .index("by_at", ["at"]),

  settings: defineTable({
    key: v.literal("store"), // singleton
    storeName: v.string(),
    tagline: v.string(),
    phone: v.string(),
    whatsapp: v.string(),
    email: v.string(),
    address: v.string(),
    pickupInstructions: v.string(),
    bankAccounts: v.array(
      v.object({
        bankName: v.string(),
        accountName: v.string(),
        accountNumber: v.string(),
        active: v.boolean(),
      }),
    ),
    deliveryFees: v.array(v.object({ state: v.string(), fee: v.number() })),
    defaultDeliveryFee: v.number(),
    freeDeliveryThreshold: v.optional(v.number()), // kobo; null = never free
    paymentWindowHours: v.number(),
  }).index("by_key", ["key"]),

  // Atomic sequence source for order numbers.
  counters: defineTable({
    key: v.string(),
    value: v.number(),
  }).index("by_key", ["key"]),
});
