"use client";

import Link from "next/link";
import { useState } from "react";
import { BookCover } from "./book-cover";
import { formatNaira } from "@/lib/format";
import { useCart } from "@/lib/cart-store";
import { useToast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";
import { Plus, Check } from "lucide-react";
import type { Id } from "@convex/_generated/dataModel";

export type CardProduct = {
  _id: Id<"products">;
  title: string;
  slug: string;
  author?: string;
  kind: "book" | "gift";
  price: number;
  compareAtPrice?: number;
  stock: number;
  coverImage: string | null;
};

export function ProductCard({ product }: { product: CardProduct }) {
  const add = useCart((s) => s.add);
  const openCart = useCart((s) => s.open);
  const { notify } = useToast();
  const [added, setAdded] = useState(false);

  const outOfStock = product.stock <= 0;
  const lastFew = !outOfStock && product.stock <= 3;
  const reduced = product.compareAtPrice && product.compareAtPrice > product.price;

  function addToBasket(e: React.MouseEvent) {
    e.preventDefault();
    if (outOfStock) return;
    add({
      productId: product._id,
      title: product.title,
      author: product.author,
      slug: product.slug,
      price: product.price,
      imageUrl: product.coverImage,
      kind: product.kind,
      maxStock: product.stock,
    });
    setAdded(true);
    notify(`${product.title} added to your basket`, "good");
    setTimeout(() => setAdded(false), 1600);
    openCart();
  }

  return (
    <Link href={`/product/${product.slug}`} className="group flex flex-col">
      <div
        className={cn(
          "relative overflow-hidden rounded-[var(--radius-sheet)] border border-rule/80 bg-surface",
          "shadow-[var(--shadow-book)] transition-all duration-300 ease-out",
          "group-hover:-translate-y-1.5 group-hover:shadow-[var(--shadow-book-hover)]",
          // Books are tall, gifts are square. The grid does not pretend otherwise.
          product.kind === "book" ? "aspect-[2/3]" : "aspect-square",
        )}
      >
        <BookCover
          title={product.title}
          author={product.author}
          kind={product.kind}
          imageUrl={product.coverImage}
        />

        {outOfStock && (
          <div className="absolute inset-0 flex items-end bg-ink-deep/60 backdrop-blur-xs p-3">
            <span className="rounded-[var(--radius-pill)] bg-white/95 px-2.5 py-1 text-[11.5px] font-semibold tracking-wide text-ink shadow-sm">
              Out of stock
            </span>
          </div>
        )}
        
        {reduced && !outOfStock && (
          <span className="absolute left-2.5 top-2.5 rounded-[3px] bg-gradient-to-r from-brass to-brass-deep px-2 py-0.5 text-[10.5px] font-bold uppercase tracking-wider text-white shadow-sm ring-1 ring-white/20">
            {Math.round((1 - product.price / product.compareAtPrice!) * 100)}% off
          </span>
        )}

        {!outOfStock && (
          <button
            onClick={addToBasket}
            aria-label={`Add ${product.title} to basket`}
            className={cn(
              "absolute bottom-2.5 right-2.5 flex h-9 w-9 items-center justify-center rounded-full bg-white",
              "text-ink shadow-[var(--shadow-lift)] ring-1 ring-black/10 transition-all duration-200",
              "hover:bg-ink hover:text-white active:scale-90 focus-visible:opacity-100",
              added ? "bg-leaf text-white hover:bg-leaf ring-leaf" : "sm:opacity-0 sm:group-hover:opacity-100",
            )}
          >
            {added ? <Check className="h-4 w-4 stroke-[2.5]" /> : <Plus className="h-4 w-4 stroke-[2.5]" />}
          </button>
        )}
      </div>

      <div className="mt-3 flex flex-1 flex-col">
        <h3 className="font-display text-[16px] leading-[1.25] text-ink transition-colors group-hover:text-brass-deep line-clamp-2">
          {product.title}
        </h3>
        {product.author && (
          <p className="mt-1 text-[13px] text-muted truncate">{product.author}</p>
        )}
        <div className="mt-auto flex items-baseline gap-2 pt-2.5">
          <span className="figure text-[15.5px] font-bold text-ink">
            {formatNaira(product.price)}
          </span>
          {reduced && (
            <span className="figure text-[13px] text-faint line-through">
              {formatNaira(product.compareAtPrice!)}
            </span>
          )}
          {lastFew && (
            <span className="ml-auto inline-flex items-center gap-1 text-[11.5px] font-medium text-amber">
              <span className="h-1.5 w-1.5 rounded-full bg-amber pulse-soft" />
              {product.stock} left
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}

export function ProductGrid({ products }: { products: CardProduct[] }) {
  return (
    <div className="grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3 lg:grid-cols-4 lg:gap-x-6">
      {products.map((product) => (
        <ProductCard key={product._id} product={product} />
      ))}
    </div>
  );
}
