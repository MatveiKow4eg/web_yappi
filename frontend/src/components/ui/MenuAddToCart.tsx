"use client";

import { useCart } from "@/lib/cart-context";
import { resolveProductImageSrc } from "@/lib/utils";
import { useEffect, useRef, useState } from "react";

interface Props {
  product_id: string;
  name: string;
  image_url?: string;
  price: number;
  pieces_total?: number | null;
  variant1_pieces?: number | null;
  variant1_price?: number | null;
  variant2_pieces?: number | null;
  variant2_price?: number | null;
}

export default function MenuAddToCart({
  product_id,
  name,
  image_url,
  price,
  pieces_total,
  variant1_pieces,
  variant1_price,
  variant2_pieces,
  variant2_price,
}: Props) {
  const { addItem } = useCart();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const resolvedImage = resolveProductImageSrc(image_url);

  const hasV1 = variant1_pieces != null && variant1_price != null;
  const hasV2 = variant2_pieces != null && variant2_price != null;
  const hasVariants = hasV1 || hasV2;

  // Build options list
  const options: { label: string; pieces: number | null; unit_price: number; mode: "full" | "v1" | "v2" }[] = [
    { label: pieces_total ? `${pieces_total} шт` : "Полный набор", pieces: pieces_total ?? null, unit_price: price, mode: "full" },
    ...(hasV1 ? [{ label: `${variant1_pieces} шт`, pieces: variant1_pieces!, unit_price: variant1_price!, mode: "v1" as const }] : []),
    ...(hasV2 ? [{ label: `${variant2_pieces} шт`, pieces: variant2_pieces!, unit_price: variant2_price!, mode: "v2" as const }] : []),
  ];

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    function handle(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, [open]);

  function addOption(opt: typeof options[0]) {
    addItem({
      product_id,
      name: opt.mode === "full" ? name : `${name} (${opt.pieces} шт)`,
      image_url: resolvedImage,
      unit_price: opt.unit_price,
      mode: opt.mode,
      selections: [],
    });
    setOpen(false);
  }

  // If no variants — add directly on click, no dropdown
  if (!hasVariants) {
    return (
      <button
        onClick={(e) => {
          e.preventDefault();
          addItem({ product_id, name, image_url: resolvedImage, unit_price: price, selections: [] });
        }}
        className="w-8 h-8 rounded-xl bg-brand-red hover:bg-brand-red-dark flex items-center justify-center text-white transition-all active:scale-90 flex-shrink-0"
        aria-label="Добавить в корзину"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13l-1.4 7h12.8M7 13L5.4 5M10 19a1 1 0 100 2 1 1 0 000-2zm7 0a1 1 0 100 2 1 1 0 000-2z" />
        </svg>
      </button>
    );
  }

  return (
    <div ref={ref} className="relative flex-shrink-0">
      <button
        onClick={(e) => {
          e.preventDefault();
          setOpen((v) => !v);
        }}
        className="w-8 h-8 rounded-xl bg-brand-red hover:bg-brand-red-dark flex items-center justify-center text-white transition-all active:scale-90"
        aria-label="Выбрать размер и добавить в корзину"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13l-1.4 7h12.8M7 13L5.4 5M10 19a1 1 0 100 2 1 1 0 000-2zm7 0a1 1 0 100 2 1 1 0 000-2z" />
        </svg>
      </button>

      {open && (
        <div className="absolute bottom-10 right-0 z-50 min-w-[160px] rounded-xl bg-brand-gray-dark border border-white/10 shadow-xl overflow-hidden">
          {options.map((opt) => (
            <button
              key={opt.mode}
              onClick={(e) => { e.preventDefault(); addOption(opt); }}
              className="w-full flex items-center justify-between gap-4 px-4 py-2.5 text-sm hover:bg-brand-gray-mid transition-colors text-left"
            >
              <span className="text-white font-semibold">{opt.label}</span>
              <span className="text-brand-red font-black whitespace-nowrap">{opt.unit_price.toFixed(2)} €</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
