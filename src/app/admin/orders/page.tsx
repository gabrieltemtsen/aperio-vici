"use client";

import Link from "next/link";
import { Suspense, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import { PageHeader } from "@/components/admin/shell";
import { StatusPill, ChannelPill } from "@/components/admin/order-status";
import { Panel, EmptyState, Skeleton } from "@/components/ui/primitives";
import { Input } from "@/components/ui/field";
import { formatNaira, formatPhone, timeAgo } from "@/lib/format";
import { ORDER_STATUS, type OrderStatus } from "@/lib/status";
import { cn } from "@/lib/utils";
import { Search, Receipt, Truck, Store } from "lucide-react";

const TABS: { value: OrderStatus | "all"; label: string }[] = [
  { value: "all", label: "All" },
  { value: "payment_review", label: "To verify" },
  { value: "paid", label: "To pack" },
  { value: "processing", label: "Packing" },
  { value: "ready", label: "Ready" },
  { value: "dispatched", label: "Out" },
  { value: "awaiting_payment", label: "Unpaid" },
  { value: "completed", label: "Done" },
  { value: "cancelled", label: "Cancelled" },
];

function OrdersContent() {
  const params = useSearchParams();
  const router = useRouter();
  const [search, setSearch] = useState("");

  const status = (params.get("status") as OrderStatus | null) ?? undefined;
  const channel = (params.get("channel") as "online" | "walk_in" | null) ?? undefined;

  const orders = useQuery(api.orders.adminList, {
    status,
    channel,
    search: search.trim() || undefined,
    limit: 150,
  });

  function setStatus(next: OrderStatus | "all") {
    const query = new URLSearchParams(params.toString());
    if (next === "all") query.delete("status");
    else query.set("status", next);
    router.push(`/admin/orders?${query.toString()}`, { scroll: false });
  }

  function setChannel(next: "online" | "walk_in" | null) {
    const query = new URLSearchParams(params.toString());
    if (next === null) query.delete("channel");
    else query.set("channel", next);
    router.push(`/admin/orders?${query.toString()}`, { scroll: false });
  }

  return (
    <>
      <PageHeader
        title="Orders"
        description="Every order, online and over the counter."
        action={
          <div className="relative w-full sm:w-72">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" aria-hidden />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Order number, name or phone"
              className="h-10 pl-9 text-[14px]"
              aria-label="Search orders"
            />
          </div>
        }
      />

      <div className="border-b border-rule bg-white">
        <div className="scroll-x flex gap-1 px-4 sm:px-6">
          {TABS.map((tab) => {
            const active = (status ?? "all") === tab.value;
            return (
              <button
                key={tab.value}
                onClick={() => setStatus(tab.value)}
                className={cn(
                  "shrink-0 border-b-2 px-3 py-3 text-[13.5px] transition-colors",
                  active
                    ? "border-brass font-medium text-ink"
                    : "border-transparent text-muted hover:text-ink",
                )}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="p-4 sm:p-6">
        <div className="mb-4 flex gap-2">
          {[
            { value: null, label: "Both channels" },
            { value: "online" as const, label: "Online", icon: Truck },
            { value: "walk_in" as const, label: "Counter", icon: Store },
          ].map((option) => (
            <button
              key={option.label}
              onClick={() => setChannel(option.value)}
              className={cn(
                "flex items-center gap-1.5 rounded-[var(--radius-pill)] border px-3 py-1 text-[13px] transition",
                (channel ?? null) === option.value
                  ? "border-ink bg-ink text-white"
                  : "border-rule bg-white text-muted hover:border-ink hover:text-ink",
              )}
            >
              {option.icon && <option.icon className="h-3.5 w-3.5" aria-hidden />}
              {option.label}
            </button>
          ))}
        </div>

        <Panel className="overflow-hidden">
          {orders === undefined ? (
            <div className="space-y-2 p-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : orders.length === 0 ? (
            <EmptyState
              icon={Receipt}
              title={search ? `Nothing matches “${search}”` : "No orders here"}
              description={
                search
                  ? "Try the full order number, or just the customer's phone digits."
                  : "Orders in this stage will appear here as they come through."
              }
            />
          ) : (
            <div className="scroll-x">
              <table className="w-full min-w-[720px] text-[14px]">
                <thead>
                  <tr className="border-b border-rule bg-surface text-left text-[12.5px] text-muted">
                    <th className="px-4 py-2.5 font-medium">Order</th>
                    <th className="px-3 py-2.5 font-medium">Customer</th>
                    <th className="px-3 py-2.5 font-medium">Items</th>
                    <th className="px-3 py-2.5 font-medium">Stage</th>
                    <th className="px-3 py-2.5 font-medium">Payment</th>
                    <th className="px-4 py-2.5 text-right font-medium">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.map((order) => (
                    <tr
                      key={order._id}
                      className="cursor-pointer border-b border-rule last:border-0 hover:bg-surface"
                      onClick={() => router.push(`/admin/orders/${order._id}`)}
                    >
                      <td className="px-4 py-3">
                        <Link
                          href={`/admin/orders/${order._id}`}
                          className="ref block text-ink hover:text-brass-deep"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {order.orderNumber}
                        </Link>
                        <span className="flex items-center gap-1.5 pt-1">
                          <ChannelPill channel={order.channel} />
                          <span className="text-[12px] text-faint">{timeAgo(order.createdAt)}</span>
                        </span>
                      </td>
                      <td className="px-3 py-3">
                        <p className="text-ink">{order.customerName}</p>
                        <p className="figure text-[12.5px] text-muted">
                          {order.customerPhone ? formatPhone(order.customerPhone) : "—"}
                        </p>
                      </td>
                      <td className="px-3 py-3 text-muted">
                        <span className="figure">{order.items.length}</span>
                        <span className="ml-1 text-[12.5px]">
                          {order.fulfilment === "delivery"
                            ? `· ${order.address?.state ?? "delivery"}`
                            : "· pickup"}
                        </span>
                      </td>
                      <td className="px-3 py-3"><StatusPill status={order.status} /></td>
                      <td className="px-3 py-3">
                        <span
                          className={cn(
                            "text-[13px]",
                            order.paymentStatus === "verified"
                              ? "text-leaf"
                              : order.paymentStatus === "submitted"
                                ? "text-brass-deep"
                                : "text-muted",
                          )}
                        >
                          {order.paymentStatus === "verified"
                            ? "Confirmed"
                            : order.paymentStatus === "submitted"
                              ? "Needs checking"
                              : order.paymentStatus === "rejected"
                                ? "Rejected"
                                : "Not paid"}
                        </span>
                      </td>
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

        {orders && orders.length > 0 && (
          <p className="mt-3 text-[13px] text-muted">
            Showing <span className="figure">{orders.length}</span>{" "}
            {orders.length === 1 ? "order" : "orders"}
            {status ? ` at the ${ORDER_STATUS[status].label.toLowerCase()} stage` : ""}.
          </p>
        )}
      </div>
    </>
  );
}

export default function AdminOrdersPage() {
  return (
    <Suspense fallback={<div className="p-6"><Skeleton className="h-10 w-48" /></div>}>
      <OrdersContent />
    </Suspense>
  );
}
