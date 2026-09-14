"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import { SiteHeader, SiteFooter } from "@/components/shop/site-header";
import { CartDrawer } from "@/components/shop/cart-drawer";
import { ProductGrid } from "@/components/shop/product-card";
import { BookSpine } from "@/components/shop/book-cover";
import { Skeleton } from "@/components/ui/primitives";
import { Search, Truck, Landmark, PackageCheck } from "lucide-react";

export default function HomePage() {
  const router = useRouter();
  const [term, setTerm] = useState("");

  const shelf = useQuery(api.products.shelf);
  const featured = useQuery(api.products.featured, { limit: 8 });
  const categories = useQuery(api.categories.listWithCounts);
  const settings = useQuery(api.settings.get);
  const gifts = useQuery(api.products.list, { kind: "gift", limit: 4, sort: "bestselling" });

  function search(e: React.FormEvent) {
    e.preventDefault();
    router.push(term.trim() ? `/shop?q=${encodeURIComponent(term.trim())}` : "/shop");
  }

  return (
    <>
      <SiteHeader />
      <CartDrawer />

      <main>
        {/* The hero is a shelf with rich ambient lighting and fast search */}
        <section className="relative overflow-hidden bg-ink text-white">
          {/* Ambient warm radial glow */}
          <div className="pointer-events-none absolute -left-20 -top-20 h-96 w-96 rounded-full bg-brass/15 blur-3xl" />
          <div className="pointer-events-none absolute right-0 top-1/3 h-80 w-80 rounded-full bg-brass/10 blur-3xl" />

          <div className="relative mx-auto max-w-[1240px] px-4 pb-0 pt-12 sm:px-6 sm:pt-16">
            <div className="rise max-w-2xl">
              {/* Gold foil pill tag */}
              <div className="inline-flex items-center gap-2 rounded-full border border-brass/40 bg-brass/10 px-3.5 py-1 text-[12px] font-medium tracking-wide text-brass-soft backdrop-blur-sm">
                <span className="h-1.5 w-1.5 rounded-full bg-brass pulse-soft" />
                <span>Independent Nigerian Bookseller · Lagos & Nationwide</span>
              </div>

              <h1 className="mt-4 font-display text-[34px] leading-[1.08] text-white sm:text-[46px] lg:text-[54px]">
                Every book we have, on one shelf you can search.
              </h1>
              <p className="mt-4 max-w-xl text-[16px] leading-relaxed text-white/75 sm:text-[17px]">
                {settings?.tagline ?? "Curated books and timeless gifts, delivered anywhere in Nigeria."} Pay by
                bank transfer, we verify within minutes, and your parcel is on its way.
              </p>

              <form onSubmit={search} className="mt-7 flex max-w-xl gap-2">
                <div className="relative flex-1">
                  <Search
                    className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted"
                    aria-hidden
                  />
                  <input
                    value={term}
                    onChange={(e) => setTerm(e.target.value)}
                    placeholder="Search by title, author, or ISBN…"
                    aria-label="Search for a book or gift"
                    className="h-14 w-full rounded-[var(--radius-control)] bg-white pl-12 pr-4 text-[16px] text-ink shadow-lg
                               placeholder:text-faint transition-all focus:outline-none focus:ring-3 focus:ring-brass"
                  />
                </div>
                <button
                  type="submit"
                  className="h-14 shrink-0 rounded-[var(--radius-control)] bg-gradient-to-r from-brass to-brass-deep px-7 text-[15px] font-semibold
                             text-white shadow-md transition hover:brightness-110 active:scale-95"
                >
                  Search
                </button>
              </form>

              {/* Quick genre search chips */}
              <div className="mt-4 flex flex-wrap items-center gap-2 text-[12.5px] text-white/60">
                <span className="text-white/40">Popular:</span>
                {[
                  { label: "Fiction", q: "Fiction" },
                  { label: "African Literature", q: "African" },
                  { label: "Business", q: "Business" },
                  { label: "Memoirs", q: "Memoir" },
                  { label: "Gifts", href: "/shop?kind=gift" },
                ].map((chip) => (
                  <button
                    key={chip.label}
                    onClick={() => {
                      if (chip.href) router.push(chip.href);
                      else if (chip.q) router.push(`/shop?q=${encodeURIComponent(chip.q)}`);
                    }}
                    className="rounded-full bg-white/10 px-2.5 py-1 text-white/80 transition hover:bg-brass hover:text-ink-deep"
                  >
                    {chip.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Interactive Bookshelf Shelf */}
            <div className="mt-12 -mb-6 sm:mt-16">
              <div className="mb-2 flex items-center justify-between text-[11.5px] text-white/50">
                <span className="flex items-center gap-1.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-brass/80" />
                  Live shelf inventory · Hover to inspect titles
                </span>
                <Link href="/shop" className="text-brass hover:underline">
                  Browse all shelves →
                </Link>
              </div>

              {shelf === undefined ? (
                <div className="flex items-end gap-1.5">
                  {Array.from({ length: 14 }).map((_, i) => (
                    <Skeleton key={i} className="h-[190px] w-8 rounded-[1px] bg-white/10" />
                  ))}
                </div>
              ) : (
                <div className="shelf py-1" aria-label="A selection of books in stock">
                  {shelf.map((product, i) => (
                    <Link key={product._id} href={`/product/${product.slug}`} title={product.title}>
                      <BookSpine title={product.title} author={product.author} index={i} />
                    </Link>
                  ))}
                </div>
              )}
              {/* Wooden bookshelf trim with brass edge */}
              <div className="h-3.5 rounded-t-[3px] bg-gradient-to-r from-[#9a6d1f] via-[#c08a2e] to-[#9a6d1f] shadow-md ring-1 ring-black/20" aria-hidden />
            </div>
          </div>
        </section>

        <div className="mx-auto max-w-[1240px] px-4 sm:px-6">
          {/* Category Pills Rail */}
          <section className="border-b border-rule/70 py-8">
            <div className="scroll-x flex gap-2.5 pb-1">
              <Link
                href="/shop"
                className="shrink-0 rounded-[var(--radius-pill)] border border-rule bg-surface/50 px-4 py-2 text-[14px] font-medium
                           text-ink transition hover:border-brass hover:bg-white hover:text-brass-deep"
              >
                All Departments
              </Link>
              {categories === undefined
                ? Array.from({ length: 6 }).map((_, i) => (
                    <Skeleton key={i} className="h-9 w-36 shrink-0 rounded-[var(--radius-pill)]" />
                  ))
                : categories.map((category) => (
                    <Link
                      key={category._id}
                      href={`/shop?category=${category.slug}`}
                      className="shrink-0 rounded-[var(--radius-pill)] border border-rule px-4 py-2 text-[14px]
                                 text-ink-soft transition hover:border-ink hover:text-ink hover:shadow-xs"
                    >
                      {category.name}
                      <span className="figure ml-2 rounded-full bg-surface px-1.5 py-0.5 text-[11.5px] font-medium text-faint">
                        {category.count}
                      </span>
                    </Link>
                  ))}
            </div>
          </section>

          {/* Featured Front Table */}
          <section className="py-14">
            <div className="mb-8 flex items-end justify-between gap-4">
              <div>
                <div className="inline-flex items-center gap-1.5 text-[12px] font-bold uppercase tracking-wider text-brass-deep">
                  <span className="h-1 w-3 rounded-full bg-brass" />
                  Curator's Selection
                </div>
                <h2 className="font-display text-[28px] text-ink sm:text-[34px]">On the front table</h2>
                <p className="mt-1 text-[15px] text-muted">
                  What our booksellers are reading and putting in people&apos;s hands this month.
                </p>
              </div>
              <Link
                href="/shop"
                className="shrink-0 rounded-md border border-rule px-3.5 py-2 text-[13.5px] font-medium text-ink transition hover:border-ink hover:bg-surface"
              >
                View full catalog →
              </Link>
            </div>

            {featured === undefined ? (
              <div className="grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3 lg:grid-cols-4">
                {Array.from({ length: 8 }).map((_, i) => (
                  <div key={i} className="space-y-3">
                    <Skeleton className="aspect-[2/3] w-full rounded-[var(--radius-sheet)]" />
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-3 w-1/2" />
                  </div>
                ))}
              </div>
            ) : featured.length > 0 ? (
              <ProductGrid products={featured} />
            ) : (
              <p className="text-[15px] text-muted">
                No featured products currently active.
              </p>
            )}
          </section>

          {/* Literary Quote Plate */}
          <section className="my-8 rounded-[var(--radius-sheet)] border border-rule/80 bg-surface/50 p-8 sm:p-12 text-center relative overflow-hidden">
            <div className="pointer-events-none absolute left-6 top-4 font-display text-[72px] leading-none text-brass/20 select-none">“</div>
            <blockquote className="relative mx-auto max-w-2xl">
              <p className="font-display text-[22px] italic leading-relaxed text-ink sm:text-[26px]">
                “A room without books is like a body without a soul.”
              </p>
              <footer className="mt-3 text-[13.5px] font-semibold uppercase tracking-widest text-brass-deep">
                — Marcus Tullius Cicero
              </footer>
            </blockquote>
          </section>

          {/* Trust & How Bank Transfer Payment Works */}
          <section className="border-t border-rule/70 py-14">
            <div className="max-w-xl">
              <div className="inline-flex items-center gap-1.5 text-[12px] font-bold uppercase tracking-wider text-brass-deep">
                <span className="h-1 w-3 rounded-full bg-brass" />
                Simple & Transparent
              </div>
              <h2 className="font-display text-[28px] text-ink sm:text-[34px]">
                How paying for an order works
              </h2>
              <p className="mt-2 text-[15px] text-muted">
                No card details needed. We use direct bank transfer with swift human verification.
              </p>
            </div>

            <ol className="mt-9 grid gap-6 md:grid-cols-3">
              {[
                {
                  icon: Search,
                  title: "1. Place your order",
                  body: "Select books, provide your delivery address or choose store pickup. Stock is committed immediately to your order number.",
                },
                {
                  icon: Landmark,
                  title: "2. Transfer the exact total",
                  body: "Transfer to our verified business bank account using your order number as narration so our counter staff can spot it.",
                },
                {
                  icon: PackageCheck,
                  title: "3. We verify and dispatch",
                  body: "Once payment reflects, we seal your package with bookmark inserts and hand it to our dispatch rider or courier.",
                },
              ].map((step) => (
                <li
                  key={step.title}
                  className="rounded-[var(--radius-control)] border border-rule/80 bg-white p-6 shadow-xs transition hover:border-brass/50 hover:shadow-md"
                >
                  <div className="mb-4 inline-flex h-11 w-11 items-center justify-center rounded-full bg-brass/10 text-brass-deep">
                    <step.icon className="h-5 w-5" />
                  </div>
                  <h3 className="font-display text-[19px] font-semibold text-ink">{step.title}</h3>
                  <p className="mt-2 text-[14px] leading-relaxed text-muted">{step.body}</p>
                </li>
              ))}
            </ol>

            <div className="mt-10 flex flex-wrap items-center gap-x-8 gap-y-3 rounded-md border border-rule/80 bg-surface/40 p-4 text-[13.5px] text-muted">
              <span className="flex items-center gap-2 font-medium text-ink">
                <Truck className="h-4 w-4 text-brass-deep" aria-hidden />
                Delivery to all 36 Nigerian states & FCT
              </span>
              <span className="opacity-40">·</span>
              <span>Lagos store pickup is always free</span>
              {settings?.freeDeliveryThreshold ? (
                <>
                  <span className="opacity-40">·</span>
                  <span className="font-semibold text-leaf">
                    Free delivery over ₦{(settings.freeDeliveryThreshold / 100).toLocaleString("en-NG")}
                  </span>
                </>
              ) : null}
            </div>
          </section>

          {/* Gifts Showcase */}
          {gifts && gifts.products.length > 0 && (
            <section className="border-t border-rule/70 py-14">
              <div className="mb-8 flex items-end justify-between gap-4">
                <div>
                  <div className="inline-flex items-center gap-1.5 text-[12px] font-bold uppercase tracking-wider text-brass-deep">
                    <span className="h-1 w-3 rounded-full bg-brass" />
                    Special Occasions
                  </div>
                  <h2 className="font-display text-[28px] text-ink sm:text-[34px]">Gifts worth giving</h2>
                  <p className="mt-1 text-[15px] text-muted">
                    Wrapped, boxed, and ready. Tell us the occasion and we will handwrite the card.
                  </p>
                </div>
                <Link
                  href="/shop?kind=gift"
                  className="shrink-0 rounded-md border border-rule px-3.5 py-2 text-[13.5px] font-medium text-ink transition hover:border-ink hover:bg-surface"
                >
                  All gift packages →
                </Link>
              </div>
              <ProductGrid products={gifts.products} />
            </section>
          )}
        </div>
      </main>

      <SiteFooter
        storeName={settings?.storeName ?? "Aperio Vici Bookshops & Gifts"}
        phone={settings?.phone ?? ""}
        email={settings?.email ?? ""}
        address={settings?.address ?? ""}
      />
    </>
  );
}
