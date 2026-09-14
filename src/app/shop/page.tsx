"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import { SiteHeader, SiteFooter } from "@/components/shop/site-header";
import { CartDrawer } from "@/components/shop/cart-drawer";
import { ProductGrid } from "@/components/shop/product-card";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/field";
import { EmptyState, Skeleton } from "@/components/ui/primitives";
import { cn } from "@/lib/utils";
import { SlidersHorizontal, X, SearchX } from "lucide-react";

const SORTS = [
  { value: "relevance", label: "Best match" },
  { value: "newest", label: "Newest in" },
  { value: "bestselling", label: "Best selling" },
  { value: "price_asc", label: "Price, low to high" },
  { value: "price_desc", label: "Price, high to low" },
  { value: "title", label: "Title, A to Z" },
] as const;

function ShopContent() {
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [limit, setLimit] = useState(24);

  const q = params.get("q") ?? undefined;
  const kind = (params.get("kind") as "book" | "gift" | null) ?? undefined;
  const categorySlug = params.get("category") ?? undefined;
  const sort = (params.get("sort") as any) ?? undefined;
  const inStockOnly = params.get("stock") === "1";

  const result = useQuery(api.products.list, {
    search: q,
    kind,
    categorySlug,
    sort,
    inStockOnly,
    limit,
  });
  const categories = useQuery(api.categories.listWithCounts);
  const settings = useQuery(api.settings.get);

  function setParam(key: string, value: string | null) {
    const next = new URLSearchParams(params.toString());
    if (value === null || value === "") next.delete(key);
    else next.set(key, value);
    setLimit(24);
    router.push(`${pathname}?${next.toString()}`, { scroll: false });
  }

  const activeFilters = [
    kind && { key: "kind", label: kind === "book" ? "Books" : "Gifts" },
    categorySlug && {
      key: "category",
      label: categories?.find((c) => c.slug === categorySlug)?.name ?? categorySlug,
    },
    inStockOnly && { key: "stock", label: "In stock only" },
  ].filter(Boolean) as { key: string; label: string }[];

  const heading = q
    ? `Results for "${q}"`
    : categorySlug
      ? (categories?.find((c) => c.slug === categorySlug)?.name ?? "Shop")
      : kind === "book"
        ? "Books"
        : kind === "gift"
          ? "Gifts and hampers"
          : "Everything in the shop";

  const filterRail = (
    <div className="space-y-8">
      <div>
        <h3 className="text-[13px] font-bold uppercase tracking-wider text-muted">Type</h3>
        <div className="mt-3 space-y-1">
          {[
            { value: null, label: "Books and gifts" },
            { value: "book", label: "Books only" },
            { value: "gift", label: "Gifts only" },
          ].map((option) => (
            <button
              key={option.label}
              onClick={() => setParam("kind", option.value)}
              className={cn(
                "block w-full text-left rounded-lg px-3 py-2 text-[14px] transition-all",
                (kind ?? null) === option.value
                  ? "font-semibold text-ink bg-surface"
                  : "text-muted hover:text-ink hover:bg-surface/50",
              )}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      <div>
        <h3 className="text-[13px] font-bold uppercase tracking-wider text-muted">Shelf</h3>
        <div className="mt-3 space-y-1">
          <button
            onClick={() => setParam("category", null)}
            className={cn(
              "block w-full text-left rounded-lg px-3 py-2 text-[14px] transition-all",
              !categorySlug ? "font-semibold text-ink bg-surface" : "text-muted hover:text-ink hover:bg-surface/50",
            )}
          >
            All shelves
          </button>
          {categories?.map((category) => (
            <button
              key={category._id}
              onClick={() => setParam("category", category.slug)}
              className={cn(
                "flex w-full items-center justify-between gap-2 text-left rounded-lg px-3 py-2 text-[14px] transition-all",
                categorySlug === category.slug ? "font-semibold text-ink bg-surface" : "text-muted hover:text-ink hover:bg-surface/50",
              )}
            >
              <span>{category.name}</span>
              <span className="figure text-[12px] text-faint">{category.count}</span>
            </button>
          ))}
        </div>
      </div>

      <div>
        <h3 className="text-[13px] font-bold uppercase tracking-wider text-muted">Availability</h3>
        <label className="mt-3 flex cursor-pointer items-center gap-2.5 text-[14px] text-muted rounded-lg px-3 py-2 hover:bg-surface/50 transition-colors">
          <input
            type="checkbox"
            checked={inStockOnly}
            onChange={(e) => setParam("stock", e.target.checked ? "1" : null)}
            className="h-4 w-4 rounded accent-[var(--color-ink)]"
          />
          Hide what is out of stock
        </label>
      </div>
    </div>
  );

  return (
    <>
      <SiteHeader />
      <CartDrawer />

      <main className="mx-auto max-w-[1240px] px-4 py-8 sm:px-6 sm:py-10">
        <div className="flex flex-wrap items-end justify-between gap-4 rise">
          <div>
            <h1 className="font-display text-[30px] leading-tight text-ink sm:text-[36px]">
              {heading}
            </h1>
            <p className="mt-1 text-[14.5px] text-muted">
              {result === undefined
                ? "Looking…"
                : result.total === 0
                  ? "Nothing found"
                  : `${result.total} ${result.total === 1 ? "item" : "items"}`}
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <Button
              variant="secondary"
              size="sm"
              className="lg:hidden"
              onClick={() => setFiltersOpen(true)}
            >
              <SlidersHorizontal className="h-4 w-4" />
              Filters
              {activeFilters.length > 0 && (
                <span className="figure ml-1 rounded-full gradient-brass px-1.5 text-[11px] font-bold text-white">
                  {activeFilters.length}
                </span>
              )}
            </Button>
            <Select
              aria-label="Sort results"
              value={sort ?? (q ? "relevance" : "newest")}
              onChange={(e) => setParam("sort", e.target.value)}
              className="h-9 w-auto text-[13.5px]"
            >
              {SORTS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Select>
          </div>
        </div>

        {activeFilters.length > 0 && (
          <div className="mt-4 flex flex-wrap items-center gap-2 rise-delay-1">
            {activeFilters.map((filter) => (
              <button
                key={filter.key}
                onClick={() => setParam(filter.key, null)}
                className="flex items-center gap-1.5 rounded-full border border-rule-strong bg-white
                           px-3.5 py-1.5 text-[13px] font-medium text-ink-soft shadow-[var(--shadow-xs)] transition-all hover:border-ink hover:text-ink"
              >
                {filter.label}
                <X className="h-3 w-3" aria-hidden />
              </button>
            ))}
            <Link href="/shop" className="ml-1 text-[13px] font-medium text-brass-deep underline-offset-4 hover:underline">
              Clear all
            </Link>
          </div>
        )}

        <div className="mt-8 grid gap-10 lg:grid-cols-[220px_1fr] lg:gap-10">
          <aside className="hidden lg:block">
            <div className="sticky top-24 rounded-xl border border-rule/60 bg-white p-5 shadow-[var(--shadow-card)]">
              {filterRail}
            </div>
          </aside>

          <div>
            {result === undefined ? (
              <div className="grid grid-cols-2 gap-x-5 gap-y-10 sm:grid-cols-3 lg:grid-cols-4">
                {Array.from({ length: 8 }).map((_, i) => (
                  <div key={i}>
                    <Skeleton className="aspect-[2/3] w-full" />
                    <Skeleton className="mt-3 h-4 w-3/4" />
                    <Skeleton className="mt-1.5 h-3 w-1/2" />
                  </div>
                ))}
              </div>
            ) : result.products.length === 0 ? (
              <EmptyState
                icon={SearchX}
                title={q ? `No match for "${q}"` : "This shelf is empty"}
                description={
                  q
                    ? "Try the author's surname on its own, or fewer words. If we should be stocking it, call the shop and we will order it in."
                    : "Nothing here yet. Try another shelf, or clear your filters."
                }
                action={
                  <Button variant="secondary" onClick={() => router.push("/shop")}>
                    Browse everything
                  </Button>
                }
              />
            ) : (
              <>
                <ProductGrid products={result.products} />
                {result.hasMore && (
                  <div className="mt-12 flex justify-center">
                    <Button variant="secondary" onClick={() => setLimit((l) => l + 24)} className="px-8">
                      Show more
                    </Button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </main>

      {filtersOpen && (
        <div className="fixed inset-0 z-50 lg:hidden animate-in fade-in duration-200">
          <div className="absolute inset-0 bg-ink-deep/50 backdrop-blur-sm" onClick={() => setFiltersOpen(false)} aria-hidden />
          <div className="absolute inset-x-0 bottom-0 max-h-[80vh] overflow-y-auto rounded-t-2xl bg-white shadow-[var(--shadow-lift)] animate-in slide-in-from-bottom duration-300">
            {/* Handle indicator */}
            <div className="flex justify-center pt-3 pb-1">
              <div className="h-1 w-8 rounded-full bg-rule-strong" />
            </div>
            <div className="sticky top-0 flex items-center justify-between border-b border-rule bg-white px-5 py-3.5">
              <h2 className="font-display text-[19px] font-semibold">Filters</h2>
              <button onClick={() => setFiltersOpen(false)} aria-label="Close filters" className="rounded-lg p-1.5 text-muted hover:bg-surface">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="px-5 py-5">{filterRail}</div>
            <div className="sticky bottom-0 border-t border-rule bg-white px-5 py-4">
              <Button fullWidth variant="brass" onClick={() => setFiltersOpen(false)}>
                Show {result?.total ?? 0} {result?.total === 1 ? "item" : "items"}
              </Button>
            </div>
          </div>
        </div>
      )}

      <SiteFooter
        storeName={settings?.storeName ?? "Aperio Vici Bookshops & Gifts"}
        phone={settings?.phone ?? ""}
        email={settings?.email ?? ""}
        address={settings?.address ?? ""}
      />
    </>
  );
}

export default function ShopPage() {
  return (
    <Suspense
      fallback={
        <div className="mx-auto max-w-[1240px] px-4 py-10">
          <Skeleton className="h-9 w-64" />
        </div>
      }
    >
      <ShopContent />
    </Suspense>
  );
}
