import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { currentUser, requireCapability } from "./lib/auth";
import { slugify } from "./lib/format";
import { nextSku } from "./lib/ids";

/**
 * Author self-publishing pipeline.
 * Authors submit manuscripts, staff review and approve for the storefront.
 */

/** Generate an upload URL for the manuscript file or cover image. */
export const generateUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    return await ctx.storage.generateUploadUrl();
  },
});

/** Submit a new publishing request. */
export const submit = mutation({
  args: {
    authorName: v.string(),
    authorEmail: v.string(),
    authorBio: v.optional(v.string()),
    title: v.string(),
    description: v.string(),
    language: v.string(),
    region: v.optional(v.string()),
    country: v.optional(v.string()),
    genre: v.optional(v.string()),
    fileStorageId: v.id("_storage"),
    fileFormat: v.union(v.literal("pdf"), v.literal("epub")),
    coverImageStorageId: v.optional(v.id("_storage")),
    suggestedPrice: v.number(), // kobo
  },
  handler: async (ctx, args) => {
    if (!args.authorName.trim()) throw new Error("Author name is required.");
    if (!args.title.trim()) throw new Error("Title is required.");
    if (!args.description.trim()) throw new Error("Description is required.");
    if (args.suggestedPrice <= 0) throw new Error("Price must be greater than zero.");

    return await ctx.db.insert("publishingRequests", {
      ...args,
      status: "pending",
      submittedAt: Date.now(),
    });
  },
});

/** List publishing requests — for the author to track their submissions. */
export const mySubmissions = query({
  args: { email: v.string() },
  handler: async (ctx, args) => {
    if (!args.email.trim()) return [];
    return await ctx.db
      .query("publishingRequests")
      .withIndex("by_email", (q) => q.eq("authorEmail", args.email))
      .take(50);
  },
});

/** Admin: list all pending publishing requests. */
export const adminList = query({
  args: {
    status: v.optional(v.union(
      v.literal("pending"),
      v.literal("approved"),
      v.literal("rejected"),
    )),
  },
  handler: async (ctx, args) => {
    await requireCapability(ctx, "manageInventory");

    if (args.status) {
      return await ctx.db
        .query("publishingRequests")
        .withIndex("by_status", (q) => q.eq("status", args.status!))
        .take(100);
    }
    return await ctx.db
      .query("publishingRequests")
      .order("desc")
      .take(100);
  },
});

/** Admin: approve a publishing request and create the product listing. */
export const approve = mutation({
  args: {
    requestId: v.id("publishingRequests"),
    price: v.number(), // kobo, staff may adjust the suggested price
    categoryId: v.id("categories"),
  },
  handler: async (ctx, args) => {
    const staff = await requireCapability(ctx, "manageInventory");
    const request = await ctx.db.get(args.requestId);
    if (!request) throw new Error("Publishing request not found.");
    if (request.status !== "pending") throw new Error("This request has already been reviewed.");

    const now = Date.now();

    // Create the product listing
    let slug = slugify(request.title) || "ebook";
    for (let i = 2; i < 60; i++) {
      const clash = await ctx.db
        .query("products")
        .withIndex("by_slug", (q) => q.eq("slug", slug))
        .unique();
      if (!clash) break;
      slug = `${slugify(request.title)}-${i}`;
    }

    const coverUrls: string[] = [];
    if (request.coverImageStorageId) {
      const url = await ctx.storage.getUrl(request.coverImageStorageId);
      if (url) coverUrls.push(url);
    }

    const productId = await ctx.db.insert("products", {
      title: request.title,
      slug,
      kind: "ebook",
      sku: await nextSku(ctx, "ebook"),
      description: request.description,
      categoryId: args.categoryId,
      author: request.authorName,
      language: request.language,
      region: request.region,
      country: request.country,
      fileStorageId: request.fileStorageId,
      fileFormat: request.fileFormat,
      price: args.price,
      stock: 999999, // digital, unlimited
      lowStockThreshold: 0,
      imageStorageIds: request.coverImageStorageId ? [request.coverImageStorageId] : [],
      imageUrls: [],
      tags: request.genre ? [request.genre, "ebook", "self-published"] : ["ebook", "self-published"],
      published: true,
      featured: false,
      archived: false,
      publishingStatus: "approved",
      unitsSold: 0,
      createdAt: now,
      updatedAt: now,
    });

    // Update the request
    await ctx.db.patch(args.requestId, {
      status: "approved",
      productId,
      reviewedAt: now,
      reviewedByStaffId: staff._id,
    });

    return productId;
  },
});

/** Admin: reject a publishing request. */
export const reject = mutation({
  args: {
    requestId: v.id("publishingRequests"),
    reviewNote: v.string(),
  },
  handler: async (ctx, args) => {
    const staff = await requireCapability(ctx, "manageInventory");
    const request = await ctx.db.get(args.requestId);
    if (!request) throw new Error("Publishing request not found.");
    if (request.status !== "pending") throw new Error("This request has already been reviewed.");

    await ctx.db.patch(args.requestId, {
      status: "rejected",
      reviewNote: args.reviewNote,
      reviewedAt: Date.now(),
      reviewedByStaffId: staff._id,
    });
  },
});
