"use client";

import Link from "next/link";
import { useEffect } from "react";
import { useCart, cartSubtotal, cartCount } from "@/lib/cart-store";
import { formatNaira } from "@/lib/format";
import { BookCover } from "./book-cover";
import { buttonStyles } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/primitives";
import { X, Minus, Plus, Trash2, ShoppingBag } from "lucide-react";

export function CartDrawer() {
  const { lines, isOpen, close, setQuantity, remove } = useCart();

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && close();
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [isOpen, close]);

  if (!isOpen) return null;

  const subtotal = cartSubtotal(lines);
  const count = cartCount(lines);

  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-ink-deep/45" onClick={close} aria-hidden />
      <aside
        role="dialog"
        aria-label="Your basket"
        className="absolute inset-y-0 right-0 flex w-full max-w-md flex-col bg-white shadow-[var(--shadow-lift)]"
      >
        <div className="flex items-center justify-between border-b border-rule px-5 py-4">
          <h2 className="font-display text-[20px] text-ink">
            Your basket{count > 0 && <span className="figure text-muted"> ({count})</span>}
          </h2>
          <button onClick={close} aria-label="Close basket" className="rounded p-1 text-muted hover:bg-surface hover:text-ink">
            <X className="h-5 w-5" />
          </button>
        </div>

        {lines.length === 0 ? (
          <EmptyState
            icon={ShoppingBag}
            title="Nothing in here yet"
            description="Browse the shelves and add something you would actually read."
            action={
              <Link
                href="/shop"
                onClick={close}
                className={buttonStyles({ variant: "secondary" })}
              >
                Start browsing
              </Link>
            }
          />
        ) : (
          <>
            <div className="flex-1 overflow-y-auto px-5">
              {lines.map((line) => (
                <div key={line.productId} className="flex gap-3 border-b border-rule py-4 last:border-0">
                  <Link href={`/product/${line.slug}`} onClick={close} className="h-24 w-16 shrink-0 overflow-hidden rounded-[2px] border border-rule">
                    <BookCover title={line.title} kind={line.kind} imageUrl={line.imageUrl} compact />
                  </Link>

                  <div className="flex min-w-0 flex-1 flex-col">
                    <Link href={`/product/${line.slug}`} onClick={close} className="font-display text-[15px] leading-tight text-ink hover:text-brass-deep">
                      {line.title}
                    </Link>
                    {line.author && <p className="text-[12.5px] text-muted">{line.author}</p>}

                    <div className="mt-auto flex items-center justify-between pt-2">
                      <div className="flex items-center rounded-[var(--radius-control)] border border-rule">
                        <button
                          onClick={() => setQuantity(line.productId, line.quantity - 1)}
                          aria-label={`Reduce quantity of ${line.title}`}
                          className="flex h-8 w-8 items-center justify-center text-muted hover:text-ink"
                        >
                          {line.quantity === 1 ? <Trash2 className="h-3.5 w-3.5" /> : <Minus className="h-3.5 w-3.5" />}
                        </button>
                        <span className="figure w-7 text-center text-[14px]">{line.quantity}</span>
                        <button
                          onClick={() => setQuantity(line.productId, line.quantity + 1)}
                          disabled={line.quantity >= line.maxStock}
                          aria-label={`Increase quantity of ${line.title}`}
                          className="flex h-8 w-8 items-center justify-center text-muted hover:text-ink disabled:text-rule-strong"
                        >
                          <Plus className="h-3.5 w-3.5" />
                        </button>
                      </div>
                      <span className="figure text-[14px] font-semibold text-ink">
                        {formatNaira(line.price * line.quantity)}
                      </span>
                    </div>
                    {line.quantity >= line.maxStock && (
                      <p className="pt-1 text-[12px] text-amber">
                        That is all {line.maxStock} we have.
                      </p>
                    )}
                  </div>

                  <button
                    onClick={() => remove(line.productId)}
                    aria-label={`Remove ${line.title}`}
                    className="self-start rounded p-1 text-faint hover:text-flag"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>

            <div className="border-t border-rule px-5 py-4">
              <div className="flex items-baseline justify-between">
                <span className="text-[14px] text-muted">Subtotal</span>
                <span className="figure font-display text-[22px] text-ink">{formatNaira(subtotal)}</span>
              </div>
              <p className="mt-1 text-[12.5px] text-muted">
                Delivery is added at checkout once we know your state.
              </p>
              <Link
                href="/checkout"
                onClick={close}
                className={buttonStyles({ size: "lg", fullWidth: true, className: "mt-4" })}
              >
                Checkout
              </Link>
              <button onClick={close} className="mt-2 w-full py-2 text-[13.5px] text-muted hover:text-ink">
                Keep browsing
              </button>
            </div>
          </>
        )}
      </aside>
    </div>
  );
}
