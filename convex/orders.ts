import { v } from "convex/values";
import { query, mutation, QueryCtx, MutationCtx } from "./_generated/server";
import { Doc, Id } from "./_generated/dataModel";
import { requireCapability } from "./lib/auth";
import { normalisePhone, isValidPhone } from "./lib/format";
import { nextOrderNumber } from "./lib/ids";
import { orderStatusValidator } from "./schema";

const addressInput = v.object({
  street: v.string(),
  city: v.string(),
  state: v.string(),
  landmark: v.optional(v.string()),
  instructions: v.optional(v.string()),
});

const cartInput = v.array(
  v.object({ productId: v.id("products"), quantity: v.number() }),
);

/**
 * Prices, titles and stock are always read from the database at order time.
 * Whatever the browser sent is treated as a request for quantities only — that
 * is the one rule that stops a tampered cart from setting its own prices.
 */
async function buildLines(
  ctx: MutationCtx,
  cart: { productId: Id<"products">; quantity: number }[],
) {
  if (cart.length === 0) throw new Error("Your basket is empty.");

  const items = [];
  let subtotal = 0;

  for (const line of cart) {
    if (!Number.isInteger(line.quantity) || line.quantity < 1 || line.quantity > 99) {
      throw new Error("Quantities must be between 1 and 99.");
    }
    const product = await ctx.db.get(line.productId);
    if (!product || product.archived) {
      throw new Error("One of the items is no longer available. Remove it and try again.");
    }
    if (product.stock < line.quantity) {
      throw new Error(
        product.stock === 0
          ? `${product.title} just went out of stock.`
          : `Only ${product.stock} left of ${product.title}.`,
      );
    }

    const uploaded = product.imageStorageIds[0]
      ? await ctx.storage.getUrl(product.imageStorageIds[0])
      : null;
    const lineTotal = product.price * line.quantity;
    subtotal += lineTotal;

    items.push({
      productId: product._id,
      title: product.title,
      author: product.author,
      sku: product.sku,
      imageUrl: uploaded ?? product.imageUrls[0] ?? undefined,
      unitPrice: product.price,
      quantity: line.quantity,
      lineTotal,
    });
  }

  return { items, subtotal };
}

/**
 * Stock is committed the moment an order is placed, not when payment clears.
 * A customer who has an order number should never be told later that the book
 * was sold to someone else while they were at the bank. Cancelling returns it.
 */
async function commitStock(
  ctx: MutationCtx,
  items: { productId: Id<"products">; title: string; quantity: number }[],
  orderId: Id<"orders">,
  staffId?: Id<"users">,
  staffName?: string,
) {
  for (const item of items) {
    const product = await ctx.db.get(item.productId);
    if (!product) continue;
    const balanceAfter = product.stock - item.quantity;
    await ctx.db.patch(item.productId, {
      stock: balanceAfter,
      unitsSold: product.unitsSold + item.quantity,
      updatedAt: Date.now(),
    });
    await ctx.db.insert("stockMovements", {
      productId: item.productId,
      productTitle: item.title,
      delta: -item.quantity,
      balanceAfter,
      reason: "sale",
      orderId,
      byStaffId: staffId,
      byName: staffName,
      at: Date.now(),
    });
  }
}

async function releaseStock(ctx: MutationCtx, order: Doc<"orders">, note: string) {
  for (const item of order.items) {
    const product = await ctx.db.get(item.productId);
    if (!product) continue;
    const balanceAfter = product.stock + item.quantity;
    await ctx.db.patch(item.productId, {
      stock: balanceAfter,
      unitsSold: Math.max(0, product.unitsSold - item.quantity),
      updatedAt: Date.now(),
    });
    await ctx.db.insert("stockMovements", {
      productId: item.productId,
      productTitle: item.title,
      delta: item.quantity,
      balanceAfter,
      reason: "return",
      orderId: order._id,
      note,
      at: Date.now(),
    });
  }
}

async function upsertCustomer(
  ctx: MutationCtx,
  input: { name: string; phone: string; email?: string; address?: Doc<"orders">["address"] },
) {
  const phone = normalisePhone(input.phone);
  const existing = await ctx.db
    .query("customers")
    .withIndex("by_phone", (q) => q.eq("phone", phone))
    .unique();

  if (existing) {
    const addresses = [...existing.addresses];
    if (
      input.address &&
      !addresses.some(
        (a) => a.street === input.address!.street && a.city === input.address!.city,
      )
    ) {
      addresses.push(input.address);
    }
    await ctx.db.patch(existing._id, {
      name: input.name || existing.name,
      email: input.email ?? existing.email,
      addresses,
      lastOrderAt: Date.now(),
    });
    return existing._id;
  }

  return await ctx.db.insert("customers", {
    name: input.name,
    phone,
    email: input.email,
    addresses: input.address ? [input.address] : [],
    totalOrders: 0,
    totalSpent: 0,
    lastOrderAt: Date.now(),
    createdAt: Date.now(),
  });
}

async function deliveryFeeFor(ctx: QueryCtx, state: string, subtotal: number) {
  const settings = await ctx.db
    .query("settings")
    .withIndex("by_key", (q) => q.eq("key", "store"))
    .unique();
  if (!settings) return 0;

  if (settings.freeDeliveryThreshold && subtotal >= settings.freeDeliveryThreshold) return 0;
  const match = settings.deliveryFees.find(
    (f) => f.state.toLowerCase() === state.toLowerCase(),
  );
  return match ? match.fee : settings.defaultDeliveryFee;
}

/** Quote shown live on the checkout page before anything is written. */
export const quote = query({
  args: {
    cart: cartInput,
    fulfilment: v.union(v.literal("delivery"), v.literal("pickup")),
    state: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    let subtotal = 0;
    const unavailable: string[] = [];

    for (const line of args.cart) {
      const product = await ctx.db.get(line.productId);
      if (!product || product.archived || !product.published) continue;
      if (product.stock < line.quantity) unavailable.push(product.title);
      subtotal += product.price * line.quantity;
    }

    const deliveryFee =
      args.fulfilment === "delivery" && args.state
        ? await deliveryFeeFor(ctx, args.state, subtotal)
        : 0;

    return { subtotal, deliveryFee, total: subtotal + deliveryFee, unavailable };
  },
});

// ---------------------------------------------------------------------------
// Placing orders
// ---------------------------------------------------------------------------

export const placeOnlineOrder = mutation({
  args: {
    cart: cartInput,
    customerName: v.string(),
    customerPhone: v.string(),
    customerEmail: v.optional(v.string()),
    fulfilment: v.union(v.literal("delivery"), v.literal("pickup")),
    address: v.optional(addressInput),
    customerNote: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const name = args.customerName.trim();
    if (name.length < 2) throw new Error("Enter the name the order should be under.");
    if (!isValidPhone(args.customerPhone)) {
      throw new Error("Enter a valid Nigerian phone number, for example 0803 123 4567.");
    }
    if (args.fulfilment === "delivery" && !args.address) {
      throw new Error("Add a delivery address, or switch to shop pickup.");
    }

    const { items, subtotal } = await buildLines(ctx, args.cart);
    const deliveryFee =
      args.fulfilment === "delivery"
        ? await deliveryFeeFor(ctx, args.address!.state, subtotal)
        : 0;
    const total = subtotal + deliveryFee;

    const customerId = await upsertCustomer(ctx, {
      name,
      phone: args.customerPhone,
      email: args.customerEmail,
      address: args.address,
    });

    const orderNumber = await nextOrderNumber(ctx);
    const now = Date.now();

    const orderId = await ctx.db.insert("orders", {
      orderNumber,
      channel: "online",
      customerId,
      customerName: name,
      customerPhone: normalisePhone(args.customerPhone),
      customerEmail: args.customerEmail?.trim() || undefined,
      items,
      subtotal,
      deliveryFee,
      discount: 0,
      total,
      amountPaid: 0,
      fulfilment: args.fulfilment,
      address: args.address,
      status: "awaiting_payment",
      paymentStatus: "pending",
      paymentMethod: "bank_transfer",
      timeline: [
        { status: "awaiting_payment", note: "Order placed online", at: now },
      ],
      customerNote: args.customerNote?.trim() || undefined,
      createdAt: now,
      updatedAt: now,
    });

    await commitStock(ctx, items, orderId);

    const customer = await ctx.db.get(customerId);
    if (customer) {
      await ctx.db.patch(customerId, { totalOrders: customer.totalOrders + 1 });
    }

    return { orderId, orderNumber, total };
  },
});

export const recordWalkInSale = mutation({
  args: {
    cart: cartInput,
    customerName: v.optional(v.string()),
    customerPhone: v.optional(v.string()),
    paymentMethod: v.union(
      v.literal("cash"),
      v.literal("pos_terminal"),
      v.literal("bank_transfer"),
    ),
    amountTendered: v.optional(v.number()),
    discount: v.optional(v.number()),
    reference: v.optional(v.string()),
    note: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const staff = await requireCapability(ctx, "useRegister");
    const { items, subtotal } = await buildLines(ctx, args.cart);

    const discount = Math.max(0, Math.min(args.discount ?? 0, subtotal));
    const total = subtotal - discount;

    const name = args.customerName?.trim() || "Walk-in customer";
    let customerId: Id<"customers"> | undefined;
    if (args.customerPhone && isValidPhone(args.customerPhone)) {
      customerId = await upsertCustomer(ctx, { name, phone: args.customerPhone });
    }

    const orderNumber = await nextOrderNumber(ctx);
    const now = Date.now();

    // Counter sales are paid before the customer leaves, so they are booked
    // straight to completed rather than entering the verification queue.
    const orderId = await ctx.db.insert("orders", {
      orderNumber,
      channel: "walk_in",
      customerId,
      customerName: name,
      customerPhone: args.customerPhone ? normalisePhone(args.customerPhone) : "",
      items,
      subtotal,
      deliveryFee: 0,
      discount,
      total,
      amountPaid: total,
      fulfilment: "pickup",
      status: "completed",
      paymentStatus: "verified",
      paymentMethod: args.paymentMethod,
      timeline: [
        {
          status: "completed",
          note: `Counter sale, paid by ${args.paymentMethod.replace("_", " ")}`,
          at: now,
          byName: staff.name ?? staff.email,
        },
      ],
      staffNote: args.note?.trim() || undefined,
      createdByStaffId: staff._id,
      createdAt: now,
      updatedAt: now,
    });

    await commitStock(ctx, items, orderId, staff._id, staff.name ?? staff.email);

    await ctx.db.insert("payments", {
      orderId,
      orderNumber,
      amount: total,
      method: args.paymentMethod,
      status: "verified",
      reference: args.reference?.trim() || undefined,
      paidAt: now,
      verifiedByStaffId: staff._id,
      verifiedByName: staff.name ?? staff.email,
      verifiedAt: now,
      recordedByStaffId: staff._id,
      createdAt: now,
    });

    if (customerId) {
      const customer = await ctx.db.get(customerId);
      if (customer) {
        await ctx.db.patch(customerId, {
          totalOrders: customer.totalOrders + 1,
          totalSpent: customer.totalSpent + total,
        });
      }
    }

    const change =
      args.paymentMethod === "cash" && args.amountTendered
        ? Math.max(0, args.amountTendered - total)
        : 0;

    return { orderId, orderNumber, total, change };
  },
});

// ---------------------------------------------------------------------------
// Customer-facing lookup
// ---------------------------------------------------------------------------

/**
 * Public, but the order number alone is not enough — the last four digits of
 * the phone number on the order must match, so a guessed number reveals nothing.
 */
export const track = query({
  args: { orderNumber: v.string(), phoneLast4: v.string() },
  handler: async (ctx, args) => {
    const order = await ctx.db
      .query("orders")
      .withIndex("by_orderNumber", (q) =>
        q.eq("orderNumber", args.orderNumber.trim().toUpperCase()),
      )
      .unique();

    if (!order) return { found: false as const };
    if (!order.customerPhone.endsWith(args.phoneLast4.replace(/\D/g, "").slice(-4))) {
      return { found: false as const };
    }

    const payments = await ctx.db
      .query("payments")
      .withIndex("by_order", (q) => q.eq("orderId", order._id))
      .collect();

    return {
      found: true as const,
      order,
      payments: payments.map((p) => ({
        amount: p.amount,
        status: p.status,
        method: p.method,
        createdAt: p.createdAt,
        rejectionReason: p.rejectionReason,
      })),
    };
  },
});

/** The confirmation page right after checkout, reachable by order number alone. */
export const getByNumber = query({
  args: { orderNumber: v.string() },
  handler: async (ctx, args) => {
    const order = await ctx.db
      .query("orders")
      .withIndex("by_orderNumber", (q) =>
        q.eq("orderNumber", args.orderNumber.trim().toUpperCase()),
      )
      .unique();
    if (!order) return null;

    const settings = await ctx.db
      .query("settings")
      .withIndex("by_key", (q) => q.eq("key", "store"))
      .unique();

    const payments = await ctx.db
      .query("payments")
      .withIndex("by_order", (q) => q.eq("orderId", order._id))
      .collect();

    return {
      order: { ...order, customerPhone: maskPhone(order.customerPhone) },
      bankAccounts: settings?.bankAccounts.filter((a) => a.active) ?? [],
      pickupInstructions: settings?.pickupInstructions ?? "",
      paymentWindowHours: settings?.paymentWindowHours ?? 48,
      whatsapp: settings?.whatsapp ?? "",
      hasSubmittedPayment: payments.some(
        (p) => p.status === "submitted" || p.status === "verified",
      ),
      paymentStatus: payments[payments.length - 1]?.status ?? null,
      rejectionReason: payments[payments.length - 1]?.rejectionReason,
    };
  },
});

function maskPhone(phone: string) {
  if (phone.length < 7) return phone;
  return phone.slice(0, 4) + "•••" + phone.slice(-4);
}

// ---------------------------------------------------------------------------
// Admin pipeline
// ---------------------------------------------------------------------------

export const adminList = query({
  args: {
    status: v.optional(orderStatusValidator),
    channel: v.optional(v.union(v.literal("online"), v.literal("walk_in"))),
    search: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    await requireCapability(ctx, "manageOrders");
    const limit = args.limit ?? 100;
    const search = args.search?.trim();

    let orders: Doc<"orders">[];

    if (search && search.length > 1) {
      const upper = search.toUpperCase();
      const byNumber = await ctx.db
        .query("orders")
        .withIndex("by_orderNumber", (q) => q.eq("orderNumber", upper))
        .collect();

      const byName = await ctx.db
        .query("orders")
        .withSearchIndex("search_order", (q) => q.search("customerName", search))
        .take(50);

      const digits = search.replace(/\D/g, "");
      const byPhone =
        digits.length >= 4
          ? (await ctx.db.query("orders").order("desc").take(400)).filter((o) =>
              o.customerPhone.includes(digits),
            )
          : [];

      const seen = new Set<string>();
      orders = [];
      for (const o of [...byNumber, ...byName, ...byPhone]) {
        if (seen.has(o._id)) continue;
        seen.add(o._id);
        orders.push(o);
      }
    } else if (args.status) {
      orders = await ctx.db
        .query("orders")
        .withIndex("by_status", (q) => q.eq("status", args.status!))
        .order("desc")
        .take(limit);
    } else {
      orders = await ctx.db.query("orders").withIndex("by_createdAt").order("desc").take(limit);
    }

    if (args.status && search) orders = orders.filter((o) => o.status === args.status);
    if (args.channel) orders = orders.filter((o) => o.channel === args.channel);

    orders.sort((a, b) => b.createdAt - a.createdAt);
    return orders.slice(0, limit);
  },
});

export const adminGet = query({
  args: { id: v.id("orders") },
  handler: async (ctx, args) => {
    await requireCapability(ctx, "manageOrders");
    const order = await ctx.db.get(args.id);
    if (!order) return null;

    const payments = await ctx.db
      .query("payments")
      .withIndex("by_order", (q) => q.eq("orderId", args.id))
      .collect();

    const withProof = await Promise.all(
      payments.map(async (p) => ({
        ...p,
        proofUrl: p.proofStorageId ? await ctx.storage.getUrl(p.proofStorageId) : null,
      })),
    );

    const customer = order.customerId ? await ctx.db.get(order.customerId) : null;
    return { order, payments: withProof, customer };
  },
});

/** Counts for the sidebar badges, so staff see work waiting without clicking in. */
export const pipelineCounts = query({
  args: {},
  handler: async (ctx) => {
    await requireCapability(ctx, "manageOrders");
    const recent = await ctx.db.query("orders").withIndex("by_createdAt").order("desc").take(500);
    const count = (s: Doc<"orders">["status"]) =>
      recent.filter((o) => o.status === s).length;
    return {
      awaitingPayment: count("awaiting_payment"),
      paymentReview: count("payment_review"),
      paid: count("paid"),
      processing: count("processing"),
      ready: count("ready"),
      dispatched: count("dispatched"),
    };
  },
});

const NEXT_STATUS: Record<string, Doc<"orders">["status"][]> = {
  awaiting_payment: ["payment_review", "cancelled"],
  payment_review: ["paid", "awaiting_payment", "cancelled"],
  paid: ["processing", "cancelled"],
  processing: ["ready", "cancelled"],
  ready: ["dispatched", "completed", "cancelled"],
  dispatched: ["completed", "cancelled"],
  completed: [],
  cancelled: [],
};

export const advanceStatus = mutation({
  args: {
    id: v.id("orders"),
    status: orderStatusValidator,
    note: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const staff = await requireCapability(ctx, "manageOrders");
    const order = await ctx.db.get(args.id);
    if (!order) throw new Error("That order no longer exists.");

    if (!NEXT_STATUS[order.status].includes(args.status)) {
      throw new Error(
        `An order that is ${order.status.replace("_", " ")} cannot move to ${args.status.replace("_", " ")}.`,
      );
    }
    if (args.status === "processing" && order.paymentStatus !== "verified") {
      throw new Error("Verify the payment before this order is processed.");
    }

    if (args.status === "cancelled") {
      await releaseStock(ctx, order, `Order ${order.orderNumber} cancelled`);
    }

    await ctx.db.patch(args.id, {
      status: args.status,
      updatedAt: Date.now(),
      timeline: [
        ...order.timeline,
        {
          status: args.status,
          note: args.note,
          at: Date.now(),
          byName: staff.name ?? staff.email,
        },
      ],
    });
  },
});

export const addStaffNote = mutation({
  args: { id: v.id("orders"), note: v.string() },
  handler: async (ctx, args) => {
    const staff = await requireCapability(ctx, "manageOrders");
    const order = await ctx.db.get(args.id);
    if (!order) throw new Error("That order no longer exists.");
    await ctx.db.patch(args.id, {
      staffNote: args.note,
      updatedAt: Date.now(),
      timeline: [
        ...order.timeline,
        {
          status: order.status,
          note: `Note: ${args.note}`,
          at: Date.now(),
          byName: staff.name ?? staff.email,
        },
      ],
    });
  },
});
