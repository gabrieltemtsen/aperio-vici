"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { Id } from "@convex/_generated/dataModel";

export type CartLine = {
  productId: Id<"products">;
  title: string;
  author?: string;
  slug: string;
  price: number; // kobo, for display only — the server re-prices at checkout
  imageUrl?: string | null;
  kind: "book" | "gift";
  maxStock: number;
  quantity: number;
};

type CartState = {
  lines: CartLine[];
  isOpen: boolean;
  add: (line: Omit<CartLine, "quantity">, quantity?: number) => void;
  setQuantity: (productId: Id<"products">, quantity: number) => void;
  remove: (productId: Id<"products">) => void;
  clear: () => void;
  open: () => void;
  close: () => void;
  toggle: () => void;
};

/**
 * Two independent carts: the customer's basket persists across visits, the
 * register's does not — a cashier's half-finished sale must never reappear for
 * the next customer or the next shift.
 */
function createCartStore(storageKey: string | null) {
  const definition = (set: any, get: any): CartState => ({
    lines: [],
    isOpen: false,

    add: (line, quantity = 1) => {
      const lines = [...get().lines];
      const existing = lines.findIndex((l) => l.productId === line.productId);

      if (existing >= 0) {
        const next = lines[existing].quantity + quantity;
        lines[existing] = {
          ...lines[existing],
          ...line,
          quantity: Math.min(next, line.maxStock || 99),
        };
      } else {
        lines.push({ ...line, quantity: Math.min(quantity, line.maxStock || 99) });
      }
      set({ lines });
    },

    setQuantity: (productId, quantity) => {
      if (quantity <= 0) {
        set({ lines: get().lines.filter((l: CartLine) => l.productId !== productId) });
        return;
      }
      set({
        lines: get().lines.map((l: CartLine) =>
          l.productId === productId
            ? { ...l, quantity: Math.min(quantity, l.maxStock || 99) }
            : l,
        ),
      });
    },

    remove: (productId) =>
      set({ lines: get().lines.filter((l: CartLine) => l.productId !== productId) }),

    clear: () => set({ lines: [], isOpen: false }),
    open: () => set({ isOpen: true }),
    close: () => set({ isOpen: false }),
    toggle: () => set({ isOpen: !get().isOpen }),
  });

  if (!storageKey) return create<CartState>()(definition);

  return create<CartState>()(
    persist(definition, {
      name: storageKey,
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ lines: state.lines }) as CartState,
    }),
  );
}

export const useCart = createCartStore("aperio-vici-basket");
export const useRegister = createCartStore(null);

export function cartSubtotal(lines: CartLine[]): number {
  return lines.reduce((sum, l) => sum + l.price * l.quantity, 0);
}

export function cartCount(lines: CartLine[]): number {
  return lines.reduce((sum, l) => sum + l.quantity, 0);
}
