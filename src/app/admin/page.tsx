"use client";

import Link from "next/link";
import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import { PageHeader } from "@/components/admin/shell";
import { Stat, RevenueBars } from "@/components/admin/stat";
import { StatusPill, ChannelPill } from "@/components/admin/order-status";
import { Panel, PanelHeader, EmptyState, Skeleton } from "@/components/ui/primitives";
import { buttonStyles } from "@/components/ui/button";
import { formatNaira, formatNairaShort, timeAgo } from "@/lib/format";
import { ORDER_STATUS, type OrderStatus } from "@/lib/status";
import { cn } from "@/lib/utils";
import { BadgeCheck, PackageX, Receipt } from "lucide-react";

const WINDOWS = [
  { days: 7, label: "7 days" },
  { days: 30, label: "30 days" },
  { days: 90, label: "90 days" },
];

export default function DashboardPage() {
  const [days, setDays] = useState(30);
  const data = useQuery(api.analytics.dashboard, { days });
  const loading = data === undefined;

  const pipeline: OrderStatus[] = [
    "awaiting_payment",
    "payment_review",
    "paid",
    "processing",
    "ready",
    "dispatched",
  ];

  return (
    <>
      <PageHeader
        title="Overview"
        description="Money in, orders moving, and what is running out."
        action={
          <div className="flex rounded-[var(--radius-control)] border border-rule bg-white p-0.5">
            {WINDOWS.map((option) => (
              <button
                key={option.days}
                onClick={() => setDays(option.days)}
                className={cn(
                  "rounded-[4px] px-3 py-1.5 text-[13px] transition-colors",
                  days === option.days ? "bg-ink text-white" : "text-muted hover:text-ink",
                )}
              >
                {option.label}
              </button>
            ))}
          </div>
        }
      />

      <div className="space-y-6 p-4 sm:p-6">
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <Stat
            label={`Confirmed revenue, last ${days} days`}
            value={loading ? "" : formatNaira(data.revenue)}
            change={data?.revenueChange}
            detail={`vs previous ${days} days`}
            loading={loading}
          />
          <Stat
            label="Taken today"
            value={loading ? "" : formatNaira(data.todaysRevenue)}
            detail={
              loading ? undefined : `${data.todaysOrderCount} ${data.todaysOrderCount === 1 ? "order" : "orders"}`
            }
            loading={loading}
          />
          <Stat
            label="Waiting on transfers"
            value={loading ? "" : formatNaira(data.awaitingPayment)}
            detail="Stock is held against this"
            loading={loading}
            tone="brass"
          />
          <Stat
            label="Average order"
            value={loading ? "" : formatNaira(data.averageOrderValue)}
            detail={loading ? undefined : `${data.orderCount} orders placed`}
            loading={loading}
          />
        </div>

        {!loading && data.pendingVerificationCount > 0 && (
          <Link
            href="/admin/payments"
            className="flex items-center gap-3 rounded-[var(--radius-sheet)] border border-brass/40 bg-brass-soft px-4 py-3 transition hover:border-brass"
          >
            <BadgeCheck className="h-5 w-5 shrink-0 text-brass-deep" aria-hidden />
            <span className="flex-1 text-[14.5px] text-ink">
              <span className="figure font-semibold">{data.pendingVerificationCount}</span>{" "}
              {data.pendingVerificationCount === 1 ? "customer says they have" : "customers say they have"}{" "}
              paid. Check the transfers against your statement.
            </span>
            <span className="shrink-0 text-[13.5px] font-medium text-brass-deep">Open the queue</span>
          </Link>
        )}

        <div className="grid gap-6 xl:grid-cols-[1fr_360px]">
          <div className="space-y-6">
            <Panel>
              <PanelHeader
                title="Revenue by day"
                description={`Confirmed payments only, last ${days} days`}
              />
              <div className="px-4 py-5 sm:px-5">
                {loading ? (
                  <Skeleton className="h-44 w-full" />
                ) : (
                  <>
                    <RevenueBars series={data.series} formatValue={formatNaira} />
                    <div className="mt-2 flex justify-between text-[12px] text-faint">
                      <span>
                        {new Date(data.series[0].date).toLocaleDateString("en-NG", {
                          day: "numeric",
                          month: "short",
                        })}
                      </span>
                      <span>Today</span>
                    </div>
                  </>
                )}
              </div>
            </Panel>

            <Panel>
              <PanelHeader
                title="Where orders are sitting"
                description="Each stage of the pipeline, in the last window"
              />
              <div className="grid grid-cols-2 sm:grid-cols-3">
                {pipeline.map((status) => (
                  <Link
                    key={status}
                    href={`/admin/orders?status=${status}`}
                    className="border-b border-r border-rule px-4 py-3.5 transition hover:bg-surface"
                  >
                    <p className="figure font-display text-[24px] leading-none text-ink">
                      {loading ? "—" : (data.byStatus[status] ?? 0)}
                    </p>
                    <p className="mt-1 text-[13px] text-muted">{ORDER_STATUS[status].label}</p>
                  </Link>
                ))}
              </div>
            </Panel>

            <Panel>
              <PanelHeader
                title="Latest orders"
                action={
                  <Link href="/admin/orders" className="text-[13.5px] text-brass-deep hover:underline">
                    All orders
                  </Link>
                }
              />
              {loading ? (
                <div className="space-y-2 p-4">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Skeleton key={i} className="h-11 w-full" />
                  ))}
                </div>
              ) : data.recentOrders.length === 0 ? (
                <EmptyState
                  icon={Receipt}
                  title="No orders in this window"
                  description="Once customers start ordering, they show up here as they come in."
                />
              ) : (
                <div className="scroll-x">
                  <table className="w-full min-w-[560px] text-[14px]">
                    <tbody>
                      {data.recentOrders.map((order) => (
                        <tr key={order._id} className="border-b border-rule last:border-0 hover:bg-surface">
                          <td className="px-4 py-3">
                            <Link href={`/admin/orders/${order._id}`} className="ref text-ink hover:text-brass-deep">
                              {order.orderNumber}
                            </Link>
                          </td>
                          <td className="px-2 py-3">
                            <p className="truncate text-ink">{order.customerName}</p>
                            <p className="text-[12.5px] text-muted">{timeAgo(order.createdAt)}</p>
                          </td>
                          <td className="px-2 py-3"><ChannelPill channel={order.channel} /></td>
                          <td className="px-2 py-3"><StatusPill status={order.status} /></td>
                          <td className="figure px-4 py-3 text-right font-medium text-ink">
                            {formatNaira(order.total)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Panel>
          </div>

          <div className="space-y-6">
            <Panel>
              <PanelHeader title="Running low" description="At or below the reorder level" />
              {loading ? (
                <div className="space-y-2 p-4">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <Skeleton key={i} className="h-10 w-full" />
                  ))}
                </div>
              ) : data.lowStock.length === 0 ? (
                <EmptyState
                  icon={PackageX}
                  title="Nothing is running out"
                  description="Every published product is above its reorder level."
                />
              ) : (
                <ul>
                  {data.lowStock.map((item) => (
                    <li
                      key={item._id}
                      className="flex items-center justify-between gap-3 border-b border-rule px-4 py-2.5 last:border-0"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-[14px] text-ink">{item.title}</p>
                        <p className="ref text-[12px] text-faint">{item.sku}</p>
                      </div>
                      <span
                        className={cn(
                          "figure shrink-0 rounded-[var(--radius-pill)] px-2 py-0.5 text-[12.5px] font-medium",
                          item.stock === 0 ? "bg-flag-soft text-flag" : "bg-amber-soft text-amber",
                        )}
                      >
                        {item.stock === 0 ? "Out" : `${item.stock} left`}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
              <div className="border-t border-rule px-4 py-3">
                <Link href="/admin/products?stock=low" className={buttonStyles({ variant: "secondary", size: "sm" })}>
                  Restock these
                </Link>
              </div>
            </Panel>

            <Panel>
              <PanelHeader title="Selling best" description={`By copies sold, last ${days} days`} />
              {loading ? (
                <div className="space-y-2 p-4">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <Skeleton key={i} className="h-10 w-full" />
                  ))}
                </div>
              ) : data.topProducts.length === 0 ? (
                <p className="px-4 py-6 text-[14px] text-muted">
                  No confirmed sales in this window yet.
                </p>
              ) : (
                <ul>
                  {data.topProducts.map((product) => (
                    <li
                      key={product.productId}
                      className="flex items-center justify-between gap-3 border-b border-rule px-4 py-2.5 last:border-0"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-[14px] text-ink">{product.title}</p>
                        {product.author && (
                          <p className="truncate text-[12.5px] text-muted">{product.author}</p>
                        )}
                      </div>
                      <div className="shrink-0 text-right">
                        <p className="figure text-[14px] text-ink">{product.units}</p>
                        <p className="figure text-[12px] text-muted">
                          {formatNairaShort(product.revenue)}
                        </p>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </Panel>

            <Panel>
              <PanelHeader title="Online against the counter" />
              <div className="space-y-3 px-4 py-4">
                {loading ? (
                  <Skeleton className="h-16 w-full" />
                ) : (
                  (["online", "walkIn"] as const).map((channel) => {
                    const entry = data.channelSplit[channel];
                    const total =
                      data.channelSplit.online.revenue + data.channelSplit.walkIn.revenue || 1;
                    const share = Math.round((entry.revenue / total) * 100);
                    return (
                      <div key={channel}>
                        <div className="flex items-baseline justify-between text-[13.5px]">
                          <span className="text-muted">
                            {channel === "online" ? "Online orders" : "Walk-in sales"}
                          </span>
                          <span className="figure text-ink">{formatNaira(entry.revenue)}</span>
                        </div>
                        <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-surface-deep">
                          <div
                            className={cn("h-full", channel === "online" ? "bg-ink" : "bg-brass")}
                            style={{ width: `${share}%` }}
                          />
                        </div>
                        <p className="figure mt-1 text-[12px] text-faint">
                          {entry.count} {entry.count === 1 ? "order" : "orders"} · {share}%
                        </p>
                      </div>
                    );
                  })
                )}
                {!loading && (
                  <p className="border-t border-rule pt-3 text-[13px] text-muted">
                    Stock on hand is worth{" "}
                    <span className="figure text-ink">{formatNaira(data.stockValue)}</span> at cost.
                  </p>
                )}
              </div>
            </Panel>
          </div>
        </div>
      </div>
    </>
  );
}
