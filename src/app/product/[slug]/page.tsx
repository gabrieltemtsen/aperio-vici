"use client";

import Link from "next/link";
import { use, useState } from "react";
import { useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import { SiteHeader, SiteFooter } from "@/components/shop/site-header";
import { CartDrawer } from "@/components/shop/cart-drawer";
import { ProductGrid } from "@/components/shop/product-card";
import { BookCover } from "@/components/shop/book-cover";
import { Button } from "@/components/ui/button";
import { Badge, Skeleton, EmptyState } from "@/components/ui/primitives";
import { useCart } from "@/lib/cart-store";
import { useToast } from "@/components/ui/toast";
import { formatNaira } from "@/lib/format";
import { cn } from "@/lib/utils";
import { Minus, Plus, BookX, Truck, Store, ChevronRight } from "lucide-react";

export default function ProductPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  const data = useQuery(api.products.getBySlug, { slug });
  const settings = useQuery(api.settings.get);
  const add = useCart((s) => s.add);
  const openCart = useCart((s) => s.open);
  const { notify } = useToast();
  const [quantity, setQuantity] = useState(1);
  const [activeImage, setActiveImage] = useState(0);

  if (data === undefined) {
    return (
      <>
        <SiteHeader />
        <main className="mx-auto max-w-[1240px] px-4 py-10 sm:px-6">
          <div className="grid gap-10 md:grid-cols-[minmax(0,380px)_1fr]">
            <Skeleton className="aspect-[2/3] w-full" />
            <div className="space-y-3">
              <Skeleton className="h-9 w-3/4" />
              <Skeleton className="h-5 w-1/3" />
              <Skeleton className="h-24 w-full" />
            </div>
          </div>
        </main>
      </>
    );
  }

  if (data === null) {
    return (
      <>
        <SiteHeader />
        <main className="mx-auto max-w-[1240px] px-4 py-20 sm:px-6">
          <EmptyState
            icon={BookX}
            title="We could not find that one"
            description="It may have been taken off the shelves. Search for the title and we will show you what we do have."
            action={
              <Link href="/shop">
                <Button variant="secondary">Browse the shop</Button>
              </Link>
            }
          />
        </main>
      </>
    );
  }

  const { product, category, related } = data;
  const outOfStock = product.stock <= 0;
  const reduced = product.compareAtPrice && product.compareAtPrice > product.price;

  const details = [
    product.author && { label: "Author", value: product.author },
    product.publisher && { label: "Publisher", value: product.publisher },
    product.format && {
      label: "Format",
      value: product.format.charAt(0).toUpperCase() + product.format.slice(1),
    },
    product.pages && { label: "Pages", value: String(product.pages) },
    product.publishedYear && { label: "Published", value: String(product.publishedYear) },
    product.language && { label: "Language", value: product.language },
    product.isbn && { label: "ISBN", value: product.isbn },
    { label: "Shop reference", value: product.sku },
  ].filter(Boolean) as { label: string; value: string }[];

  function addToBasket() {
    add(
      {
        productId: product._id,
        title: product.title,
        author: product.author,
        slug: product.slug,
        price: product.price,
        imageUrl: product.coverImage,
        kind: product.kind,
        maxStock: product.stock,
      },
      quantity,
    );
    notify(
      quantity === 1
        ? `${product.title} added to your basket`
        : `${quantity} copies of ${product.title} added`,
      "good",
    );
    openCart();
  }

  return (
    <>
      <SiteHeader />
      <CartDrawer />

      <main className="mx-auto max-w-[1240px] px-4 py-6 sm:px-6 sm:py-10">
        <nav className="flex flex-wrap items-center gap-1 text-[13px] text-muted" aria-label="Breadcrumb">
          <Link href="/shop" className="hover:text-ink">Shop</Link>
          <ChevronRight className="h-3.5 w-3.5" aria-hidden />
          {category && (
            <>
              <Link href={`/shop?category=${category.slug}`} className="hover:text-ink">
                {category.name}
              </Link>
              <ChevronRight className="h-3.5 w-3.5" aria-hidden />
            </>
          )}
          <span className="text-ink-soft">{product.title}</span>
        </nav>

        <div className="mt-6 grid gap-8 md:grid-cols-[minmax(0,360px)_1fr] md:gap-12 lg:gap-16">
          <div>
            <div
              className={cn(
                "overflow-hidden rounded-[var(--radius-sheet)] border border-rule bg-surface",
                product.kind === "book" ? "aspect-[2/3]" : "aspect-square",
              )}
            >
              <BookCover
                title={product.title}
                author={product.author}
                kind={product.kind}
                imageUrl={product.images[activeImage] ?? null}
              />
            </div>

            {product.images.length > 1 && (
              <div className="mt-3 flex gap-2">
                {product.images.map((image, i) => (
                  <button
                    key={image}
                    onClick={() => setActiveImage(i)}
                    aria-label={`View image ${i + 1}`}
                    className={cn(
                      "h-16 w-12 overflow-hidden rounded-[2px] border",
                      i === activeImage ? "border-ink" : "border-rule",
                    )}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={image} alt="" className="h-full w-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="min-w-0">
            <h1 className="font-display text-[30px] leading-[1.1] text-ink sm:text-[38px]">
              {product.title}
            </h1>
            {product.author && (
              <p className="mt-2 font-display text-[19px] italic text-muted">{product.author}</p>
            )}

            <div className="mt-5 flex flex-wrap items-baseline gap-3">
              <span className="figure font-display text-[30px] text-ink">
                {formatNaira(product.price)}
              </span>
              {reduced && (
                <>
                  <span className="figure text-[17px] text-faint line-through">
                    {formatNaira(product.compareAtPrice!)}
                  </span>
                  <Badge tone="warn">
                    Save {formatNaira(product.compareAtPrice! - product.price)}
                  </Badge>
                </>
              )}
            </div>

            <div className="mt-3">
              {outOfStock ? (
                <Badge tone="bad">Out of stock</Badge>
              ) : product.stock <= product.lowStockThreshold ? (
                <Badge tone="warn">
                  Only {product.stock} left on the shelf
                </Badge>
              ) : (
                <Badge tone="good">In stock, ready to pack</Badge>
              )}
            </div>

            {outOfStock ? (
              <div className="mt-6 rounded-[var(--radius-sheet)] border border-rule bg-surface p-4">
                <p className="text-[14.5px] text-ink-soft">
                  We have sold out of this one. Call {settings?.phone ?? "the shop"} and we will tell
                  you when the next copies land, or order it in for you.
                </p>
              </div>
            ) : (
              <div className="mt-6 flex flex-wrap items-center gap-3">
                <div className="flex items-center rounded-[var(--radius-control)] border border-rule-strong">
                  <button
                    onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                    disabled={quantity <= 1}
                    aria-label="Reduce quantity"
                    className="flex h-11 w-11 items-center justify-center text-muted hover:text-ink disabled:text-rule-strong"
                  >
                    <Minus className="h-4 w-4" />
                  </button>
                  <span className="figure w-10 text-center text-[16px]">{quantity}</span>
                  <button
                    onClick={() => setQuantity((q) => Math.min(product.stock, q + 1))}
                    disabled={quantity >= product.stock}
                    aria-label="Increase quantity"
                    className="flex h-11 w-11 items-center justify-center text-muted hover:text-ink disabled:text-rule-strong"
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                </div>
                <Button size="lg" onClick={addToBasket} className="flex-1 sm:flex-none sm:px-10">
                  Add to basket
                </Button>
              </div>
            )}

            <div className="mt-6 flex flex-col gap-2 border-y border-rule py-4 text-[14px] text-muted">
              <span className="flex items-center gap-2.5">
                <Truck className="h-4 w-4 shrink-0 text-brass-deep" aria-hidden />
                Delivered anywhere in Nigeria. The fee is shown at checkout once you pick your state.
              </span>
              <span className="flex items-center gap-2.5">
                <Store className="h-4 w-4 shrink-0 text-brass-deep" aria-hidden />
                Or collect it from {settings?.address ?? "the shop"} at no extra cost.
              </span>
            </div>

            <div className="mt-7">
              <h2 className="text-[15px] font-semibold text-ink">About this {product.kind}</h2>
              <p className="prose-editorial mt-2 text-ink-soft">{product.description}</p>
            </div>

            <div className="mt-8">
              <h2 className="text-[15px] font-semibold text-ink">Details</h2>
              <dl className="mt-3 grid grid-cols-1 gap-x-8 sm:grid-cols-2">
                {details.map((detail) => (
                  <div
                    key={detail.label}
                    className="flex justify-between gap-4 border-b border-rule py-2 text-[14px]"
                  >
                    <dt className="text-muted">{detail.label}</dt>
                    <dd className={cn("text-right text-ink", detail.label === "ISBN" && "figure")}>
                      {detail.value}
                    </dd>
                  </div>
                ))}
              </dl>
            </div>

            {product.tags.length > 0 && (
              <div className="mt-6 flex flex-wrap gap-2">
                {product.tags.map((tag) => (
                  <Link
                    key={tag}
                    href={`/shop?q=${encodeURIComponent(tag)}`}
                    className="rounded-[var(--radius-pill)] bg-surface px-3 py-1 text-[12.5px] text-muted hover:bg-surface-deep hover:text-ink"
                  >
                    {tag}
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>

        {related.length > 0 && (
          <section className="mt-16 border-t border-rule pt-10">
            <h2 className="font-display text-[24px] text-ink">
              On the same shelf
            </h2>
            <div className="mt-6">
              <ProductGrid products={related} />
            </div>
          </section>
        )}
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
