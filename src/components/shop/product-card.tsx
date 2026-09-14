"use client";

import Link from "next/link";
import { useState } from "react";
import { BookCover } from "./book-cover";
import { formatNaira } from "@/lib/format";
import { useCart } from "@/lib/cart-store";
import { useToast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";
import { Plus, Check, ShoppingBag } from "lucide-react";
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
          "relative overflow-hidden rounded-xl border border-rule/70 bg-surface",
          "shadow-[var(--shadow-book)] transition-all duration-[var(--duration-normal)]",
          "group-hover:-translate-y-2 group-hover:shadow-[var(--shadow-book-hover)]",
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
          <div className="absolute inset-0 flex items-center justify-center glass-dark">
            <span className="rounded-full bg-white/95 px-4 py-1.5 text-[12px] font-bold uppercase tracking-wider text-ink shadow-sm">
              Sold out
            </span>
          </div>
        )}
        
        {reduced && !outOfStock && (
          <span className="absolute left-2.5 top-2.5 rounded-full gradient-brass px-2.5 py-0.5 text-[10.5px] font-bold uppercase tracking-wider text-white shadow-md ring-1 ring-white/20">
            {Math.round((1 - product.price / product.compareAtPrice!) * 100)}% off
          </span>
        )}

        {!outOfStock && (
          <button
            onClick={addToBasket}
            aria-label={`Add ${product.title} to basket`}
            className={cn(
              "absolute bottom-3 right-3 flex h-10 w-10 items-center justify-center rounded-full",
              "shadow-[var(--shadow-lift)] ring-1 ring-black/8 transition-all duration-[var(--duration-normal)]",
              "hover:scale-110 active:scale-95 focus-visible:opacity-100",
              added
                ? "bg-leaf text-white ring-leaf pop-in"
                : "bg-white text-ink sm:translate-y-2 sm:opacity-0 sm:group-hover:translate-y-0 sm:group-hover:opacity-100",
            )}
          >
            {added ? <Check className="h-4 w-4 stroke-[2.5]" /> : <Plus className="h-4.5 w-4.5 stroke-[2]" />}
          </button>
        )}
      </div>

      <div className="mt-3.5 flex flex-1 flex-col">
        <h3 className="font-display text-[15.5px] leading-[1.25] text-ink transition-colors duration-200 group-hover:text-brass-deep line-clamp-2">
          {product.title}
        </h3>
        {product.author && (
          <p className="mt-1 text-[13px] text-muted truncate">{product.author}</p>
        )}
        <div className="mt-auto flex items-baseline gap-2.5 pt-3">
          <span className="figure text-[16px] font-bold text-ink">
            {formatNaira(product.price)}
          </span>
          {reduced && (
            <span className="figure text-[13px] text-faint line-through">
              {formatNaira(product.compareAtPrice!)}
            </span>
          )}
          {lastFew && (
            <span className="ml-auto inline-flex items-center gap-1 text-[11.5px] font-semibold text-amber">
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
    <div className="grid grid-cols-2 gap-x-5 gap-y-10 sm:grid-cols-3 lg:grid-cols-4 lg:gap-x-6">
      {products.map((product) => (
        <ProductCard key={product._id} product={product} />
      ))}
    </div>
  );
}
