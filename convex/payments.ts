import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { requireCapability } from "./lib/auth";
import { paymentMethodValidator } from "./schema";

/**
 * Anyone holding an order number can attach transfer details to it. That is
 * intentional: the customer is not signed in and is usually on a phone at the
 * bank. Nothing here moves money or changes the order total — it only queues
 * the order for a human to check against the bank statement.
 */
export const submitTransferProof = mutation({
  args: {
    orderNumber: v.string(),
    amount: v.number(),
    senderName: v.string(),
    bankName: v.optional(v.string()),
    reference: v.optional(v.string()),
    paidAt: v.optional(v.number()),
    proofStorageId: v.optional(v.id("_storage")),
  },
  handler: async (ctx, args) => {
    const order = await ctx.db
      .query("orders")
      .withIndex("by_orderNumber", (q) =>
        q.eq("orderNumber", args.orderNumber.trim().toUpperCase()),
      )
      .unique();

    if (!order) throw new Error("We could not find that order number.");
    if (order.status === "cancelled") {
      throw new Error("This order was cancelled. Place a new order or call the shop.");
    }
    if (order.paymentStatus === "verified") {
      throw new Error("This order is already marked as paid.");
    }
    if (args.senderName.trim().length < 2) {
      throw new Error("Enter the name the transfer was sent from.");
    }
    if (args.amount <= 0) throw new Error("Enter the amount you transferred.");

    const now = Date.now();

    await ctx.db.insert("payments", {
      orderId: order._id,
      orderNumber: order.orderNumber,
      amount: args.amount,
      method: "bank_transfer",
      status: "submitted",
      senderName: args.senderName.trim(),
      bankName: args.bankName?.trim() || undefined,
      reference: args.reference?.trim() || undefined,
      paidAt: args.paidAt ?? now,
      proofStorageId: args.proofStorageId,
      createdAt: now,
    });

    await ctx.db.patch(order._id, {
      status: "payment_review",
      paymentStatus: "submitted",
      updatedAt: now,
      timeline: [
        ...order.timeline,
        { status: "payment_review", note: "Customer submitted transfer details", at: now },
      ],
    });

    return { ok: true };
  },
});

/** Upload URL for the proof-of-payment screenshot. Public by design. */
export const generateProofUploadUrl = mutation({
  args: {},
  handler: async (ctx) => await ctx.storage.generateUploadUrl(),
});

// ---------------------------------------------------------------------------
// Verification desk
// ---------------------------------------------------------------------------

export const verificationQueue = query({
  args: {},
  handler: async (ctx) => {
    await requireCapability(ctx, "verifyPayments");

    const submitted = await ctx.db
      .query("payments")
      .withIndex("by_status", (q) => q.eq("status", "submitted"))
      .order("desc")
      .take(100);

    return Promise.all(
      submitted.map(async (payment) => {
        const order = await ctx.db.get(payment.orderId);
        return {
          ...payment,
          proofUrl: payment.proofStorageId
            ? await ctx.storage.getUrl(payment.proofStorageId)
            : null,
          order,
          // The number that actually matters at the desk: did they send enough?
          shortfall: order ? Math.max(0, order.total - payment.amount) : 0,
          overpaid: order ? Math.max(0, payment.amount - order.total) : 0,
        };
      }),
    );
  },
});

export const recentlyVerified = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    await requireCapability(ctx, "verifyPayments");
    const verified = await ctx.db
      .query("payments")
      .withIndex("by_status", (q) => q.eq("status", "verified"))
      .order("desc")
      .take(args.limit ?? 25);
    return verified;
  },
});

export const verify = mutation({
  args: {
    paymentId: v.id("payments"),
    confirmedAmount: v.optional(v.number()),
    note: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const staff = await requireCapability(ctx, "verifyPayments");
    const payment = await ctx.db.get(args.paymentId);
    if (!payment) throw new Error("That payment record no longer exists.");
    if (payment.status === "verified") throw new Error("This payment is already verified.");

    const order = await ctx.db.get(payment.orderId);
    if (!order) throw new Error("The order attached to this payment no longer exists.");

    const amount = args.confirmedAmount ?? payment.amount;
    const now = Date.now();

    await ctx.db.patch(args.paymentId, {
      status: "verified",
      amount,
      verifiedByStaffId: staff._id,
      verifiedByName: staff.name ?? staff.email,
      verifiedAt: now,
    });

    const amountPaid = order.amountPaid + amount;
    const settled = amountPaid >= order.total;

    await ctx.db.patch(order._id, {
      amountPaid,
      paymentStatus: settled ? "verified" : "submitted",
      status: settled ? "paid" : order.status,
      updatedAt: now,
      timeline: [
        ...order.timeline,
        {
          status: settled ? "paid" : order.status,
          note: settled
            ? args.note ?? "Payment confirmed against the bank statement"
            : `Part payment confirmed — ${amountPaid} of ${order.total} kobo received`,
          at: now,
          byName: staff.name ?? staff.email,
        },
      ],
    });

    if (settled && order.customerId) {
      const customer = await ctx.db.get(order.customerId);
      if (customer) {
        await ctx.db.patch(order.customerId, {
          totalSpent: customer.totalSpent + order.total,
        });
      }
    }

    return { settled, amountPaid, outstanding: Math.max(0, order.total - amountPaid) };
  },
});

export const reject = mutation({
  args: { paymentId: v.id("payments"), reason: v.string() },
  handler: async (ctx, args) => {
    const staff = await requireCapability(ctx, "verifyPayments");
    if (args.reason.trim().length < 4) {
      throw new Error("Give a reason — the customer sees this.");
    }

    const payment = await ctx.db.get(args.paymentId);
    if (!payment) throw new Error("That payment record no longer exists.");
    const order = await ctx.db.get(payment.orderId);
    if (!order) throw new Error("The order attached to this payment no longer exists.");

    const now = Date.now();

    await ctx.db.patch(args.paymentId, {
      status: "rejected",
      rejectionReason: args.reason.trim(),
      verifiedByStaffId: staff._id,
      verifiedByName: staff.name ?? staff.email,
      verifiedAt: now,
    });

    // Back to awaiting payment rather than cancelled — most rejections are a
    // wrong amount or a screenshot of the wrong transfer, and the customer can fix it.
    await ctx.db.patch(order._id, {
      status: "awaiting_payment",
      paymentStatus: "pending",
      updatedAt: now,
      timeline: [
        ...order.timeline,
        {
          status: "awaiting_payment",
          note: `Payment not confirmed: ${args.reason.trim()}`,
          at: now,
          byName: staff.name ?? staff.email,
        },
      ],
    });
  },
});

/** Used when a customer pays into the account and calls the shop instead. */
export const recordManualPayment = mutation({
  args: {
    orderId: v.id("orders"),
    amount: v.number(),
    method: paymentMethodValidator,
    reference: v.optional(v.string()),
    note: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const staff = await requireCapability(ctx, "verifyPayments");
    const order = await ctx.db.get(args.orderId);
    if (!order) throw new Error("That order no longer exists.");
    if (args.amount <= 0) throw new Error("Enter the amount received.");

    const now = Date.now();
    const paymentId = await ctx.db.insert("payments", {
      orderId: args.orderId,
      orderNumber: order.orderNumber,
      amount: args.amount,
      method: args.method,
      status: "verified",
      reference: args.reference?.trim() || undefined,
      paidAt: now,
      verifiedByStaffId: staff._id,
      verifiedByName: staff.name ?? staff.email,
      verifiedAt: now,
      recordedByStaffId: staff._id,
      createdAt: now,
    });

    const amountPaid = order.amountPaid + args.amount;
    const settled = amountPaid >= order.total;

    await ctx.db.patch(args.orderId, {
      amountPaid,
      paymentStatus: settled ? "verified" : "submitted",
      status: settled && order.status === "awaiting_payment" ? "paid" : order.status,
      updatedAt: now,
      timeline: [
        ...order.timeline,
        {
          status: settled ? "paid" : order.status,
          note: args.note ?? `Payment recorded at the shop by ${staff.name ?? staff.email}`,
          at: now,
          byName: staff.name ?? staff.email,
        },
      ],
    });

    return paymentId;
  },
});
