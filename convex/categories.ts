import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { productKindValidator } from "./schema";
import { requireCapability } from "./lib/auth";
import { slugify } from "./lib/format";
export const list = query({
  args: { kind: v.optional(productKindValidator) },
  handler: async (ctx, args) => {
    const all = await ctx.db.query("categories").collect();
    const active = all.filter((c) => c.active && (!args.kind || c.kind === args.kind));
    return active.sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name));
  },
});

/** Category list with live counts, for the shop filter rail. */
export const listWithCounts = query({
  args: {},
  handler: async (ctx) => {
    const categories = await ctx.db.query("categories").collect();
    const products = await ctx.db
      .query("products")
      .withIndex("by_published", (q) => q.eq("published", true).eq("archived", false))
      .collect();

    return categories
      .filter((c) => c.active)
      .map((c) => ({
        ...c,
        count: products.filter((p) => p.categoryId === c._id).length,
      }))
      .sort((a, b) => a.sortOrder - b.sortOrder);
  },
});

export const create = mutation({
  args: {
    name: v.string(),
    kind: productKindValidator,
    description: v.optional(v.string()),
    sortOrder: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    await requireCapability(ctx, "manageInventory");
    const slug = slugify(args.name);
    const clash = await ctx.db
      .query("categories")
      .withIndex("by_slug", (q) => q.eq("slug", slug))
      .unique();
    if (clash) throw new Error(`There is already a category called ${args.name}.`);

    return await ctx.db.insert("categories", {
      name: args.name.trim(),
      slug,
      kind: args.kind,
      description: args.description,
      sortOrder: args.sortOrder ?? 100,
      active: true,
    });
  },
});

export const update = mutation({
  args: {
    id: v.id("categories"),
    name: v.string(),
    description: v.optional(v.string()),
    sortOrder: v.number(),
    active: v.boolean(),
  },
  handler: async (ctx, args) => {
    await requireCapability(ctx, "manageInventory");
    const { id, ...fields } = args;
    await ctx.db.patch(id, { ...fields, slug: slugify(fields.name) });
  },
});
