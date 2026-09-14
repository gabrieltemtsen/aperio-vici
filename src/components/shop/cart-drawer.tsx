"use client";

import Link from "next/link";
import { useEffect } from "react";
import { useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import { useCart, cartSubtotal, cartCount } from "@/lib/cart-store";
import { formatNaira } from "@/lib/format";
import { BookCover } from "./book-cover";
import { buttonStyles } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/primitives";
import { X, Minus, Plus, Trash2, ShoppingBag, Sparkles, Lock, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

export function CartDrawer() {
  const { lines, isOpen, close, setQuantity, remove } = useCart();
  const settings = useQuery(api.settings.get);

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
  const freeThreshold = settings?.freeDeliveryThreshold ?? 0;
  const progressPercent = freeThreshold > 0 ? Math.min(100, Math.round((subtotal / freeThreshold) * 100)) : 100;
  const amountToFree = freeThreshold > 0 ? Math.max(0, freeThreshold - subtotal) : 0;

  return (
    <div className="fixed inset-0 z-50 animate-in fade-in duration-200">
      <div className="absolute inset-0 bg-ink-deep/50 backdrop-blur-sm transition-opacity" onClick={close} aria-hidden />
      <aside
        role="dialog"
        aria-label="Your basket"
        className="absolute inset-y-0 right-0 flex w-full max-w-md flex-col bg-white shadow-[var(--shadow-lift)] animate-in slide-in-from-right duration-300"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-rule px-5 py-4">
          <h2 className="font-display text-[20px] text-ink">
            Your basket{count > 0 && <span className="figure font-sans text-muted text-[15px] ml-1.5">({count})</span>}
          </h2>
          <button onClick={close} aria-label="Close basket" className="rounded-lg p-2 text-muted transition hover:bg-surface hover:text-ink active:scale-95">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Free delivery tracker */}
        {freeThreshold > 0 && lines.length > 0 && (
          <div className="border-b border-rule bg-gradient-to-r from-surface/60 to-white px-5 py-3.5">
            <div className="flex items-center justify-between text-[12.5px]">
              {amountToFree === 0 ? (
                <span className="flex items-center gap-1.5 font-bold text-leaf">
                  <Sparkles className="h-3.5 w-3.5" />
                  Unlocked: Free nationwide delivery!
                </span>
              ) : (
                <span className="text-ink-soft">
                  Add <span className="font-bold text-brass-deep">{formatNaira(amountToFree)}</span> for free delivery
                </span>
              )}
              <span className="figure text-[11.5px] font-semibold text-muted">{progressPercent}%</span>
            </div>
            <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-rule/70">
              <div
                className={cn(
                  "h-full rounded-full transition-all duration-700 ease-out",
                  progressPercent >= 100
                    ? "bg-gradient-to-r from-leaf to-leaf/80"
                    : "bg-gradient-to-r from-brass to-brass-deep",
                )}
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>
        )}

        {lines.length === 0 ? (
          <EmptyState
            icon={ShoppingBag}
            title="Nothing in here yet"
            description="Browse the shelves and add something you would actually read."
            action={
              <Link
                href="/shop"
                onClick={close}
                className={buttonStyles({ variant: "secondary", className: "flex items-center gap-2" })}
              >
                Start browsing <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            }
          />
        ) : (
          <>
            <div className="flex-1 overflow-y-auto px-5">
              {lines.map((line) => (
                <div key={line.productId} className="flex gap-3.5 border-b border-rule/70 py-4 last:border-0">
                  <Link href={`/product/${line.slug}`} onClick={close} className="h-24 w-16 shrink-0 overflow-hidden rounded-lg border border-rule/60 shadow-[var(--shadow-xs)]">
                    <BookCover title={line.title} kind={line.kind} imageUrl={line.imageUrl} compact />
                  </Link>

                  <div className="flex min-w-0 flex-1 flex-col">
                    <Link href={`/product/${line.slug}`} onClick={close} className="font-display text-[15px] leading-tight text-ink hover:text-brass-deep transition-colors">
                      {line.title}
                    </Link>
                    {line.author && <p className="text-[12.5px] text-muted mt-0.5">{line.author}</p>}

                    <div className="mt-auto flex items-center justify-between pt-2.5">
                      <div className="flex items-center rounded-lg border border-rule/80 bg-surface/50 shadow-[var(--shadow-xs)]">
                        <button
                          onClick={() => setQuantity(line.productId, line.quantity - 1)}
                          aria-label={`Reduce quantity of ${line.title}`}
                          className="flex h-8 w-8 items-center justify-center text-muted hover:text-ink transition-colors rounded-l-lg hover:bg-surface"
                        >
                          {line.quantity === 1 ? <Trash2 className="h-3.5 w-3.5" /> : <Minus className="h-3.5 w-3.5" />}
                        </button>
                        <span className="figure w-7 text-center text-[14px] font-semibold">{line.quantity}</span>
                        <button
                          onClick={() => setQuantity(line.productId, line.quantity + 1)}
                          disabled={line.quantity >= line.maxStock}
                          aria-label={`Increase quantity of ${line.title}`}
                          className="flex h-8 w-8 items-center justify-center text-muted hover:text-ink transition-colors disabled:text-rule-strong rounded-r-lg hover:bg-surface"
                        >
                          <Plus className="h-3.5 w-3.5" />
                        </button>
                      </div>
                      <span className="figure text-[14.5px] font-bold text-ink">
                        {formatNaira(line.price * line.quantity)}
                      </span>
                    </div>
                    {line.quantity >= line.maxStock && (
                      <p className="pt-1 text-[12px] text-amber font-medium">
                        That is all {line.maxStock} we have.
                      </p>
                    )}
                  </div>

                  <button
                    onClick={() => remove(line.productId)}
                    aria-label={`Remove ${line.title}`}
                    className="self-start rounded-lg p-1.5 text-faint hover:text-flag hover:bg-flag-soft/50 transition-colors"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>

            <div className="border-t border-rule bg-gradient-to-b from-surface/40 to-white px-5 py-5">
              <div className="flex items-baseline justify-between">
                <span className="text-[14px] text-muted font-medium">Subtotal</span>
                <span className="figure font-display text-[24px] font-semibold text-ink">{formatNaira(subtotal)}</span>
              </div>
              <p className="mt-1.5 text-[12px] text-muted">
                Delivery fee calculated at checkout based on your state.
              </p>
              <Link
                href="/checkout"
                onClick={close}
                className={buttonStyles({
                  size: "lg",
                  fullWidth: true,
                  variant: "brass",
                  className: "mt-4 flex items-center justify-center gap-2.5 shadow-[var(--shadow-lift)] gradient-shine",
                })}
              >
                <Lock className="h-4 w-4" />
                Proceed to Checkout ({formatNaira(subtotal)})
              </Link>
              <p className="mt-3 text-center text-[11.5px] text-muted">
                🛡️ Items are safely reserved the moment your order is placed
              </p>
            </div>
          </>
        )}
      </aside>
    </div>
  );
}
