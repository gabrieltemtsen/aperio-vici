"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useRef, useEffect } from "react";
import { useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import { useCart, cartCount } from "@/lib/cart-store";
import { formatNaira } from "@/lib/format";
import { cn } from "@/lib/utils";
import { BookCover } from "./book-cover";
import { Search, ShoppingBag, Menu, X } from "lucide-react";

const NAV = [
  { href: "/shop?kind=book", label: "Books" },
  { href: "/shop?kind=gift", label: "Gifts" },
  { href: "/shop", label: "Everything" },
  { href: "/track", label: "Track an order" },
];

export function SiteHeader() {
  const router = useRouter();
  const lines = useCart((s) => s.lines);
  const openCart = useCart((s) => s.open);
  const [term, setTerm] = useState("");
  const [focused, setFocused] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => setMounted(true), []);

  const suggestions = useQuery(
    api.products.quickSearch,
    term.trim().length > 1 ? { term } : "skip",
  );

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setFocused(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const count = mounted ? cartCount(lines) : 0;
  const showSuggestions = focused && term.trim().length > 1;

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!term.trim()) return;
    setFocused(false);
    router.push(`/shop?q=${encodeURIComponent(term.trim())}`);
  }

  return (
    <>
      {/* Top Announcement Bar */}
      <div className="border-b border-white/10 bg-ink-deep px-4 py-2 text-center text-[12.5px] font-medium text-white/85 sm:px-6">
        <div className="mx-auto flex max-w-[1240px] items-center justify-center gap-2">
          <span className="hidden sm:inline">✨</span>
          <span>Nationwide delivery across Nigeria</span>
          <span className="opacity-40">·</span>
          <span>Verified bank transfer</span>
          <span className="hidden opacity-40 md:inline">·</span>
          <span className="hidden md:inline">Walk-in counter in Lagos</span>
        </div>
      </div>

      <header className="sticky top-0 z-40 border-b border-rule/80 bg-white/90 backdrop-blur-md transition-shadow">
        <div className="mx-auto flex h-16 max-w-[1240px] items-center gap-3 px-4 sm:gap-6 sm:px-6">
          <button
            className="-ml-2 rounded-md p-2 text-ink transition hover:bg-surface active:scale-95 lg:hidden"
            onClick={() => setMenuOpen((v) => !v)}
            aria-label={menuOpen ? "Close menu" : "Open menu"}
            aria-expanded={menuOpen}
          >
            {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>

          <Link href="/" className="group flex shrink-0 items-center gap-2">
            <span className="font-display text-[21px] leading-none tracking-[-0.02em] text-ink transition group-hover:opacity-90 sm:text-[23px]">
              Aperio
              <span className="font-semibold text-brass transition-colors group-hover:text-brass-deep"> Vici</span>
            </span>
          </Link>

          <div ref={boxRef} className="relative ml-auto hidden max-w-md flex-1 lg:block">
            <form onSubmit={submit}>
              <Search
                className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted"
                aria-hidden
              />
              <input
                value={term}
                onChange={(e) => setTerm(e.target.value)}
                onFocus={() => setFocused(true)}
                placeholder="Search by title, author or ISBN…"
                aria-label="Search the shop"
                className="h-10 w-full rounded-[var(--radius-control)] border border-rule/80 bg-surface/70 pl-10 pr-4 text-[14px]
                           transition-all placeholder:text-faint hover:bg-surface focus:border-brass/80 focus:bg-white
                           focus:outline-none focus:ring-3 focus:ring-brass/20"
              />
            </form>

            {showSuggestions && (
              <div className="absolute left-0 right-0 top-12 overflow-hidden rounded-[var(--radius-sheet)] border border-rule bg-white shadow-[var(--shadow-lift)] z-50">
                <div className="border-b border-rule/50 bg-surface/40 px-3 py-1.5 text-[11px] font-medium text-muted">
                  Quick Search Results
                </div>
                {suggestions === undefined ? (
                  <p className="px-4 py-3 text-[13px] text-muted">Searching the shelves…</p>
                ) : suggestions.length === 0 ? (
                  <div className="px-4 py-4 text-center">
                    <p className="text-[13px] text-muted">
                      Nothing matches “{term}”.
                    </p>
                    <p className="mt-1 text-[12px] text-faint">Try searching for the author's surname or a keyword.</p>
                  </div>
                ) : (
                  <div className="max-h-[340px] overflow-y-auto divide-y divide-rule/60">
                    {suggestions.map((product) => (
                      <Link
                        key={product._id}
                        href={`/product/${product.slug}`}
                        onClick={() => setFocused(false)}
                        className="flex items-center gap-3 px-3 py-2.5 transition hover:bg-surface/80"
                      >
                        <span className="h-12 w-9 shrink-0 overflow-hidden rounded-[2px] shadow-xs">
                          <BookCover
                            title={product.title}
                            kind={product.kind}
                            imageUrl={product.coverImage}
                            compact
                          />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-[14px] font-medium text-ink">{product.title}</span>
                          {product.author && (
                            <span className="block truncate text-[12.5px] text-muted">
                              {product.author}
                            </span>
                          )}
                        </span>
                        <div className="text-right shrink-0">
                          <span className="figure block text-[13.5px] font-semibold text-ink">
                            {formatNaira(product.price)}
                          </span>
                          <span className="text-[10.5px] uppercase tracking-wider text-muted">
                            {product.kind}
                          </span>
                        </div>
                      </Link>
                    ))}
                    <button
                      onClick={submit}
                      className="w-full bg-surface/50 px-3 py-2 text-center text-[12.5px] font-medium text-brass-deep transition hover:bg-surface"
                    >
                      Press Enter to see all results for “{term}” →
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          <nav className="hidden items-center gap-6 lg:flex">
            {NAV.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="text-[14px] font-medium text-ink-soft transition-colors hover:text-brass-deep"
              >
                {item.label}
              </Link>
            ))}
          </nav>

          <div className="ml-auto flex items-center gap-2 lg:ml-0">
            <Link
              href="/shop"
              className="rounded-md p-2 text-ink transition hover:bg-surface lg:hidden"
              aria-label="Search the shop"
            >
              <Search className="h-5 w-5" />
            </Link>
            <button
              onClick={openCart}
              className="relative flex items-center gap-2 rounded-md p-2 text-ink transition hover:bg-surface active:scale-95"
              aria-label={`Basket, ${count} ${count === 1 ? "item" : "items"}`}
            >
              <ShoppingBag className="h-5 w-5" />
              {count > 0 && (
                <span className="figure absolute -right-1 -top-1 flex h-[19px] min-w-[19px] items-center justify-center rounded-full bg-gradient-to-r from-brass to-brass-deep px-1 text-[11px] font-bold text-white shadow-sm ring-2 ring-white">
                  {count}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Mobile Navigation Drawer */}
        {menuOpen && (
          <div className="border-t border-rule/80 bg-white/95 backdrop-blur-md px-4 py-4 shadow-xl lg:hidden animate-in fade-in slide-in-from-top-2 duration-200">
            <div className="mb-4">
              <form onSubmit={(e) => { submit(e); setMenuOpen(false); }}>
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
                  <input
                    value={term}
                    onChange={(e) => setTerm(e.target.value)}
                    placeholder="Search titles, authors, ISBN…"
                    className="h-10 w-full rounded-[var(--radius-control)] border border-rule bg-surface pl-9 pr-3 text-[14px] focus:outline-none focus:ring-2 focus:ring-brass"
                  />
                </div>
              </form>
            </div>

            <nav className="space-y-1 divide-y divide-rule/50">
              <div className="pb-3 space-y-1">
                {NAV.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMenuOpen(false)}
                    className="flex items-center justify-between py-2 text-[15px] font-medium text-ink transition hover:text-brass-deep"
                  >
                    <span>{item.label}</span>
                    <span className="text-[12px] text-muted">→</span>
                  </Link>
                ))}
              </div>
              
              <div className="pt-3 text-[13px] text-muted space-y-1.5">
                <p className="font-semibold text-ink text-[12px] uppercase tracking-wider">Quick Help</p>
                <p>📍 Shop counter open in Lagos</p>
                <p>💳 Bank transfer verified within minutes</p>
                <Link
                  href="/track"
                  onClick={() => setMenuOpen(false)}
                  className="inline-block text-brass-deep font-medium hover:underline pt-1"
                >
                  Track an ongoing delivery →
                </Link>
              </div>
            </nav>
          </div>
        )}
      </header>
    </>
  );
}

export function SiteFooter({
  storeName,
  phone,
  email,
  address,
}: {
  storeName: string;
  phone: string;
  email: string;
  address: string;
}) {
  return (
    <footer className="mt-20 border-t border-rule bg-ink-deep text-white/80">
      <div className="mx-auto grid max-w-[1240px] gap-8 px-4 py-12 sm:px-6 md:grid-cols-4">
        <div className="md:col-span-2">
          <p className="font-display text-[22px] text-white">
            Aperio<span className="text-brass"> Vici</span>
          </p>
          <p className="mt-2 max-w-xs text-[14px] leading-relaxed">
            {storeName}. Order online and pay by transfer, or buy over the counter at the shop.
          </p>
        </div>
        <div>
          <p className="text-[14px] font-medium text-white">Shop</p>
          <ul className="mt-3 space-y-2 text-[14px]">
            <li><Link href="/shop?kind=book" className="hover:text-brass">Books</Link></li>
            <li><Link href="/shop?kind=gift" className="hover:text-brass">Gifts and hampers</Link></li>
            <li><Link href="/track" className="hover:text-brass">Track an order</Link></li>
          </ul>
        </div>
        <div>
          <p className="text-[14px] font-medium text-white">Reach us</p>
          <ul className="mt-3 space-y-2 text-[14px]">
            <li><a href={`tel:${phone.replace(/\s/g, "")}`} className="hover:text-brass">{phone}</a></li>
            <li><a href={`mailto:${email}`} className="hover:text-brass">{email}</a></li>
            <li className="leading-relaxed text-white/60">{address}</li>
          </ul>
        </div>
      </div>
      <div className="border-t border-white/10">
        <div className="mx-auto flex max-w-[1240px] flex-col gap-2 px-4 py-5 text-[13px] text-white/50 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <p>© {new Date().getFullYear()} {storeName}</p>
          <Link href="/signin" className="hover:text-brass">Staff sign in</Link>
        </div>
      </div>
    </footer>
  );
}

export function CartButtonSpacer({ className }: { className?: string }) {
  return <div className={cn("h-0", className)} />;
}
