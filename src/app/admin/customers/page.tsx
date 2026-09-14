"use client";

import Link from "next/link";
import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { PageHeader } from "@/components/admin/shell";
import { StatusPill } from "@/components/admin/order-status";
import { Input } from "@/components/ui/field";
import { Panel, EmptyState, Modal, Skeleton } from "@/components/ui/primitives";
import { formatNaira, formatPhone, formatDate, timeAgo } from "@/lib/format";
import { Search, Users, Phone, MessageCircle } from "lucide-react";

export default function CustomersPage() {
  const [search, setSearch] = useState("");
  const [openId, setOpenId] = useState<Id<"customers"> | null>(null);

  const customers = useQuery(api.customers.list, { search: search.trim() || undefined });
  const detail = useQuery(api.customers.get, openId ? { id: openId } : "skip");

  return (
    <>
      <PageHeader
        title="Customers"
        description="Everyone who has ordered, online or at the counter."
        action={
          <div className="relative w-full sm:w-72">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" aria-hidden />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Name or phone number"
              className="h-10 pl-9 text-[14px]"
              aria-label="Search customers"
            />
          </div>
        }
      />

      <div className="p-4 sm:p-6">
        <Panel className="overflow-hidden">
          {customers === undefined ? (
            <div className="space-y-2 p-4">
              {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
            </div>
          ) : customers.length === 0 ? (
            <EmptyState
              icon={Users}
              title={search ? `No one matches “${search}”` : "No customers yet"}
              description={
                search
                  ? "Try just the last few digits of their phone number."
                  : "Customers are created automatically the first time someone orders."
              }
            />
          ) : (
            <div className="scroll-x">
              <table className="w-full min-w-[640px] text-[14px]">
                <thead>
                  <tr className="border-b border-rule bg-surface text-left text-[12.5px] text-muted">
                    <th className="px-4 py-2.5 font-medium">Customer</th>
                    <th className="px-3 py-2.5 font-medium">Phone</th>
                    <th className="px-3 py-2.5 text-right font-medium">Orders</th>
                    <th className="px-3 py-2.5 text-right font-medium">Spent</th>
                    <th className="px-4 py-2.5 text-right font-medium">Last order</th>
                  </tr>
                </thead>
                <tbody>
                  {customers.map((customer) => (
                    <tr
                      key={customer._id}
                      onClick={() => setOpenId(customer._id)}
                      className="cursor-pointer border-b border-rule last:border-0 hover:bg-surface"
                    >
                      <td className="px-4 py-3">
                        <p className="text-ink">{customer.name}</p>
                        {customer.email && <p className="text-[12.5px] text-muted">{customer.email}</p>}
                      </td>
                      <td className="figure px-3 py-3 text-muted">{formatPhone(customer.phone)}</td>
                      <td className="figure px-3 py-3 text-right text-ink">{customer.totalOrders}</td>
                      <td className="figure px-3 py-3 text-right font-medium text-ink">
                        {formatNaira(customer.totalSpent)}
                      </td>
                      <td className="px-4 py-3 text-right text-muted">
                        {customer.lastOrderAt ? timeAgo(customer.lastOrderAt) : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Panel>
      </div>

      <Modal
        open={!!openId}
        onClose={() => setOpenId(null)}
        title={detail?.customer.name ?? "Customer"}
        description={detail ? `Customer since ${formatDate(detail.customer.createdAt)}` : undefined}
        wide
      >
        {detail === undefined ? (
          <Skeleton className="h-48 w-full" />
        ) : detail === null ? (
          <p className="text-[14px] text-muted">That customer record is gone.</p>
        ) : (
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              <div className="rounded-[var(--radius-sheet)] border border-rule px-3 py-2.5">
                <p className="text-[12.5px] text-muted">Orders</p>
                <p className="figure font-display text-[22px] text-ink">{detail.customer.totalOrders}</p>
              </div>
              <div className="rounded-[var(--radius-sheet)] border border-rule px-3 py-2.5">
                <p className="text-[12.5px] text-muted">Spent</p>
                <p className="figure font-display text-[22px] text-ink">
                  {formatNaira(detail.customer.totalSpent)}
                </p>
              </div>
              <div className="rounded-[var(--radius-sheet)] border border-rule px-3 py-2.5">
                <p className="text-[12.5px] text-muted">Average order</p>
                <p className="figure font-display text-[22px] text-ink">
                  {formatNaira(
                    detail.customer.totalOrders > 0
                      ? Math.round(detail.customer.totalSpent / detail.customer.totalOrders)
                      : 0,
                  )}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <a
                href={`tel:${detail.customer.phone}`}
                className="inline-flex items-center gap-1.5 rounded-[var(--radius-control)] border border-rule px-3 py-2 text-[13.5px] text-ink-soft hover:border-ink"
              >
                <Phone className="h-3.5 w-3.5" aria-hidden />
                {formatPhone(detail.customer.phone)}
              </a>
              <a
                href={`https://wa.me/234${detail.customer.phone.slice(1)}`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 rounded-[var(--radius-control)] border border-rule px-3 py-2 text-[13.5px] text-ink-soft hover:border-ink"
              >
                <MessageCircle className="h-3.5 w-3.5" aria-hidden />
                WhatsApp
              </a>
            </div>

            {detail.customer.addresses.length > 0 && (
              <div>
                <h3 className="text-[14px] font-semibold text-ink">Addresses they have used</h3>
                <ul className="mt-2 space-y-2">
                  {detail.customer.addresses.map((address, i) => (
                    <li key={i} className="rounded-[var(--radius-sheet)] border border-rule px-3 py-2 text-[13.5px] text-muted">
                      {address.street}, {address.city}, {address.state}
                      {address.landmark && <span className="block text-faint">{address.landmark}</span>}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div>
              <h3 className="text-[14px] font-semibold text-ink">Order history</h3>
              <div className="mt-2 rounded-[var(--radius-sheet)] border border-rule">
                {detail.orders.length === 0 ? (
                  <p className="px-4 py-4 text-[14px] text-muted">No orders on this record yet.</p>
                ) : (
                  detail.orders.map((order) => (
                    <Link
                      key={order._id}
                      href={`/admin/orders/${order._id}`}
                      onClick={() => setOpenId(null)}
                      className="flex items-center justify-between gap-3 border-b border-rule px-4 py-2.5 last:border-0 hover:bg-surface"
                    >
                      <div className="min-w-0">
                        <span className="ref text-[14px] text-ink">{order.orderNumber}</span>
                        <p className="text-[12.5px] text-muted">
                          {order.items.length} {order.items.length === 1 ? "item" : "items"} ·{" "}
                          {formatDate(order.createdAt)}
                        </p>
                      </div>
                      <div className="flex shrink-0 items-center gap-3">
                        <StatusPill status={order.status} />
                        <span className="figure text-[14px] text-ink">{formatNaira(order.total)}</span>
                      </div>
                    </Link>
                  ))
                )}
              </div>
            </div>
          </div>
        )}
      </Modal>
    </>
  );
}
