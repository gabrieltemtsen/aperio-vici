import { v } from "convex/values";
import { query, mutation, QueryCtx } from "./_generated/server";
import { Doc, Id } from "./_generated/dataModel";
import { productKindValidator } from "./schema";
import { requireCapability } from "./lib/auth";
import { slugify } from "./lib/format";
import { nextSku } from "./lib/ids";

const PAGE_SIZE = 24;

const kindValidator = productKindValidator;

/** Resolves uploaded image storage IDs to signed URLs, falling back to external URLs. */
async function withImages(ctx: QueryCtx, product: Doc<"products">) {
  const uploaded = await Promise.all(
    product.imageStorageIds.map((id) => ctx.storage.getUrl(id)),
  );
  const images = [...uploaded.filter((u): u is string => !!u), ...product.imageUrls];
  return { ...product, images, coverImage: images[0] ?? null };
}

export type ProductWithImages = Doc<"products"> & {
  images: string[];
  coverImage: string | null;
};

/**
 * The storefront listing. Handles search, category, kind, price band, in-stock
 * and sort in one call so the shop page is a single subscription.
 */
export const list = query({
  args: {
    search: v.optional(v.string()),
    categorySlug: v.optional(v.string()),
    kind: v.optional(kindValidator),
    inStockOnly: v.optional(v.boolean()),
    maxPrice: v.optional(v.number()),
    language: v.optional(v.string()),
    region: v.optional(v.string()),
    country: v.optional(v.string()),
    sort: v.optional(
      v.union(
        v.literal("relevance"),
        v.literal("newest"),
        v.literal("price_asc"),
        v.literal("price_desc"),
        v.literal("bestselling"),
        v.literal("title"),
      ),
    ),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = Math.min(args.limit ?? PAGE_SIZE, 100);
    const search = args.search?.trim();

    let category: Doc<"categories"> | null = null;
    if (args.categorySlug) {
      category = await ctx.db
        .query("categories")
        .withIndex("by_slug", (q) => q.eq("slug", args.categorySlug!))
        .unique();
    }

    let results: Doc<"products">[];

    if (search && search.length > 1) {
      // Title and author are separate search indexes; merge and de-duplicate so
      // "achebe" and "things fall apart" both work from one box.
      const [byTitle, byAuthor] = await Promise.all([
        ctx.db
          .query("products")
          .withSearchIndex("search_title", (q) =>
            q.search("title", search).eq("published", true).eq("archived", false),
          )
          .take(80),
        ctx.db
          .query("products")
          .withSearchIndex("search_author", (q) =>
            q.search("author", search).eq("published", true).eq("archived", false),
          )
          .take(40),
      ]);

      const seen = new Set<string>();
      results = [];
      for (const p of [...byTitle, ...byAuthor]) {
        if (seen.has(p._id)) continue;
        seen.add(p._id);
        results.push(p);
      }
    } else {
      results = await ctx.db
        .query("products")
        .withIndex("by_published", (q) => q.eq("published", true).eq("archived", false))
        .order("desc")
        .take(400);
    }

    if (category) results = results.filter((p) => p.categoryId === category!._id);
    if (args.kind) results = results.filter((p) => p.kind === args.kind);
    if (args.inStockOnly) results = results.filter((p) => p.stock > 0);
    if (args.maxPrice !== undefined) results = results.filter((p) => p.price <= args.maxPrice!);
    if (args.language) results = results.filter((p) => p.language?.toLowerCase() === args.language!.toLowerCase());
    if (args.region) results = results.filter((p) => p.region?.toLowerCase() === args.region!.toLowerCase());
    if (args.country) results = results.filter((p) => p.country?.toLowerCase() === args.country!.toLowerCase());

    const sort = args.sort ?? (search ? "relevance" : "newest");
    if (sort === "price_asc") results.sort((a, b) => a.price - b.price);
    else if (sort === "price_desc") results.sort((a, b) => b.price - a.price);
    else if (sort === "bestselling") results.sort((a, b) => b.unitsSold - a.unitsSold);
    else if (sort === "title") results.sort((a, b) => a.title.localeCompare(b.title));
    else if (sort === "newest") results.sort((a, b) => b.createdAt - a.createdAt);

    const total = results.length;
    const page = results.slice(0, limit);
    return {
      products: await Promise.all(page.map((p) => withImages(ctx, p))),
      total,
      hasMore: total > limit,
    };
  },
});

export const getBySlug = query({
  args: { slug: v.string() },
  handler: async (ctx, args) => {
    const product = await ctx.db
      .query("products")
      .withIndex("by_slug", (q) => q.eq("slug", args.slug))
      .unique();
    if (!product || product.archived) return null;

    const category = await ctx.db.get(product.categoryId);
    const related = await ctx.db
      .query("products")
      .withIndex("by_category", (q) => q.eq("categoryId", product.categoryId))
      .take(12);

    return {
      product: await withImages(ctx, product),
      category,
      related: await Promise.all(
        related
          .filter((p) => p._id !== product._id && p.published && !p.archived)
          .slice(0, 4)
          .map((p) => withImages(ctx, p)),
      ),
    };
  },
});

export const featured = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const products = await ctx.db
      .query("products")
      .withIndex("by_featured", (q) => q.eq("featured", true).eq("published", true))
      .take(args.limit ?? 8);
    return Promise.all(
      products.filter((p) => !p.archived).map((p) => withImages(ctx, p)),
    );
  },
});

/** Powers the shelf in the hero — needs cover art and nothing else. */
export const shelf = query({
  args: {},
  handler: async (ctx) => {
    const products = await ctx.db
      .query("products")
      .withIndex("by_published", (q) => q.eq("published", true).eq("archived", false))
      .order("desc")
      .take(14);
    return Promise.all(products.map((p) => withImages(ctx, p)));
  },
});

/** Type-ahead for both the storefront search box and the register. */
export const quickSearch = query({
  args: { term: v.string(), includeUnpublished: v.optional(v.boolean()) },
  handler: async (ctx, args) => {
    const term = args.term.trim();
    if (term.length < 2) return [];

    const results = await ctx.db
      .query("products")
      .withSearchIndex("search_title", (q) => {
        const base = q.search("title", term).eq("archived", false);
        return args.includeUnpublished ? base : base.eq("published", true);
      })
      .take(8);

    return Promise.all(results.map((p) => withImages(ctx, p)));
  },
});

/** Register lookup by SKU or ISBN — barcode scanners type these straight in. */
export const findByCode = query({
  args: { code: v.string() },
  handler: async (ctx, args) => {
    const code = args.code.trim();
    const bySku = await ctx.db
      .query("products")
      .withIndex("by_sku", (q) => q.eq("sku", code.toUpperCase()))
      .unique();
    if (bySku) return withImages(ctx, bySku);

    const all = await ctx.db.query("products").take(500);
    const byIsbn = all.find((p) => p.isbn && p.isbn.replace(/\D/g, "") === code.replace(/\D/g, ""));
    return byIsbn ? withImages(ctx, byIsbn) : null;
  },
});

// ---------------------------------------------------------------------------
// Admin
// ---------------------------------------------------------------------------

export const adminList = query({
  args: {
    search: v.optional(v.string()),
    kind: v.optional(kindValidator),
    stockFilter: v.optional(
      v.union(v.literal("all"), v.literal("low"), v.literal("out"), v.literal("unpublished")),
    ),
  },
  handler: async (ctx, args) => {
    await requireCapability(ctx, "manageInventory");

    let products: Doc<"products">[];
    const search = args.search?.trim();

    if (search && search.length > 1) {
      products = await ctx.db
        .query("products")
        .withSearchIndex("search_title", (q) => q.search("title", search).eq("archived", false))
        .take(100);
    } else {
      products = await ctx.db.query("products").order("desc").take(500);
      products = products.filter((p) => !p.archived);
    }

    if (args.kind) products = products.filter((p) => p.kind === args.kind);
    if (args.stockFilter === "low") {
      products = products.filter((p) => p.stock > 0 && p.stock <= p.lowStockThreshold);
    } else if (args.stockFilter === "out") {
      products = products.filter((p) => p.stock <= 0);
    } else if (args.stockFilter === "unpublished") {
      products = products.filter((p) => !p.published);
    }

    const categories = await ctx.db.query("categories").collect();
    const categoryById = new Map(categories.map((c) => [c._id, c]));

    return Promise.all(
      products.map(async (p) => ({
        ...(await withImages(ctx, p)),
        categoryName: categoryById.get(p.categoryId)?.name ?? "Uncategorised",
      })),
    );
  },
});

export const adminGet = query({
  args: { id: v.id("products") },
  handler: async (ctx, args) => {
    await requireCapability(ctx, "manageInventory");
    const product = await ctx.db.get(args.id);
    if (!product) return null;
    const movements = await ctx.db
      .query("stockMovements")
      .withIndex("by_product", (q) => q.eq("productId", args.id))
      .order("desc")
      .take(20);
    return { product: await withImages(ctx, product), movements };
  },
});

const productInput = {
  title: v.string(),
  kind: kindValidator,
  description: v.string(),
  categoryId: v.id("categories"),
  author: v.optional(v.string()),
  publisher: v.optional(v.string()),
  isbn: v.optional(v.string()),
  format: v.optional(
    v.union(v.literal("paperback"), v.literal("hardcover"), v.literal("boxset")),
  ),
  pages: v.optional(v.number()),
  language: v.optional(v.string()),
  publishedYear: v.optional(v.number()),
  region: v.optional(v.string()),
  country: v.optional(v.string()),
  fileStorageId: v.optional(v.id("_storage")),
  fileFormat: v.optional(v.union(v.literal("pdf"), v.literal("epub"))),
  fileSizeBytes: v.optional(v.number()),
  previewPages: v.optional(v.number()),
  cardType: v.optional(v.string()),
  customizable: v.optional(v.boolean()),
  price: v.number(),
  compareAtPrice: v.optional(v.number()),
  costPrice: v.optional(v.number()),
  stock: v.number(),
  lowStockThreshold: v.number(),
  imageStorageIds: v.array(v.id("_storage")),
  imageUrls: v.array(v.string()),
  tags: v.array(v.string()),
  published: v.boolean(),
  featured: v.boolean(),
};

async function uniqueSlug(ctx: QueryCtx, title: string, excludeId?: Id<"products">) {
  const base = slugify(title) || "item";
  let candidate = base;
  for (let i = 2; i < 60; i++) {
    const clash = await ctx.db
      .query("products")
      .withIndex("by_slug", (q) => q.eq("slug", candidate))
      .unique();
    if (!clash || clash._id === excludeId) return candidate;
    candidate = `${base}-${i}`;
  }
  return `${base}-${Date.now()}`;
}

export const create = mutation({
  args: productInput,
  handler: async (ctx, args) => {
    const staff = await requireCapability(ctx, "manageInventory");
    if (args.price <= 0) throw new Error("Price must be greater than zero.");
    if (args.stock < 0) throw new Error("Stock cannot be negative.");

    const now = Date.now();
    const productId = await ctx.db.insert("products", {
      ...args,
      slug: await uniqueSlug(ctx, args.title),
      sku: await nextSku(ctx, args.kind),
      archived: false,
      unitsSold: 0,
      createdAt: now,
      updatedAt: now,
    });

    if (args.stock > 0) {
      await ctx.db.insert("stockMovements", {
        productId,
        productTitle: args.title,
        delta: args.stock,
        balanceAfter: args.stock,
        reason: "restock",
        note: "Opening stock",
        byStaffId: staff._id,
        byName: staff.name ?? staff.email,
        at: now,
      });
    }
    return productId;
  },
});

export const update = mutation({
  args: { id: v.id("products"), ...productInput },
  handler: async (ctx, args) => {
    const staff = await requireCapability(ctx, "manageInventory");
    const { id, ...fields } = args;

    const existing = await ctx.db.get(id);
    if (!existing) throw new Error("That product no longer exists.");

    const now = Date.now();
    await ctx.db.patch(id, {
      ...fields,
      slug:
        existing.title === fields.title
          ? existing.slug
          : await uniqueSlug(ctx, fields.title, id),
      updatedAt: now,
    });

    if (fields.stock !== existing.stock) {
      await ctx.db.insert("stockMovements", {
        productId: id,
        productTitle: fields.title,
        delta: fields.stock - existing.stock,
        balanceAfter: fields.stock,
        reason: "correction",
        note: "Edited from the product form",
        byStaffId: staff._id,
        byName: staff.name ?? staff.email,
        at: now,
      });
    }
  },
});

export const adjustStock = mutation({
  args: {
    id: v.id("products"),
    delta: v.number(),
    reason: v.union(
      v.literal("restock"),
      v.literal("correction"),
      v.literal("return"),
      v.literal("damage"),
    ),
    note: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const staff = await requireCapability(ctx, "manageInventory");
    const product = await ctx.db.get(args.id);
    if (!product) throw new Error("That product no longer exists.");

    const balanceAfter = product.stock + args.delta;
    if (balanceAfter < 0) {
      throw new Error(`Only ${product.stock} left — you cannot remove ${Math.abs(args.delta)}.`);
    }

    await ctx.db.patch(args.id, { stock: balanceAfter, updatedAt: Date.now() });
    await ctx.db.insert("stockMovements", {
      productId: args.id,
      productTitle: product.title,
      delta: args.delta,
      balanceAfter,
      reason: args.reason,
      note: args.note,
      byStaffId: staff._id,
      byName: staff.name ?? staff.email,
      at: Date.now(),
    });
  },
});

export const setPublished = mutation({
  args: { id: v.id("products"), published: v.boolean() },
  handler: async (ctx, args) => {
    await requireCapability(ctx, "manageInventory");
    await ctx.db.patch(args.id, { published: args.published, updatedAt: Date.now() });
  },
});

export const archive = mutation({
  args: { id: v.id("products") },
  handler: async (ctx, args) => {
    await requireCapability(ctx, "manageInventory");
    // Soft delete only — past orders reference this row and must keep resolving.
    await ctx.db.patch(args.id, {
      archived: true,
      published: false,
      featured: false,
      updatedAt: Date.now(),
    });
  },
});

export const generateUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    await requireCapability(ctx, "manageInventory");
    return await ctx.storage.generateUploadUrl();
  },
});
