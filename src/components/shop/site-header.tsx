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
    <header className="sticky top-0 z-40 border-b border-rule bg-white/95 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-[1240px] items-center gap-3 px-4 sm:gap-6 sm:px-6">
        <button
          className="-ml-2 rounded p-2 text-ink lg:hidden"
          onClick={() => setMenuOpen((v) => !v)}
          aria-label={menuOpen ? "Close menu" : "Open menu"}
          aria-expanded={menuOpen}
        >
          {menuOpen ? <Menu className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>

        <Link href="/" className="shrink-0">
          <span className="font-display text-[21px] leading-none tracking-[-0.02em] text-ink sm:text-[23px]">
            Aperio
            <span className="text-brass"> Vici</span>
          </span>
        </Link>

        <div ref={boxRef} className="relative ml-auto hidden max-w-md flex-1 lg:block">
          <form onSubmit={submit}>
            <Search
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted"
              aria-hidden
            />
            <input
              value={term}
              onChange={(e) => setTerm(e.target.value)}
              onFocus={() => setFocused(true)}
              placeholder="Search by title, author or ISBN"
              aria-label="Search the shop"
              className="h-10 w-full rounded-[var(--radius-control)] border border-rule bg-surface pl-9 pr-3 text-[14px]
                         placeholder:text-faint focus:border-ink focus:bg-white focus:outline-none focus:ring-2 focus:ring-brass/30"
            />
          </form>

          {showSuggestions && (
            <div className="absolute left-0 right-0 top-12 overflow-hidden rounded-[var(--radius-sheet)] border border-rule bg-white shadow-[var(--shadow-lift)]">
              {suggestions === undefined ? (
                <p className="px-4 py-3 text-[13px] text-muted">Searching…</p>
              ) : suggestions.length === 0 ? (
                <p className="px-4 py-3 text-[13px] text-muted">
                  Nothing matches “{term}”. Try the author&apos;s surname.
                </p>
              ) : (
                suggestions.map((product) => (
                  <Link
                    key={product._id}
                    href={`/product/${product.slug}`}
                    onClick={() => setFocused(false)}
                    className="flex items-center gap-3 border-b border-rule px-3 py-2.5 last:border-0 hover:bg-surface"
                  >
                    <span className="h-12 w-9 shrink-0 overflow-hidden rounded-[2px]">
                      <BookCover
                        title={product.title}
                        kind={product.kind}
                        imageUrl={product.coverImage}
                        compact
                      />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[14px] text-ink">{product.title}</span>
                      {product.author && (
                        <span className="block truncate text-[12.5px] text-muted">
                          {product.author}
                        </span>
                      )}
                    </span>
                    <span className="figure shrink-0 text-[13px] text-ink-soft">
                      {formatNaira(product.price)}
                    </span>
                  </Link>
                ))
              )}
            </div>
          )}
        </div>

        <nav className="hidden items-center gap-5 lg:flex">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="text-[14px] text-ink-soft transition-colors hover:text-ink"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-1 lg:ml-0">
          <Link
            href="/shop"
            className="rounded p-2 text-ink hover:bg-surface lg:hidden"
            aria-label="Search the shop"
          >
            <Search className="h-5 w-5" />
          </Link>
          <button
            onClick={openCart}
            className="relative rounded p-2 text-ink hover:bg-surface"
            aria-label={`Basket, ${count} ${count === 1 ? "item" : "items"}`}
          >
            <ShoppingBag className="h-5 w-5" />
            {count > 0 && (
              <span className="figure absolute -right-0.5 -top-0.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-brass px-1 text-[11px] font-semibold text-ink-deep">
                {count}
              </span>
            )}
          </button>
        </div>
      </div>

      {menuOpen && (
        <div className="border-t border-rule bg-white lg:hidden">
          <nav className="mx-auto max-w-[1240px] px-4 py-2">
            {NAV.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMenuOpen(false)}
                className="block border-b border-rule py-3 text-[15px] text-ink last:border-0"
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </div>
      )}
    </header>
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
