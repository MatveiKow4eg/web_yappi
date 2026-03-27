"use client";

import React, { createContext, useContext, useEffect, useState, useCallback } from "react";

// ─── Types ─────────────────────────────────────────────────────────────────

export interface CartSelection {
  option_item_id: string;
  option_group_name: string;
  option_item_name: string;
  price_delta: number;
  quantity: number;
}

export interface CartItem {
  /** unique key = product_id + variant_id + mode + selections hash */
  key: string;
  product_id: string;
  product_variant_id?: string;
  name: string;
  variant_name?: string;
  image_url?: string;
  unit_price: number;
  quantity: number;
  mode?: "full" | "half_half";
  selections: CartSelection[];
}

interface CartContextValue {
  items: CartItem[];
  totalItems: number;
  subtotal: number;
  addItem: (item: Omit<CartItem, "key" | "quantity"> & { quantity?: number }) => void;
  removeItem: (key: string) => void;
  updateQuantity: (key: string, quantity: number) => void;
  clearCart: () => void;
}

// ─── Context ────────────────────────────────────────────────────────────────

const CartContext = createContext<CartContextValue | null>(null);
const STORAGE_KEY = "yappi_cart";

function buildKey(
  product_id: string,
  product_variant_id?: string,
  mode?: "full" | "half_half",
  selections?: CartSelection[]
): string {
  const selKey = (selections ?? [])
    .map((s) => `${s.option_item_id}:${s.quantity}`)
    .sort()
    .join("|");
  return `${product_id}_${product_variant_id ?? ""}_${mode ?? "full"}__${selKey}`;
}

// ─── Provider ───────────────────────────────────────────────────────────────

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);

  // Hydrate from localStorage — once, client only
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setItems(JSON.parse(raw));
    } catch {
      // ignore parse errors
    }
  }, []);

  // Persist on change
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  }, [items]);

  const addItem = useCallback(
    (item: Omit<CartItem, "key" | "quantity"> & { quantity?: number }) => {
      const key = buildKey(item.product_id, item.product_variant_id, item.mode, item.selections);
      setItems((prev) => {
        const existing = prev.find((i) => i.key === key);
        if (existing) {
          return prev.map((i) =>
            i.key === key ? { ...i, quantity: i.quantity + (item.quantity ?? 1) } : i
          );
        }
        return [...prev, { ...item, key, quantity: item.quantity ?? 1 }];
      });
    },
    []
  );

  const removeItem = useCallback((key: string) => {
    setItems((prev) => prev.filter((i) => i.key !== key));
  }, []);

  const updateQuantity = useCallback((key: string, quantity: number) => {
    if (quantity <= 0) {
      setItems((prev) => prev.filter((i) => i.key !== key));
    } else {
      setItems((prev) => prev.map((i) => (i.key === key ? { ...i, quantity } : i)));
    }
  }, []);

  const clearCart = useCallback(() => setItems([]), []);

  const totalItems = items.reduce((s, i) => s + i.quantity, 0);
  const subtotal = items.reduce((s, i) => s + i.unit_price * i.quantity, 0);

  return (
    <CartContext.Provider
      value={{ items, totalItems, subtotal, addItem, removeItem, updateQuantity, clearCart }}
    >
      {children}
    </CartContext.Provider>
  );
}

// ─── Hook ───────────────────────────────────────────────────────────────────

export function useCart(): CartContextValue {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used inside CartProvider");
  return ctx;
}
