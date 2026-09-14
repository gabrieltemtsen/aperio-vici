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
          "relative overflow-hidden rounded-[var(--radius-sheet)] border border-rule bg-surface",
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
          <div className="absolute inset-0 flex items-end bg-white/70 p-3">
            <span className="rounded-[var(--radius-pill)] bg-ink px-2.5 py-1 text-[12px] font-medium text-white">
              Out of stock
            </span>
          </div>
        )}
        {reduced && !outOfStock && (
          <span className="absolute left-2 top-2 rounded-[2px] bg-brass px-1.5 py-0.5 text-[11px] font-semibold text-ink-deep">
            {Math.round((1 - product.price / product.compareAtPrice!) * 100)}% off
          </span>
        )}

        {!outOfStock && (
          <button
            onClick={addToBasket}
            aria-label={`Add ${product.title} to basket`}
            className="absolute bottom-2 right-2 flex h-9 w-9 items-center justify-center rounded-full bg-white
                       text-ink shadow-[var(--shadow-drop)] ring-1 ring-rule transition
                       hover:bg-ink hover:text-white focus-visible:opacity-100
                       sm:opacity-0 sm:group-hover:opacity-100"
          >
            {added ? <Check className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
          </button>
        )}
      </div>

      <div className="mt-2.5 flex flex-1 flex-col">
        <h3 className="font-display text-[16px] leading-tight text-ink group-hover:text-brass-deep">
          {product.title}
        </h3>
        {product.author && (
          <p className="mt-0.5 text-[13px] text-muted">{product.author}</p>
        )}
        <div className="mt-auto flex items-baseline gap-2 pt-2">
          <span className="figure text-[15px] font-semibold text-ink">
            {formatNaira(product.price)}
          </span>
          {reduced && (
            <span className="figure text-[13px] text-faint line-through">
              {formatNaira(product.compareAtPrice!)}
            </span>
          )}
          {lastFew && (
            <span className="ml-auto text-[12px] text-amber">{product.stock} left</span>
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
