"use client";

import { useCart } from "@/lib/cart-context";
import { resolveProductImageSrc } from "@/lib/utils";

interface Props {
  product_id: string;
  name: string;
  image_url?: string;
  price: number;
}

export default function MenuAddToCart({ product_id, name, image_url, price }: Props) {
  const { addItem } = useCart();

  return (
    <button
      onClick={(e) => {
        e.preventDefault();
        addItem({
          product_id,
          name,
          image_url: resolveProductImageSrc(image_url),
          unit_price: price,
          selections: [],
        });
      }}
      className="w-8 h-8 rounded-xl bg-brand-red hover:bg-brand-red-dark flex items-center justify-center text-white transition-all active:scale-90 flex-shrink-0"
      aria-label="Добавить в корзину"
    >
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
      </svg>
    </button>
  );
}
