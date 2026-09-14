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
import { Search, Truck, Landmark, PackageCheck, ArrowRight, Shield, MapPin } from "lucide-react";

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
        {/* Hero — animated gradient mesh with prominent search */}
        <section className="relative overflow-hidden gradient-hero text-white">
          {/* Animated ambient warm radials */}
          <div className="pointer-events-none absolute -left-20 -top-20 h-[500px] w-[500px] rounded-full bg-brass/12 blur-[100px] float" />
          <div className="pointer-events-none absolute right-0 top-1/4 h-96 w-96 rounded-full bg-brass/8 blur-[80px]" />
          <div className="pointer-events-none absolute bottom-0 left-1/3 h-80 w-80 rounded-full bg-white/[0.03] blur-[60px]" />

          <div className="relative mx-auto max-w-[1240px] px-4 pb-0 pt-14 sm:px-6 sm:pt-20">
            <div className="max-w-2xl">
              {/* Gold foil pill tag */}
              <div className="rise inline-flex items-center gap-2.5 rounded-full border border-brass/30 bg-brass/8 px-4 py-1.5 text-[12px] font-medium tracking-wide text-brass-soft backdrop-blur-sm">
                <span className="h-1.5 w-1.5 rounded-full bg-brass pulse-soft" />
                <span>Independent Nigerian Bookseller · Lagos &amp; Nationwide</span>
              </div>

              <h1 className="rise-delay-1 mt-5 font-display text-[36px] leading-[1.06] text-white sm:text-[48px] lg:text-[56px]">
                Every book we have, on one shelf you can search.
              </h1>
              <p className="rise-delay-2 mt-5 max-w-xl text-[16px] leading-relaxed text-white/70 sm:text-[17px]">
                {settings?.tagline ?? "Curated books and timeless gifts, delivered anywhere in Nigeria."} Pay by
                bank transfer, we verify within minutes, and your parcel is on its way.
              </p>

              <form onSubmit={search} className="rise-delay-3 mt-8 flex max-w-xl gap-2.5">
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
                    className="h-14 w-full rounded-xl bg-white pl-12 pr-4 text-[16px] text-ink shadow-[var(--shadow-lift)]
                               placeholder:text-faint transition-all duration-300 focus:outline-none focus:ring-[3px] focus:ring-brass/25 focus:shadow-[var(--shadow-glow-brass)]"
                  />
                </div>
                <button
                  type="submit"
                  className="h-14 shrink-0 rounded-xl gradient-brass px-7 text-[15px] font-bold
                             text-white shadow-[var(--shadow-lift)] transition-all duration-200 hover:brightness-110 hover:shadow-[var(--shadow-glow-brass)] active:scale-95 btn-press"
                >
                  Search
                </button>
              </form>

              {/* Quick genre chips */}
              <div className="rise-delay-4 mt-5 flex flex-wrap items-center gap-2 text-[12.5px] text-white/55">
                <span className="text-white/35 font-medium">Popular:</span>
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
                    className="rounded-full border border-white/15 bg-white/8 px-3 py-1 text-white/75 transition-all duration-200 hover:bg-brass hover:text-ink-deep hover:border-brass hover:shadow-[var(--shadow-glow-brass)]"
                  >
                    {chip.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Interactive Bookshelf */}
            <div className="mt-14 -mb-6 sm:mt-18">
              <div className="mb-2.5 flex items-center justify-between text-[11.5px] text-white/45">
                <span className="flex items-center gap-1.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-brass/80 pulse-soft" />
                  Live shelf inventory · Hover to inspect titles
                </span>
                <Link href="/shop" className="text-brass transition-colors hover:text-brass-soft flex items-center gap-1">
                  Browse all shelves <ArrowRight className="h-3 w-3" />
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
              {/* Wooden bookshelf trim */}
              <div className="shelf-trim h-4 rounded-t-[4px] ring-1 ring-black/20" aria-hidden />
            </div>
          </div>
        </section>

        <div className="mx-auto max-w-[1240px] px-4 sm:px-6">
          {/* Category Pills Rail */}
          <section className="border-b border-rule/60 py-8">
            <div className="scroll-x scroll-fade flex gap-2.5 pb-1">
              <Link
                href="/shop"
                className="shrink-0 rounded-full border border-ink bg-ink px-4.5 py-2 text-[14px] font-semibold
                           text-white shadow-[var(--shadow-drop)] transition-all hover:shadow-[var(--shadow-card)]"
              >
                All Departments
              </Link>
              {categories === undefined
                ? Array.from({ length: 6 }).map((_, i) => (
                    <Skeleton key={i} className="h-9 w-36 shrink-0 rounded-full" />
                  ))
                : categories.map((category) => (
                    <Link
                      key={category._id}
                      href={`/shop?category=${category.slug}`}
                      className="shrink-0 rounded-full border border-rule/80 bg-white px-4.5 py-2 text-[14px]
                                 text-ink-soft shadow-[var(--shadow-xs)] transition-all duration-200 hover:border-ink hover:text-ink hover:shadow-[var(--shadow-card)]"
                    >
                      {category.name}
                      <span className="figure ml-2 rounded-full bg-surface-deep px-1.5 py-0.5 text-[11px] font-semibold text-faint">
                        {category.count}
                      </span>
                    </Link>
                  ))}
            </div>
          </section>

          {/* Featured Front Table */}
          <section className="py-16">
            <div className="mb-10 flex items-end justify-between gap-4">
              <div>
                <div className="section-label">Curator&apos;s Selection</div>
                <h2 className="mt-2 font-display text-[28px] text-ink sm:text-[36px]">On the front table</h2>
                <p className="mt-1.5 text-[15px] text-muted">
                  What our booksellers are reading and putting in people&apos;s hands this month.
                </p>
              </div>
              <Link
                href="/shop"
                className="shrink-0 rounded-[var(--radius-control)] border border-rule bg-white px-4 py-2.5 text-[13.5px] font-semibold text-ink shadow-[var(--shadow-xs)]
                           transition-all hover:border-ink hover:shadow-[var(--shadow-card)] flex items-center gap-1.5 group"
              >
                View full catalog
                <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
              </Link>
            </div>

            {featured === undefined ? (
              <div className="grid grid-cols-2 gap-x-5 gap-y-10 sm:grid-cols-3 lg:grid-cols-4">
                {Array.from({ length: 8 }).map((_, i) => (
                  <div key={i} className="space-y-3">
                    <Skeleton className="aspect-[2/3] w-full" />
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

          {/* Literary Quote */}
          <section className="my-8 rounded-2xl border border-rule/60 bg-gradient-to-br from-surface/80 to-white p-8 sm:p-14 text-center relative overflow-hidden shadow-[var(--shadow-card)]">
            <div className="pointer-events-none absolute left-6 top-2 font-display text-[80px] leading-none text-brass/15 select-none">&ldquo;</div>
            <div className="pointer-events-none absolute right-6 bottom-2 font-display text-[80px] leading-none text-brass/15 select-none rotate-180">&ldquo;</div>
            <blockquote className="relative mx-auto max-w-2xl">
              <p className="font-display text-[22px] italic leading-relaxed text-ink sm:text-[28px]">
                &ldquo;A room without books is like a body without a soul.&rdquo;
              </p>
              <footer className="mt-4 text-[13px] font-bold uppercase tracking-[0.12em] text-brass-deep">
                — Marcus Tullius Cicero
              </footer>
            </blockquote>
          </section>

          {/* Trust & How Bank Transfer Works */}
          <section className="border-t border-rule/60 py-16">
            <div className="max-w-xl">
              <div className="section-label">Simple &amp; Transparent</div>
              <h2 className="mt-2 font-display text-[28px] text-ink sm:text-[36px]">
                How paying for an order works
              </h2>
              <p className="mt-2 text-[15px] text-muted">
                No card details needed. We use direct bank transfer with swift human verification.
              </p>
            </div>

            <ol className="mt-10 grid gap-5 md:grid-cols-3">
              {[
                {
                  icon: Search,
                  step: "01",
                  title: "Place your order",
                  body: "Select books, provide your delivery address or choose store pickup. Stock is committed immediately to your order number.",
                },
                {
                  icon: Landmark,
                  step: "02",
                  title: "Transfer the exact total",
                  body: "Transfer to our verified business bank account using your order number as narration so our counter staff can spot it.",
                },
                {
                  icon: PackageCheck,
                  step: "03",
                  title: "We verify and dispatch",
                  body: "Once payment reflects, we seal your package with bookmark inserts and hand it to our dispatch rider or courier.",
                },
              ].map((step) => (
                <li
                  key={step.title}
                  className="group rounded-xl border border-rule/70 bg-white p-6 shadow-[var(--shadow-card)] transition-all duration-[var(--duration-normal)]
                             hover:border-brass/40 hover:shadow-[var(--shadow-book)] hover:-translate-y-1 relative overflow-hidden"
                >
                  {/* Left accent */}
                  <div className="absolute left-0 top-0 bottom-0 w-[3px] bg-gradient-to-b from-brass/60 to-brass/10 rounded-l-xl opacity-0 transition-opacity group-hover:opacity-100" />
                  
                  <div className="flex items-start gap-4">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-brass/10 to-brass/5 text-brass-deep shadow-[var(--shadow-xs)] transition-all group-hover:shadow-[var(--shadow-glow-brass)]">
                      <step.icon className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-[11px] font-bold uppercase tracking-widest text-brass mb-1">{step.step}</p>
                      <h3 className="font-display text-[18px] font-semibold text-ink">{step.title}</h3>
                    </div>
                  </div>
                  <p className="mt-3 text-[14px] leading-relaxed text-muted">{step.body}</p>
                </li>
              ))}
            </ol>

            <div className="mt-10 flex flex-wrap items-center gap-x-6 gap-y-3 rounded-xl border border-rule/60 bg-gradient-to-r from-surface/60 to-white p-5 text-[13.5px] text-muted shadow-[var(--shadow-xs)]">
              <span className="flex items-center gap-2.5 font-semibold text-ink">
                <Truck className="h-4.5 w-4.5 text-brass-deep" aria-hidden />
                Delivery to all 36 Nigerian states &amp; FCT
              </span>
              <span className="h-4 w-px bg-rule-strong" />
              <span className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-brass-deep" aria-hidden />
                Lagos store pickup is always free
              </span>
              {settings?.freeDeliveryThreshold ? (
                <>
                  <span className="h-4 w-px bg-rule-strong" />
                  <span className="flex items-center gap-2 font-bold text-leaf">
                    <Shield className="h-4 w-4" aria-hidden />
                    Free delivery over ₦{(settings.freeDeliveryThreshold / 100).toLocaleString("en-NG")}
                  </span>
                </>
              ) : null}
            </div>
          </section>

          {/* Gifts Showcase */}
          {gifts && gifts.products.length > 0 && (
            <section className="border-t border-rule/60 py-16">
              <div className="mb-10 flex items-end justify-between gap-4">
                <div>
                  <div className="section-label">Special Occasions</div>
                  <h2 className="mt-2 font-display text-[28px] text-ink sm:text-[36px]">Gifts worth giving</h2>
                  <p className="mt-1.5 text-[15px] text-muted">
                    Wrapped, boxed, and ready. Tell us the occasion and we will handwrite the card.
                  </p>
                </div>
                <Link
                  href="/shop?kind=gift"
                  className="shrink-0 rounded-[var(--radius-control)] border border-rule bg-white px-4 py-2.5 text-[13.5px] font-semibold text-ink shadow-[var(--shadow-xs)]
                             transition-all hover:border-ink hover:shadow-[var(--shadow-card)] flex items-center gap-1.5 group"
                >
                  All gift packages
                  <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
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
