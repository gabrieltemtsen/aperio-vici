"use client";

import Link from "next/link";
import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation } from "convex/react";
import { useAuthActions } from "@convex-dev/auth/react";
import { api } from "@convex/_generated/api";
import { BookCover } from "@/components/shop/book-cover";
import { Button } from "@/components/ui/button";
import { Input, Field, NairaInput } from "@/components/ui/field";
import { Alert, Modal, Spinner, EmptyState } from "@/components/ui/primitives";
import { useToast } from "@/components/ui/toast";
import { useRegister, cartSubtotal, cartCount } from "@/lib/cart-store";
import { formatNaira, formatPhone, isValidPhone, formatDateTime } from "@/lib/format";
import { cn } from "@/lib/utils";
import {
  Search, Minus, Plus, Trash2, Banknote, CreditCard, Landmark,
  ScanBarcode, LayoutDashboard, Receipt, X, ShoppingBag,
} from "lucide-react";

type Method = "cash" | "pos_terminal" | "bank_transfer";

const QUICK_CASH = [1000, 2000, 5000, 10000, 20000];

export default function RegisterPage() {
  const { signOut } = useAuthActions();
  const { notify } = useToast();
  const me = useQuery(api.staff.me);

  const { lines, add, setQuantity, remove, clear } = useRegister();
  const [term, setTerm] = useState("");
  const searchRef = useRef<HTMLInputElement>(null);

  const [payOpen, setPayOpen] = useState(false);
  const [method, setMethod] = useState<Method>("cash");
  const [tendered, setTendered] = useState(0);
  const [discount, setDiscount] = useState(0);
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [reference, setReference] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [receipt, setReceipt] = useState<any | null>(null);

  const results = useQuery(
    api.products.quickSearch,
    term.trim().length > 1 ? { term, includeUnpublished: true } : "skip",
  );
  const summary = useQuery(api.analytics.registerSummary);
  const recordSale = useMutation(api.orders.recordWalkInSale);

  const subtotal = cartSubtotal(lines);
  const total = Math.max(0, subtotal - discount);
  const change = method === "cash" ? Math.max(0, tendered - total) : 0;

  // The counter is used at speed, so the search box takes focus back after
  // every action and a barcode scanner can just type into it.
  useEffect(() => {
    searchRef.current?.focus();
  }, [lines.length]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "F2" && lines.length > 0) {
        e.preventDefault();
        setTendered(total);
        setPayOpen(true);
      }
      if (e.key === "Escape" && !payOpen) searchRef.current?.focus();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [lines.length, total, payOpen]);

  if (me === undefined) return <Spinner className="min-h-screen" />;
  if (me === null || !me.capabilities.useRegister) {
    return (
      <div className="flex min-h-screen items-center justify-center px-4 text-center">
        <div className="max-w-sm">
          <h1 className="font-display text-[26px] text-ink">The register is not open to you</h1>
          <p className="mt-2 text-[15px] text-muted">
            Ask an admin for a cashier or manager role, then reload this page.
          </p>
          <Button className="mt-5" onClick={() => void signOut()}>Sign out</Button>
        </div>
      </div>
    );
  }

  function addProduct(product: any) {
    if (product.stock <= 0) {
      notify(`${product.title} is out of stock.`, "bad");
      return;
    }
    add({
      productId: product._id,
      title: product.title,
      author: product.author,
      slug: product.slug,
      price: product.price,
      imageUrl: product.coverImage,
      kind: product.kind,
      maxStock: product.stock,
    });
    setTerm("");
    searchRef.current?.focus();
  }

  async function complete() {
    setBusy(true);
    setError(null);
    try {
      const result = await recordSale({
        cart: lines.map((l) => ({ productId: l.productId, quantity: l.quantity })),
        customerName: customerName.trim() || undefined,
        customerPhone: customerPhone.trim() && isValidPhone(customerPhone) ? customerPhone.trim() : undefined,
        paymentMethod: method,
        amountTendered: method === "cash" ? tendered : undefined,
        discount: discount || undefined,
        reference: reference.trim() || undefined,
      });

      setReceipt({
        ...result,
        items: lines,
        method,
        tendered,
        discount,
        subtotal,
        at: Date.now(),
        cashier: me!.name,
      });

      clear();
      setPayOpen(false);
      setDiscount(0);
      setTendered(0);
      setCustomerName("");
      setCustomerPhone("");
      setReference("");
      notify(`Sale ${result.orderNumber} rung up.`, "good");
    } catch (err) {
      setError(err instanceof Error ? err.message : "That sale did not go through.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col bg-surface lg:h-screen lg:flex-row lg:overflow-hidden">
      {/* Left: finding things */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-14 shrink-0 items-center gap-3 border-b border-rule bg-white px-4">
          <span className="font-display text-[18px] text-ink">
            Aperio<span className="text-brass"> Vici</span>
            <span className="ml-2 text-[13px] font-sans text-muted">Counter</span>
          </span>
          <div className="ml-auto flex items-center gap-1">
            {me.capabilities.viewDashboard && (
              <Link
                href="/admin"
                className="flex items-center gap-1.5 rounded-[var(--radius-control)] px-2.5 py-1.5 text-[13px] text-muted hover:bg-surface hover:text-ink"
              >
                <LayoutDashboard className="h-4 w-4" aria-hidden />
                <span className="hidden sm:inline">Dashboard</span>
              </Link>
            )}
            <button
              onClick={() => void signOut()}
              className="rounded-[var(--radius-control)] px-2.5 py-1.5 text-[13px] text-muted hover:bg-surface hover:text-ink"
            >
              Sign out
            </button>
          </div>
        </header>

        <div className="shrink-0 border-b border-rule bg-white px-4 py-3">
          <div className="relative">
            <ScanBarcode className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted" aria-hidden />
            <input
              ref={searchRef}
              value={term}
              onChange={(e) => setTerm(e.target.value)}
              placeholder="Scan a barcode, or type a title"
              aria-label="Find a product"
              className="h-14 w-full rounded-[var(--radius-control)] border border-rule-strong bg-white pl-12 pr-4
                         text-[17px] text-ink placeholder:text-faint focus:border-ink focus:outline-none focus:ring-2 focus:ring-brass/35"
            />
            {term && (
              <button
                onClick={() => { setTerm(""); searchRef.current?.focus(); }}
                className="absolute right-3 top-1/2 -translate-y-1/2 rounded p-1 text-muted hover:text-ink"
                aria-label="Clear"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
          <p className="mt-2 text-[12.5px] text-muted">
            <kbd className="rounded border border-rule bg-surface px-1.5 py-0.5 text-[11px]">F2</kbd> to
            take payment · <kbd className="rounded border border-rule bg-surface px-1.5 py-0.5 text-[11px]">Esc</kbd> back to search
          </p>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-4">
          {term.trim().length > 1 ? (
            results === undefined ? (
              <Spinner />
            ) : results.length === 0 ? (
              <EmptyState
                icon={Search}
                title={`Nothing matches “${term}”`}
                description="Try fewer words, or the author's surname. Check it is not archived in inventory."
              />
            ) : (
              <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
                {results.map((product) => (
                  <button
                    key={product._id}
                    onClick={() => addProduct(product)}
                    disabled={product.stock <= 0}
                    className={cn(
                      "flex items-center gap-3 rounded-[var(--radius-sheet)] border bg-white p-3 text-left transition",
                      product.stock <= 0
                        ? "border-rule opacity-55"
                        : "border-rule hover:border-ink hover:shadow-[var(--shadow-drop)]",
                    )}
                  >
                    <span className="h-16 w-11 shrink-0 overflow-hidden rounded-[2px] border border-rule">
                      <BookCover title={product.title} kind={product.kind} imageUrl={product.coverImage} compact />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[14.5px] text-ink">{product.title}</span>
                      {product.author && (
                        <span className="block truncate text-[12.5px] text-muted">{product.author}</span>
                      )}
                      <span className="ref block text-[11.5px] text-faint">{product.sku}</span>
                    </span>
                    <span className="shrink-0 text-right">
                      <span className="figure block text-[15px] font-semibold text-ink">
                        {formatNaira(product.price)}
                      </span>
                      <span
                        className={cn(
                          "figure block text-[12px]",
                          product.stock <= 0 ? "text-flag" : "text-muted",
                        )}
                      >
                        {product.stock <= 0 ? "Out" : `${product.stock} left`}
                      </span>
                    </span>
                  </button>
                ))}
              </div>
            )
          ) : (
            <div className="mx-auto max-w-md pt-6">
              {summary && (
                <div className="rounded-[var(--radius-sheet)] border border-rule bg-white p-5">
                  <h2 className="font-display text-[19px] text-ink">Your till so far today</h2>
                  <p className="figure mt-3 font-display text-[34px] leading-none text-ink">
                    {formatNaira(summary.total)}
                  </p>
                  <p className="mt-1 text-[13.5px] text-muted">
                    {summary.saleCount} {summary.saleCount === 1 ? "sale" : "sales"} rung up by{" "}
                    {summary.staffName}
                  </p>

                  <dl className="mt-4 space-y-1.5 border-t border-rule pt-3 text-[14px]">
                    <div className="flex justify-between"><dt className="text-muted">Cash</dt><dd className="figure">{formatNaira(summary.cash)}</dd></div>
                    <div className="flex justify-between"><dt className="text-muted">Card</dt><dd className="figure">{formatNaira(summary.card)}</dd></div>
                    <div className="flex justify-between"><dt className="text-muted">Transfer</dt><dd className="figure">{formatNaira(summary.transfer)}</dd></div>
                  </dl>

                  {summary.lastSales.length > 0 && (
                    <div className="mt-4 border-t border-rule pt-3">
                      <p className="text-[13px] text-muted">Last few</p>
                      <ul className="mt-1.5 space-y-1">
                        {summary.lastSales.map((sale) => (
                          <li key={sale._id} className="flex justify-between text-[13.5px]">
                            <span className="ref text-ink-soft">{sale.orderNumber}</span>
                            <span className="figure text-muted">{formatNaira(sale.total)}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
              <p className="mt-5 text-center text-[14px] text-muted">
                Start typing above to ring up the next customer.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Right: the ticket */}
      <aside className="flex w-full shrink-0 flex-col border-t border-rule bg-white lg:w-[400px] lg:border-l lg:border-t-0">
        <div className="flex h-14 shrink-0 items-center justify-between border-b border-rule px-4">
          <h2 className="font-display text-[19px] text-ink">
            Current sale
            {lines.length > 0 && <span className="figure ml-1.5 text-muted">({cartCount(lines)})</span>}
          </h2>
          {lines.length > 0 && (
            <button
              onClick={() => { if (confirm("Clear this sale?")) clear(); }}
              className="flex items-center gap-1.5 text-[13px] text-muted hover:text-flag"
            >
              <Trash2 className="h-3.5 w-3.5" aria-hidden />
              Clear
            </button>
          )}
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto">
          {lines.length === 0 ? (
            <EmptyState
              icon={ShoppingBag}
              title="Nothing on the ticket"
              description="Scan or search for what the customer is buying and it lands here."
            />
          ) : (
            lines.map((line) => (
              <div key={line.productId} className="border-b border-rule px-4 py-3">
                <div className="flex items-start justify-between gap-2">
                  <p className="min-w-0 flex-1 text-[14.5px] leading-snug text-ink">{line.title}</p>
                  <button
                    onClick={() => remove(line.productId)}
                    className="shrink-0 rounded p-0.5 text-faint hover:text-flag"
                    aria-label={`Remove ${line.title}`}
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
                <div className="mt-2 flex items-center justify-between">
                  <div className="flex items-center rounded-[var(--radius-control)] border border-rule">
                    <button
                      onClick={() => setQuantity(line.productId, line.quantity - 1)}
                      className="flex h-9 w-9 items-center justify-center text-muted hover:text-ink"
                      aria-label="One fewer"
                    >
                      <Minus className="h-4 w-4" />
                    </button>
                    <span className="figure w-8 text-center text-[15px]">{line.quantity}</span>
                    <button
                      onClick={() => setQuantity(line.productId, line.quantity + 1)}
                      disabled={line.quantity >= line.maxStock}
                      className="flex h-9 w-9 items-center justify-center text-muted hover:text-ink disabled:text-rule-strong"
                      aria-label="One more"
                    >
                      <Plus className="h-4 w-4" />
                    </button>
                  </div>
                  <span className="figure text-[15px] font-semibold text-ink">
                    {formatNaira(line.price * line.quantity)}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="shrink-0 border-t border-rule px-4 py-4">
          <div className="space-y-1.5 text-[14px]">
            <div className="flex justify-between">
              <span className="text-muted">Subtotal</span>
              <span className="figure text-ink">{formatNaira(subtotal)}</span>
            </div>
            {discount > 0 && (
              <div className="flex justify-between text-leaf">
                <span>Discount</span>
                <span className="figure">−{formatNaira(discount)}</span>
              </div>
            )}
            <div className="flex items-baseline justify-between border-t border-rule pt-2">
              <span className="text-[15px] font-medium text-ink">Total</span>
              <span className="figure font-display text-[30px] leading-none text-ink">
                {formatNaira(total)}
              </span>
            </div>
          </div>

          <Button
            size="lg"
            fullWidth
            variant="brass"
            className="mt-4 h-14 text-[16px]"
            disabled={lines.length === 0}
            onClick={() => { setTendered(total); setPayOpen(true); }}
          >
            Take payment
          </Button>
        </div>
      </aside>

      <Modal
        open={payOpen}
        onClose={() => setPayOpen(false)}
        title="Take payment"
        description={`${cartCount(lines)} ${cartCount(lines) === 1 ? "item" : "items"} · ${formatNaira(total)}`}
      >
        <div className="space-y-5">
          <div className="grid grid-cols-3 gap-2">
            {([
              { value: "cash" as const, label: "Cash", icon: Banknote },
              { value: "pos_terminal" as const, label: "Card", icon: CreditCard },
              { value: "bank_transfer" as const, label: "Transfer", icon: Landmark },
            ]).map((option) => (
              <button
                key={option.value}
                onClick={() => setMethod(option.value)}
                className={cn(
                  "flex flex-col items-center gap-1.5 rounded-[var(--radius-sheet)] border py-3 transition",
                  method === option.value
                    ? "border-ink bg-surface ring-1 ring-ink"
                    : "border-rule text-muted hover:border-rule-strong",
                )}
              >
                <option.icon className={cn("h-5 w-5", method === option.value && "text-brass-deep")} aria-hidden />
                <span className="text-[13.5px] font-medium text-ink">{option.label}</span>
              </button>
            ))}
          </div>

          <Field label="Discount" hint="Optional. Staff price, damaged copy, a haggle.">
            <NairaInput valueKobo={discount} onChangeKobo={(v) => setDiscount(Math.min(v, subtotal))} />
          </Field>

          {method === "cash" && (
            <div>
              <Field label="Cash received" required>
                <NairaInput valueKobo={tendered} onChangeKobo={setTendered} className="h-14 text-[20px]" />
              </Field>
              <div className="mt-2 flex flex-wrap gap-1.5">
                <button
                  onClick={() => setTendered(total)}
                  className="rounded-[var(--radius-pill)] border border-rule px-3 py-1 text-[13px] text-muted hover:border-ink hover:text-ink"
                >
                  Exact
                </button>
                {QUICK_CASH.map((naira) => (
                  <button
                    key={naira}
                    onClick={() => setTendered((t) => t + naira * 100)}
                    className="figure rounded-[var(--radius-pill)] border border-rule px-3 py-1 text-[13px] text-muted hover:border-ink hover:text-ink"
                  >
                    +₦{naira.toLocaleString("en-NG")}
                  </button>
                ))}
              </div>

              <div
                className={cn(
                  "mt-4 flex items-baseline justify-between rounded-[var(--radius-sheet)] px-4 py-3",
                  tendered < total ? "bg-flag-soft" : "bg-leaf-soft",
                )}
              >
                <span className={cn("text-[14px] font-medium", tendered < total ? "text-flag" : "text-leaf")}>
                  {tendered < total ? "Still owing" : "Change to give"}
                </span>
                <span
                  className={cn(
                    "figure font-display text-[28px] leading-none",
                    tendered < total ? "text-flag" : "text-leaf",
                  )}
                >
                  {formatNaira(tendered < total ? total - tendered : change)}
                </span>
              </div>
            </div>
          )}

          {method !== "cash" && (
            <Field
              label={method === "pos_terminal" ? "POS receipt number" : "Transfer reference"}
              hint="Optional, but it makes the end-of-day reconciliation much easier."
            >
              <Input value={reference} onChange={(e) => setReference(e.target.value)} className="figure" />
            </Field>
          )}

          <details className="rounded-[var(--radius-sheet)] border border-rule px-4 py-3">
            <summary className="cursor-pointer text-[14px] text-ink-soft">
              Add the customer&apos;s details
            </summary>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <Field label="Name">
                <Input value={customerName} onChange={(e) => setCustomerName(e.target.value)} placeholder="Walk-in customer" />
              </Field>
              <Field label="Phone" hint="Links this sale to their record.">
                <Input
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  placeholder="0803 123 4567"
                  inputMode="tel"
                  className="figure"
                />
              </Field>
            </div>
          </details>

          {error && <Alert tone="bad">{error}</Alert>}

          <Button
            size="lg"
            fullWidth
            className="h-14 text-[16px]"
            loading={busy}
            disabled={method === "cash" && tendered < total}
            onClick={complete}
          >
            Complete sale · {formatNaira(total)}
          </Button>
        </div>
      </Modal>

      <Modal
        open={!!receipt}
        onClose={() => setReceipt(null)}
        title="Sale complete"
        description={receipt ? `${receipt.orderNumber} · ${formatDateTime(receipt.at)}` : ""}
      >
        {receipt && (
          <div className="space-y-5">
            {receipt.method === "cash" && receipt.tendered > receipt.total && (
              <div className="rounded-[var(--radius-sheet)] bg-leaf-soft px-4 py-4 text-center">
                <p className="text-[14px] text-leaf">Change to give the customer</p>
                <p className="figure font-display text-[40px] leading-none text-leaf">
                  {formatNaira(receipt.tendered - receipt.total)}
                </p>
              </div>
            )}

            <div className="rounded-[var(--radius-sheet)] border border-rule">
              {receipt.items.map((item: any) => (
                <div key={item.productId} className="flex justify-between gap-3 border-b border-rule px-4 py-2 text-[14px] last:border-0">
                  <span className="min-w-0 truncate text-ink">{item.title}</span>
                  <span className="figure shrink-0 text-muted">
                    {item.quantity} × {formatNaira(item.price)}
                  </span>
                </div>
              ))}
              <div className="flex justify-between border-t border-rule bg-surface px-4 py-2.5 text-[15px] font-medium">
                <span>Paid by {receipt.method.replace("_", " ")}</span>
                <span className="figure">{formatNaira(receipt.total)}</span>
              </div>
            </div>

            <div className="flex gap-2">
              <Button variant="secondary" fullWidth onClick={() => window.print()}>
                <Receipt className="h-4 w-4" />
                Print receipt
              </Button>
              <Button
                fullWidth
                onClick={() => {
                  setReceipt(null);
                  searchRef.current?.focus();
                }}
              >
                Next customer
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
