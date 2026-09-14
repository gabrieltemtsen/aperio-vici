"use client";

import Link from "next/link";
import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import { SiteHeader } from "@/components/shop/site-header";
import { Button } from "@/components/ui/button";
import { Input, Field } from "@/components/ui/field";
import { Alert } from "@/components/ui/primitives";
import { formatNaira, formatDateTime } from "@/lib/format";
import { ORDER_STATUS, STATUS_TONE_CLASS, PIPELINE, type OrderStatus } from "@/lib/status";
import { cn } from "@/lib/utils";

export default function TrackPage() {
  const [orderNumber, setOrderNumber] = useState("");
  const [last4, setLast4] = useState("");
  const [query, setQuery] = useState<{ orderNumber: string; phoneLast4: string } | null>(null);

  const result = useQuery(api.orders.track, query ?? "skip");

  function search(e: React.FormEvent) {
    e.preventDefault();
    if (!orderNumber.trim() || last4.replace(/\D/g, "").length < 4) return;
    setQuery({
      orderNumber: orderNumber.trim().toUpperCase(),
      phoneLast4: last4.replace(/\D/g, "").slice(-4),
    });
  }

  return (
    <>
      <SiteHeader />

      <main className="mx-auto max-w-[720px] px-4 py-10 sm:px-6 sm:py-16">
        <h1 className="font-display text-[32px] leading-tight text-ink sm:text-[40px]">
          Where is my order?
        </h1>
        <p className="mt-2 text-[15.5px] text-muted">
          Enter your order number and the last four digits of the phone number you ordered with.
        </p>

        <form onSubmit={search} className="mt-7 grid gap-4 sm:grid-cols-[1fr_150px_auto] sm:items-end">
          <Field label="Order number" htmlFor="orderNumber">
            <Input
              id="orderNumber"
              value={orderNumber}
              onChange={(e) => setOrderNumber(e.target.value.toUpperCase())}
              placeholder="AV-ACDE"
              className="ref"
              autoComplete="off"
            />
          </Field>
          <Field label="Last 4 digits of phone" htmlFor="last4">
            <Input
              id="last4"
              value={last4}
              onChange={(e) => setLast4(e.target.value.replace(/\D/g, "").slice(0, 4))}
              placeholder="4567"
              inputMode="numeric"
              className="figure"
            />
          </Field>
          <Button type="submit" size="lg" className="h-11">Find it</Button>
        </form>

        {query && result === undefined && (
          <p className="mt-8 text-[15px] text-muted">Looking…</p>
        )}

        {result && !result.found && (
          <div className="mt-8">
            <Alert tone="bad" title="No match">
              We could not find an order with that number and phone combination. Check the order
              number from your confirmation, or call the shop and we will look it up for you.
            </Alert>
          </div>
        )}

        {result?.found && (
          <article className="mt-10">
            {(() => {
              const order = result.order;
              const status = ORDER_STATUS[order.status as OrderStatus];
              const stepIndex = PIPELINE.indexOf(order.status as OrderStatus);

              return (
                <>
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="ref font-display text-[28px] leading-none text-ink">
                        {order.orderNumber}
                      </p>
                      <p className="mt-1.5 text-[14px] text-muted">
                        {order.items.length} {order.items.length === 1 ? "item" : "items"} ·{" "}
                        <span className="figure">{formatNaira(order.total)}</span>
                      </p>
                    </div>
                    <span
                      className={cn(
                        "rounded-[var(--radius-pill)] border px-3 py-1.5 text-[13px] font-medium",
                        STATUS_TONE_CLASS[status.tone],
                      )}
                    >
                      {status.customerLabel}
                    </span>
                  </div>

                  <p className="mt-3 text-[15px] leading-relaxed text-ink-soft">
                    {status.customerDetail}
                  </p>

                  {order.status !== "cancelled" && (
                    <ol className="mt-7 flex gap-1" aria-label="Order progress">
                      {PIPELINE.slice(0, 6).map((step, i) => (
                        <li key={step} className="flex-1">
                          <div
                            className={cn(
                              "h-1.5 rounded-full",
                              i <= stepIndex ? "bg-brass" : "bg-surface-deep",
                            )}
                          />
                          <p
                            className={cn(
                              "mt-2 text-[11.5px] leading-tight",
                              i <= stepIndex ? "text-ink-soft" : "text-faint",
                            )}
                          >
                            {ORDER_STATUS[step].label}
                          </p>
                        </li>
                      ))}
                    </ol>
                  )}

                  <div className="mt-9 rounded-[var(--radius-sheet)] border border-rule">
                    {order.items.map((item) => (
                      <div
                        key={item.productId}
                        className="flex justify-between gap-4 border-b border-rule px-4 py-3 text-[14.5px] last:border-0"
                      >
                        <span className="min-w-0">
                          <span className="block text-ink">{item.title}</span>
                          {item.author && <span className="block text-[13px] text-muted">{item.author}</span>}
                        </span>
                        <span className="figure shrink-0 text-muted">×{item.quantity}</span>
                      </div>
                    ))}
                  </div>

                  <ol className="mt-8 space-y-3">
                    {[...order.timeline].reverse().map((entry, i) => (
                      <li key={i} className="flex gap-3">
                        <span
                          className={cn(
                            "mt-1.5 h-2 w-2 shrink-0 rounded-full",
                            i === 0 ? "bg-brass" : "bg-rule-strong",
                          )}
                          aria-hidden
                        />
                        <div>
                          <p className="text-[14px] text-ink">
                            {ORDER_STATUS[entry.status as OrderStatus]?.customerLabel ?? entry.status}
                          </p>
                          {entry.note && <p className="text-[13px] text-muted">{entry.note}</p>}
                          <p className="text-[12.5px] text-faint">{formatDateTime(entry.at)}</p>
                        </div>
                      </li>
                    ))}
                  </ol>

                  {order.paymentStatus !== "verified" && order.status !== "cancelled" && (
                    <div className="mt-8">
                      <Link href={`/order/${order.orderNumber}`}>
                        <Button size="lg" variant="brass">See payment details</Button>
                      </Link>
                    </div>
                  )}
                </>
              );
            })()}
          </article>
        )}
      </main>
    </>
  );
}
