import { v } from "convex/values";
import { query } from "./_generated/server";
import { Doc } from "./_generated/dataModel";
import { requireCapability } from "./lib/auth";

const DAY = 24 * 60 * 60 * 1000;

/** Revenue counts verified money only. An unverified transfer is not revenue. */
function isRevenue(order: Doc<"orders">) {
  return order.paymentStatus === "verified" && order.status !== "cancelled";
}

export const dashboard = query({
  args: { days: v.optional(v.number()) },
  handler: async (ctx, args) => {
    await requireCapability(ctx, "viewDashboard");

    const windowDays = args.days ?? 30;
    const now = Date.now();
    const since = now - windowDays * DAY;
    const startOfToday = new Date(new Date(now).setHours(0, 0, 0, 0)).getTime();

    const orders = await ctx.db
      .query("orders")
      .withIndex("by_createdAt", (q) => q.gte("createdAt", since - windowDays * DAY))
      .collect();

    const inWindow = orders.filter((o) => o.createdAt >= since);
    const previousWindow = orders.filter(
      (o) => o.createdAt >= since - windowDays * DAY && o.createdAt < since,
    );

    const revenue = inWindow.filter(isRevenue).reduce((sum, o) => sum + o.total, 0);
    const previousRevenue = previousWindow
      .filter(isRevenue)
      .reduce((sum, o) => sum + o.total, 0);

    const todaysOrders = inWindow.filter((o) => o.createdAt >= startOfToday);
    const todaysRevenue = todaysOrders.filter(isRevenue).reduce((s, o) => s + o.total, 0);

    // Money already committed to stock but not yet confirmed at the bank. This
    // is the number that tells the shop how much chasing is outstanding.
    const awaitingPayment = inWindow
      .filter((o) => o.paymentStatus !== "verified" && o.status !== "cancelled")
      .reduce((sum, o) => sum + o.total, 0);

    const byStatus: Record<string, number> = {};
    for (const order of inWindow) {
      byStatus[order.status] = (byStatus[order.status] ?? 0) + 1;
    }

    // Daily revenue series for the chart.
    const series: { date: string; revenue: number; orders: number }[] = [];
    for (let i = windowDays - 1; i >= 0; i--) {
      const dayStart = new Date(new Date(now - i * DAY).setHours(0, 0, 0, 0)).getTime();
      const dayEnd = dayStart + DAY;
      const dayOrders = inWindow.filter(
        (o) => o.createdAt >= dayStart && o.createdAt < dayEnd,
      );
      series.push({
        date: new Date(dayStart).toISOString().slice(0, 10),
        revenue: dayOrders.filter(isRevenue).reduce((s, o) => s + o.total, 0),
        orders: dayOrders.length,
      });
    }

    // Top sellers by units, from the line items actually sold in the window.
    const productTally = new Map<
      string,
      { title: string; author?: string; units: number; revenue: number }
    >();
    for (const order of inWindow.filter(isRevenue)) {
      for (const item of order.items) {
        const key = item.productId;
        const entry = productTally.get(key) ?? {
          title: item.title,
          author: item.author,
          units: 0,
          revenue: 0,
        };
        entry.units += item.quantity;
        entry.revenue += item.lineTotal;
        productTally.set(key, entry);
      }
    }
    const topProducts = [...productTally.entries()]
      .map(([productId, v]) => ({ productId, ...v }))
      .sort((a, b) => b.units - a.units)
      .slice(0, 6);

    const online = inWindow.filter((o) => o.channel === "online");
    const walkIn = inWindow.filter((o) => o.channel === "walk_in");

    const allProducts = await ctx.db.query("products").take(1000);
    const lowStock = allProducts
      .filter((p) => !p.archived && p.published && p.stock <= p.lowStockThreshold)
      .sort((a, b) => a.stock - b.stock)
      .slice(0, 8)
      .map((p) => ({
        _id: p._id,
        title: p.title,
        stock: p.stock,
        threshold: p.lowStockThreshold,
        sku: p.sku,
      }));

    const stockValue = allProducts
      .filter((p) => !p.archived)
      .reduce((sum, p) => sum + p.stock * (p.costPrice ?? p.price), 0);

    const pendingVerification = await ctx.db
      .query("payments")
      .withIndex("by_status", (q) => q.eq("status", "submitted"))
      .take(100);

    const recentOrders = [...inWindow]
      .sort((a, b) => b.createdAt - a.createdAt)
      .slice(0, 8);

    const revenueChange =
      previousRevenue === 0
        ? null
        : Math.round(((revenue - previousRevenue) / previousRevenue) * 100);

    return {
      windowDays,
      revenue,
      previousRevenue,
      revenueChange,
      todaysRevenue,
      todaysOrderCount: todaysOrders.length,
      orderCount: inWindow.length,
      averageOrderValue:
        inWindow.filter(isRevenue).length > 0
          ? Math.round(revenue / inWindow.filter(isRevenue).length)
          : 0,
      awaitingPayment,
      pendingVerificationCount: pendingVerification.length,
      byStatus,
      series,
      topProducts,
      channelSplit: {
        online: { count: online.length, revenue: online.filter(isRevenue).reduce((s, o) => s + o.total, 0) },
        walkIn: { count: walkIn.length, revenue: walkIn.filter(isRevenue).reduce((s, o) => s + o.total, 0) },
      },
      lowStock,
      stockValue,
      recentOrders,
    };
  },
});

/** A cashier's own shift total — what they must have in the drawer. */
export const registerSummary = query({
  args: {},
  handler: async (ctx) => {
    const staff = await requireCapability(ctx, "useRegister");
    const startOfToday = new Date(new Date().setHours(0, 0, 0, 0)).getTime();

    const todays = await ctx.db
      .query("orders")
      .withIndex("by_createdAt", (q) => q.gte("createdAt", startOfToday))
      .collect();

    const mine = todays.filter(
      (o) => o.channel === "walk_in" && o.createdByStaffId === staff._id,
    );

    const byMethod = (method: string) =>
      mine.filter((o) => o.paymentMethod === method).reduce((s, o) => s + o.total, 0);

    return {
      staffName: staff.name ?? staff.email ?? "You",
      saleCount: mine.length,
      total: mine.reduce((s, o) => s + o.total, 0),
      cash: byMethod("cash"),
      card: byMethod("pos_terminal"),
      transfer: byMethod("bank_transfer"),
      lastSales: mine.sort((a, b) => b.createdAt - a.createdAt).slice(0, 5),
    };
  },
});
