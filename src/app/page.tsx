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
        {/* The hero is a shelf. Search sits inside it, because finding a
            specific title is what nearly every visitor came here to do. */}
        <section className="relative overflow-hidden bg-ink text-white">
          <div className="mx-auto max-w-[1240px] px-4 pb-0 pt-14 sm:px-6 sm:pt-20">
            <div className="rise max-w-2xl">
              <h1 className="font-display text-[34px] leading-[1.08] text-white sm:text-[46px] lg:text-[54px]">
                Every book we have, on one shelf you can search.
              </h1>
              <p className="mt-4 max-w-xl text-[16px] leading-relaxed text-white/70 sm:text-[17px]">
                {settings?.tagline ?? "Books and gifts, delivered anywhere in Nigeria."} Pay by
                transfer to our account, we confirm it, and your order goes out.
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
                    placeholder="Title, author or ISBN"
                    aria-label="Search for a book or gift"
                    className="h-14 w-full rounded-[var(--radius-control)] bg-white pl-12 pr-4 text-[16px] text-ink
                               placeholder:text-faint focus:outline-none focus:ring-2 focus:ring-brass"
                  />
                </div>
                <button
                  type="submit"
                  className="h-14 shrink-0 rounded-[var(--radius-control)] bg-brass px-6 text-[15px] font-semibold
                             text-ink-deep transition hover:bg-white"
                >
                  Search
                </button>
              </form>

              <p className="mt-3 text-[13.5px] text-white/50">
                Or browse{" "}
                <Link href="/shop?kind=book" className="text-brass underline-offset-4 hover:underline">
                  books
                </Link>
                ,{" "}
                <Link href="/shop?kind=gift" className="text-brass underline-offset-4 hover:underline">
                  gifts and hampers
                </Link>
                , or{" "}
                <Link href="/track" className="text-brass underline-offset-4 hover:underline">
                  track an order you already placed
                </Link>
                .
              </p>
            </div>

            <div className="mt-12 -mb-6 sm:mt-16">
              {shelf === undefined ? (
                <div className="flex items-end gap-1">
                  {Array.from({ length: 12 }).map((_, i) => (
                    <Skeleton key={i} className="h-[190px] w-8 bg-white/10" />
                  ))}
                </div>
              ) : (
                <div className="shelf" aria-label="A selection of books in stock">
                  {shelf.map((product, i) => (
                    <Link key={product._id} href={`/product/${product.slug}`} title={product.title}>
                      <BookSpine title={product.title} author={product.author} index={i} />
                    </Link>
                  ))}
                </div>
              )}
              <div className="h-2 rounded-t-[2px] bg-brass/80" aria-hidden />
            </div>
          </div>
        </section>

        <div className="mx-auto max-w-[1240px] px-4 sm:px-6">
          {/* Categories read as a list of what the shop actually stocks,
              with live counts, rather than decorative tiles. */}
          <section className="border-b border-rule py-10">
            <div className="scroll-x flex gap-2 pb-1">
              {categories === undefined
                ? Array.from({ length: 6 }).map((_, i) => (
                    <Skeleton key={i} className="h-9 w-40 shrink-0 rounded-[var(--radius-pill)]" />
                  ))
                : categories.map((category) => (
                    <Link
                      key={category._id}
                      href={`/shop?category=${category.slug}`}
                      className="shrink-0 rounded-[var(--radius-pill)] border border-rule px-4 py-2 text-[14px]
                                 text-ink-soft transition hover:border-ink hover:text-ink"
                    >
                      {category.name}
                      <span className="figure ml-2 text-[12.5px] text-faint">{category.count}</span>
                    </Link>
                  ))}
            </div>
          </section>

          <section className="py-14">
            <div className="mb-7 flex items-end justify-between gap-4">
              <div>
                <h2 className="font-display text-[28px] text-ink sm:text-[32px]">On the front table</h2>
                <p className="mt-1 text-[15px] text-muted">
                  What we are putting in people&apos;s hands this month.
                </p>
              </div>
              <Link href="/shop" className="shrink-0 text-[14px] text-brass-deep underline-offset-4 hover:underline">
                See everything
              </Link>
            </div>

            {featured === undefined ? (
              <div className="grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3 lg:grid-cols-4">
                {Array.from({ length: 8 }).map((_, i) => (
                  <div key={i}>
                    <Skeleton className="aspect-[2/3] w-full" />
                    <Skeleton className="mt-2.5 h-4 w-3/4" />
                    <Skeleton className="mt-1.5 h-3 w-1/2" />
                  </div>
                ))}
              </div>
            ) : featured.length > 0 ? (
              <ProductGrid products={featured} />
            ) : (
              <p className="text-[15px] text-muted">
                Nothing is marked as featured yet. Mark products as featured in the dashboard and they
                will appear here.
              </p>
            )}
          </section>

          {/* Bank transfer asks customers to trust an account number, so the
              flow is spelled out before they reach checkout, not after. */}
          <section className="border-t border-rule py-14">
            <h2 className="font-display text-[28px] text-ink sm:text-[32px]">
              How paying for an order works
            </h2>
            <ol className="mt-8 grid gap-8 md:grid-cols-3">
              {[
                {
                  icon: Search,
                  title: "Place your order",
                  body: "Add what you want, give us your name, phone number and where it should go. You get an order number straight away.",
                },
                {
                  icon: Landmark,
                  title: "Transfer the total",
                  body: "Send the exact amount to the account we show you, and use your order number as the narration so we can find it.",
                },
                {
                  icon: PackageCheck,
                  title: "We confirm and pack",
                  body: "Once the money lands in our statement we mark your order paid, pack it, and hand it to dispatch or hold it for pickup.",
                },
              ].map((step, i) => (
                <li key={step.title} className="flex gap-4">
                  <span className="figure mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-brass text-[14px] font-semibold text-brass-deep">
                    {i + 1}
                  </span>
                  <div>
                    <h3 className="font-display text-[19px] text-ink">{step.title}</h3>
                    <p className="mt-1.5 text-[14.5px] leading-relaxed text-muted">{step.body}</p>
                  </div>
                </li>
              ))}
            </ol>

            <div className="mt-10 flex flex-wrap items-center gap-x-8 gap-y-3 border-t border-rule pt-6 text-[14px] text-muted">
              <span className="flex items-center gap-2">
                <Truck className="h-4 w-4 text-brass-deep" aria-hidden />
                Delivery to all 36 states and the FCT
              </span>
              <span>Pickup from the shop is always free</span>
              {settings?.freeDeliveryThreshold ? (
                <span>
                  Free delivery over ₦{(settings.freeDeliveryThreshold / 100).toLocaleString("en-NG")}
                </span>
              ) : null}
            </div>
          </section>

          {gifts && gifts.products.length > 0 && (
            <section className="border-t border-rule py-14">
              <div className="mb-7 flex items-end justify-between gap-4">
                <div>
                  <h2 className="font-display text-[28px] text-ink sm:text-[32px]">Gifts worth giving</h2>
                  <p className="mt-1 text-[15px] text-muted">
                    Wrapped, boxed and ready. Tell us the occasion and we will write the card.
                  </p>
                </div>
                <Link href="/shop?kind=gift" className="shrink-0 text-[14px] text-brass-deep underline-offset-4 hover:underline">
                  All gifts
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
