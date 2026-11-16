import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { currentUser } from "./lib/auth";

/**
 * E-book reading and progress tracking.
 * Powers the in-app Kindle-like reader and the user's library.
 */

/** Get the signed download/read URL for a purchased e-book's file. */
export const getReadUrl = query({
  args: { productId: v.id("products") },
  handler: async (ctx, args) => {
    const product = await ctx.db.get(args.productId);
    if (!product || !product.fileStorageId) return null;
    if (product.kind !== "ebook" || !product.published || product.archived) return null;

    const url = await ctx.storage.getUrl(product.fileStorageId);
    return {
      url,
      format: product.fileFormat ?? "pdf",
      title: product.title,
      author: product.author,
      totalPages: product.pages ?? 0,
      previewPages: product.previewPages ?? 10,
    };
  },
});

/** Save reading progress for the signed-in user. */
export const saveProgress = mutation({
  args: {
    productId: v.id("products"),
    currentPage: v.number(),
    totalPages: v.number(),
    percentage: v.number(),
  },
  handler: async (ctx, args) => {
    const user = await currentUser(ctx);
    if (!user) throw new Error("Sign in to save your reading progress.");

    const existing = await ctx.db
      .query("readingProgress")
      .withIndex("by_user_and_product", (q) =>
        q.eq("userId", user._id).eq("productId", args.productId),
      )
      .unique();

    if (existing) {
      await ctx.db.patch(existing._id, {
        currentPage: args.currentPage,
        totalPages: args.totalPages,
        percentage: args.percentage,
        lastReadAt: Date.now(),
      });
    } else {
      await ctx.db.insert("readingProgress", {
        userId: user._id,
        productId: args.productId,
        currentPage: args.currentPage,
        totalPages: args.totalPages,
        percentage: args.percentage,
        bookmarks: [],
        lastReadAt: Date.now(),
      });
    }
  },
});

/** Get reading progress for a specific book. */
export const getProgress = query({
  args: { productId: v.id("products") },
  handler: async (ctx, args) => {
    const user = await currentUser(ctx);
    if (!user) return null;

    return await ctx.db
      .query("readingProgress")
      .withIndex("by_user_and_product", (q) =>
        q.eq("userId", user._id).eq("productId", args.productId),
      )
      .unique();
  },
});

/** Toggle a bookmark on the current page. */
export const toggleBookmark = mutation({
  args: {
    productId: v.id("products"),
    page: v.number(),
    note: v.optional(v.string()),
    totalPages: v.number(),
  },
  handler: async (ctx, args) => {
    const user = await currentUser(ctx);
    if (!user) throw new Error("Sign in to bookmark pages.");

    const existing = await ctx.db
      .query("readingProgress")
      .withIndex("by_user_and_product", (q) =>
        q.eq("userId", user._id).eq("productId", args.productId),
      )
      .unique();

    if (existing) {
      const bookmarks = [...existing.bookmarks];
      const idx = bookmarks.findIndex((b) => b.page === args.page);
      if (idx >= 0) {
        bookmarks.splice(idx, 1); // remove bookmark
      } else {
        bookmarks.push({ page: args.page, note: args.note, createdAt: Date.now() });
      }
      await ctx.db.patch(existing._id, { bookmarks, lastReadAt: Date.now() });
      return idx < 0; // true = added, false = removed
    } else {
      await ctx.db.insert("readingProgress", {
        userId: user._id,
        productId: args.productId,
        currentPage: args.page,
        totalPages: args.totalPages,
        percentage: Math.round((args.page / args.totalPages) * 100),
        bookmarks: [{ page: args.page, note: args.note, createdAt: Date.now() }],
        lastReadAt: Date.now(),
      });
      return true;
    }
  },
});

/** Get the user's reading library — all books with saved progress. */
export const library = query({
  args: {},
  handler: async (ctx) => {
    const user = await currentUser(ctx);
    if (!user) return [];

    const progressList = await ctx.db
      .query("readingProgress")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .take(50);

    const items = await Promise.all(
      progressList.map(async (progress) => {
        const product = await ctx.db.get(progress.productId);
        if (!product || product.archived) return null;

        const uploaded = await Promise.all(
          product.imageStorageIds.map((id) => ctx.storage.getUrl(id)),
        );
        const images = [
          ...uploaded.filter((u): u is string => !!u),
          ...product.imageUrls,
        ];

        return {
          ...progress,
          product: {
            _id: product._id,
            title: product.title,
            slug: product.slug,
            author: product.author,
            kind: product.kind,
            coverImage: images[0] ?? null,
          },
        };
      }),
    );

    return items
      .filter((item): item is NonNullable<typeof item> => item !== null)
      .sort((a, b) => b.lastReadAt - a.lastReadAt);
  },
});
