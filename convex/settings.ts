import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { requireCapability } from "./lib/auth";

const DEFAULTS = {
  key: "store" as const,
  storeName: "Aperio Vici Bookshops & Gifts",
  tagline: "Books and gifts, delivered anywhere in Nigeria.",
  phone: "0800 000 0000",
  whatsapp: "2348000000000",
  email: "orders@aperiovici.ng",
  address: "Set your shop address in Settings",
  pickupInstructions:
    "Come with your order number. Orders are held for seven days after payment.",
  bankAccounts: [],
  deliveryFees: [],
  defaultDeliveryFee: 250000,
  freeDeliveryThreshold: undefined,
  paymentWindowHours: 48,
};

/** Public — the storefront needs the bank details and delivery fees. */
export const get = query({
  args: {},
  handler: async (ctx) => {
    const settings = await ctx.db
      .query("settings")
      .withIndex("by_key", (q) => q.eq("key", "store"))
      .unique();
    return settings ?? { ...DEFAULTS, _id: null, _creationTime: 0 };
  },
});

export const update = mutation({
  args: {
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
    freeDeliveryThreshold: v.optional(v.number()),
    paymentWindowHours: v.number(),
  },
  handler: async (ctx, args) => {
    await requireCapability(ctx, "manageSettings");

    for (const account of args.bankAccounts) {
      if (!/^\d{10}$/.test(account.accountNumber)) {
        throw new Error(
          `${account.bankName || "That account"} needs a 10-digit account number.`,
        );
      }
    }

    const existing = await ctx.db
      .query("settings")
      .withIndex("by_key", (q) => q.eq("key", "store"))
      .unique();

    if (existing) {
      await ctx.db.patch(existing._id, args);
      return existing._id;
    }
    return await ctx.db.insert("settings", { key: "store", ...args });
  },
});
