import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { Doc } from "./_generated/dataModel";
import { requireCapability } from "./lib/auth";
import { normalisePhone } from "./lib/format";

export const list = query({
  args: { search: v.optional(v.string()), limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    await requireCapability(ctx, "viewCustomers");
    const search = args.search?.trim();
    let customers: Doc<"customers">[];

    if (search && search.length > 1) {
      const digits = search.replace(/\D/g, "");
      const byName = await ctx.db
        .query("customers")
        .withSearchIndex("search_name", (q) => q.search("name", search))
        .take(40);

      const byPhone = digits.length >= 3
        ? (await ctx.db.query("customers").take(500)).filter((c) =>
            c.phone.includes(digits),
          )
        : [];

      const seen = new Set<string>();
      customers = [];
      for (const c of [...byName, ...byPhone]) {
        if (seen.has(c._id)) continue;
        seen.add(c._id);
        customers.push(c);
      }
    } else {
      customers = await ctx.db.query("customers").order("desc").take(args.limit ?? 100);
    }

    return customers.sort((a, b) => (b.lastOrderAt ?? 0) - (a.lastOrderAt ?? 0));
  },
});

export const get = query({
  args: { id: v.id("customers") },
  handler: async (ctx, args) => {
    await requireCapability(ctx, "viewCustomers");
    const customer = await ctx.db.get(args.id);
    if (!customer) return null;
    const orders = await ctx.db
      .query("orders")
      .withIndex("by_customer", (q) => q.eq("customerId", args.id))
      .order("desc")
      .take(50);
    return { customer, orders };
  },
});

export const findByPhone = query({
  args: { phone: v.string() },
  handler: async (ctx, args) => {
    await requireCapability(ctx, "useRegister");
    const phone = normalisePhone(args.phone);
    if (phone.length < 11) return null;
    return await ctx.db
      .query("customers")
      .withIndex("by_phone", (q) => q.eq("phone", phone))
      .unique();
  },
});

export const setNotes = mutation({
  args: { id: v.id("customers"), notes: v.string() },
  handler: async (ctx, args) => {
    await requireCapability(ctx, "viewCustomers");
    await ctx.db.patch(args.id, { notes: args.notes });
  },
});
