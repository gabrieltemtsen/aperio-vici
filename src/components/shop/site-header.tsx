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
import { Search, ShoppingBag, Menu, X, Sparkles } from "lucide-react";

const NAV = [
  { href: "/shop?kind=book", label: "Books" },
  { href: "/shop?kind=gift", label: "Gifts" },
  { href: "/shop", label: "Everything" },
  { href: "/track", label: "Track an order" },
];

const ANNOUNCEMENTS = [
  "✨ Nationwide delivery across all 36 states & FCT",
  "💳 Secure bank transfer — verified within minutes",
  "📍 Walk-in counter open in Lagos",
  "🎁 Gift wrapping available on request",
];

export function SiteHeader() {
  const router = useRouter();
  const lines = useCart((s) => s.lines);
  const openCart = useCart((s) => s.open);
  const [term, setTerm] = useState("");
  const [focused, setFocused] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

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
      {/* Announcement Marquee Bar */}
      <div className="overflow-hidden border-b border-white/8 bg-ink-deep text-[12.5px] font-medium text-white/85">
        <div className="mx-auto max-w-[1240px] py-2 sm:py-2.5 relative">
          <div className="marquee-track whitespace-nowrap">
            {[...ANNOUNCEMENTS, ...ANNOUNCEMENTS].map((text, i) => (
              <span key={i} className="mx-6 sm:mx-10 inline-flex items-center gap-1.5">
                {text}
              </span>
            ))}
          </div>
        </div>
      </div>

      <header
        className={cn(
          "sticky top-0 z-40 transition-all duration-300",
          scrolled
            ? "glass border-b border-rule/60 shadow-[var(--shadow-drop)]"
            : "bg-white/95 backdrop-blur-md border-b border-rule/80",
        )}
      >
        <div className="mx-auto flex h-16 max-w-[1240px] items-center gap-3 px-4 sm:gap-6 sm:px-6">
          <button
            className="-ml-2 rounded-lg p-2 text-ink transition hover:bg-surface active:scale-95 lg:hidden"
            onClick={() => setMenuOpen((v) => !v)}
            aria-label={menuOpen ? "Close menu" : "Open menu"}
            aria-expanded={menuOpen}
          >
            {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>

          <Link href="/" className="group flex shrink-0 items-center gap-2">
            <span className="font-display text-[22px] leading-none tracking-[-0.02em] text-ink transition-opacity group-hover:opacity-90 sm:text-[24px]">
              Aperio
              <span className="foil-text font-semibold"> Vici</span>
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
                className={cn(
                  "h-10 w-full rounded-[var(--radius-control)] border bg-surface/70 pl-10 pr-4 text-[14px]",
                  "transition-all duration-300 placeholder:text-faint",
                  "hover:bg-surface",
                  focused
                    ? "border-brass/60 bg-white ring-[3px] ring-brass/15 shadow-[var(--shadow-glow-brass)]"
                    : "border-rule/80 focus:border-brass/60 focus:bg-white focus:ring-[3px] focus:ring-brass/15",
                  "focus:outline-none",
                )}
              />
            </form>

            {showSuggestions && (
              <div className="absolute left-0 right-0 top-12 overflow-hidden rounded-xl border border-rule bg-white shadow-[var(--shadow-lift)] z-50 scale-in">
                <div className="border-b border-rule/50 bg-surface/40 px-3.5 py-2 text-[11px] font-semibold uppercase tracking-wider text-muted">
                  Quick Results
                </div>
                {suggestions === undefined ? (
                  <p className="px-4 py-3.5 text-[13px] text-muted">Searching the shelves…</p>
                ) : suggestions.length === 0 ? (
                  <div className="px-4 py-5 text-center">
                    <p className="text-[13px] text-muted">
                      Nothing matches &ldquo;{term}&rdquo;.
                    </p>
                    <p className="mt-1 text-[12px] text-faint">Try searching for the author&apos;s surname or a keyword.</p>
                  </div>
                ) : (
                  <div className="max-h-[360px] overflow-y-auto divide-y divide-rule/50">
                    {suggestions.map((product) => (
                      <Link
                        key={product._id}
                        href={`/product/${product.slug}`}
                        onClick={() => setFocused(false)}
                        className="flex items-center gap-3 px-3.5 py-3 transition-colors hover:bg-surface/70"
                      >
                        <span className="h-12 w-9 shrink-0 overflow-hidden rounded-[3px] shadow-[var(--shadow-xs)]">
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
                          <span className="text-[10.5px] uppercase tracking-wider text-faint">
                            {product.kind}
                          </span>
                        </div>
                      </Link>
                    ))}
                    <button
                      onClick={submit}
                      className="w-full bg-surface/40 px-3.5 py-2.5 text-center text-[12.5px] font-semibold text-brass-deep transition hover:bg-surface"
                    >
                      See all results for &ldquo;{term}&rdquo; →
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          <nav className="hidden items-center gap-1 lg:flex">
            {NAV.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="nav-link px-3 py-1.5"
              >
                {item.label}
              </Link>
            ))}
          </nav>

          <div className="ml-auto flex items-center gap-1.5 lg:ml-0">
            <Link
              href="/shop"
              className="rounded-lg p-2.5 text-ink transition hover:bg-surface lg:hidden"
              aria-label="Search the shop"
            >
              <Search className="h-5 w-5" />
            </Link>
            <button
              onClick={openCart}
              className="relative flex items-center gap-2 rounded-lg p-2.5 text-ink transition hover:bg-surface active:scale-95"
              aria-label={`Basket, ${count} ${count === 1 ? "item" : "items"}`}
            >
              <ShoppingBag className="h-5 w-5" />
              {count > 0 && (
                <span className="figure absolute -right-0.5 -top-0.5 flex h-[20px] min-w-[20px] items-center justify-center rounded-full gradient-brass px-1 text-[11px] font-bold text-white shadow-sm ring-2 ring-white pop-in">
                  {count}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Mobile Navigation Drawer */}
        {menuOpen && (
          <div className="border-t border-rule/60 bg-white px-4 py-5 shadow-[var(--shadow-lift)] lg:hidden">
            <div className="mb-5 rise">
              <form onSubmit={(e) => { submit(e); setMenuOpen(false); }}>
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
                  <input
                    value={term}
                    onChange={(e) => setTerm(e.target.value)}
                    placeholder="Search titles, authors, ISBN…"
                    autoFocus
                    className="h-11 w-full rounded-[var(--radius-control)] border border-rule bg-surface pl-10 pr-3 text-[14px] focus:outline-none focus:ring-2 focus:ring-brass/30 focus:border-brass/50"
                  />
                </div>
              </form>
            </div>

            <nav className="space-y-1">
              <div className="space-y-0.5">
                {NAV.map((item, i) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMenuOpen(false)}
                    className={cn(
                      "flex items-center justify-between rounded-lg px-3 py-3 text-[15px] font-medium text-ink transition hover:bg-surface",
                      `rise-delay-${i + 1}`,
                    )}
                  >
                    <span>{item.label}</span>
                    <span className="text-[12px] text-faint">→</span>
                  </Link>
                ))}
              </div>
              
              <div className="mt-4 rounded-xl border border-rule/70 bg-surface/50 p-4 text-[13px] text-muted space-y-2 rise-delay-4">
                <p className="font-semibold text-ink text-[12px] uppercase tracking-wider flex items-center gap-1.5">
                  <Sparkles className="h-3.5 w-3.5 text-brass" />
                  Quick Help
                </p>
                <p>📍 Shop counter open in Lagos</p>
                <p>💳 Bank transfer verified within minutes</p>
                <Link
                  href="/track"
                  onClick={() => setMenuOpen(false)}
                  className="inline-flex items-center gap-1 text-brass-deep font-semibold hover:underline pt-1"
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
      {/* Gradient fade at top */}
      <div className="h-px bg-gradient-to-r from-transparent via-brass/30 to-transparent" />

      <div className="mx-auto grid max-w-[1240px] gap-8 px-4 py-14 sm:px-6 md:grid-cols-4">
        <div className="md:col-span-2">
          <p className="font-display text-[24px] text-white">
            Aperio<span className="foil-text"> Vici</span>
          </p>
          <p className="mt-3 max-w-xs text-[14px] leading-relaxed text-white/65">
            {storeName}. Order online and pay by transfer, or buy over the counter at the shop.
          </p>
          <div className="mt-5 flex items-center gap-3">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/8 px-3 py-1.5 text-[11.5px] font-medium text-white/70">
              <span className="h-1.5 w-1.5 rounded-full bg-leaf pulse-soft" />
              Open for orders
            </span>
          </div>
        </div>
        <div>
          <p className="text-[13px] font-semibold uppercase tracking-wider text-white/50">Shop</p>
          <ul className="mt-3.5 space-y-2.5 text-[14px]">
            <li><Link href="/shop?kind=book" className="transition-colors hover:text-brass">Books</Link></li>
            <li><Link href="/shop?kind=gift" className="transition-colors hover:text-brass">Gifts and hampers</Link></li>
            <li><Link href="/track" className="transition-colors hover:text-brass">Track an order</Link></li>
          </ul>
        </div>
        <div>
          <p className="text-[13px] font-semibold uppercase tracking-wider text-white/50">Reach us</p>
          <ul className="mt-3.5 space-y-2.5 text-[14px]">
            <li><a href={`tel:${phone.replace(/\s/g, "")}`} className="transition-colors hover:text-brass">{phone}</a></li>
            <li><a href={`mailto:${email}`} className="transition-colors hover:text-brass">{email}</a></li>
            <li className="leading-relaxed text-white/50 text-[13px]">{address}</li>
          </ul>
        </div>
      </div>
      <div className="border-t border-white/8">
        <div className="mx-auto flex max-w-[1240px] flex-col gap-2 px-4 py-5 text-[13px] text-white/40 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <p>© {new Date().getFullYear()} {storeName}</p>
          <Link href="/signin" className="transition-colors hover:text-brass">Staff sign in</Link>
        </div>
      </div>
    </footer>
  );
}

export function CartButtonSpacer({ className }: { className?: string }) {
  return <div className={cn("h-0", className)} />;
}
