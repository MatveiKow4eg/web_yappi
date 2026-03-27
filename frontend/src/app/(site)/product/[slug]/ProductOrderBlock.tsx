"use client";

import { useState } from "react";
import AddToCartButton from "@/components/ui/AddToCartButton";
import { resolveProductImageSrc } from "@/lib/utils";

interface Props {
  product_id: string;
  name: string;
  image_url?: string | null;
  base_price: number;
  old_price?: number | null;
  pieces_total?: number | null;
  allow_half_half: boolean;
  half_half_price?: number | null;
  half_half_old_price?: number | null;
  is_available: boolean;
}

export default function ProductOrderBlock({
  product_id,
  name,
  image_url,
  base_price,
  old_price,
  pieces_total,
  allow_half_half,
  half_half_price,
  half_half_old_price,
  is_available,
}: Props) {
  const [mode, setMode] = useState<"full" | "half_half">("full");

  const isHalf = allow_half_half && mode === "half_half";
  const activePrice = isHalf ? (half_half_price ?? base_price / 2) : base_price;
  const activeOldPrice = isHalf ? half_half_old_price : old_price;
  const activePieces =
    pieces_total != null
      ? isHalf
        ? Math.floor(pieces_total / 2)
        : pieces_total
      : null;

  const resolvedImage = resolveProductImageSrc(image_url ?? undefined);

  return (
    <div className="space-y-4">
      {/* Format toggle */}
      {allow_half_half && (
        <div>
          <p className="text-sm text-brand-text-muted mb-2">Формат заказа</p>
          <div className="inline-flex rounded-xl overflow-hidden border border-white/10">
            <button
              onClick={() => setMode("full")}
              className={`px-4 py-2 text-sm font-semibold transition-colors ${
                mode === "full"
                  ? "bg-brand-red text-white"
                  : "bg-brand-gray-mid text-brand-text-muted hover:text-white"
              }`}
            >
              Полный набор
            </button>
            <button
              onClick={() => setMode("half_half")}
              className={`px-4 py-2 text-sm font-semibold transition-colors ${
                mode === "half_half"
                  ? "bg-brand-red text-white"
                  : "bg-brand-gray-mid text-brand-text-muted hover:text-white"
              }`}
            >
              50/50
            </button>
          </div>
          {mode === "half_half" && (
            <p className="text-xs text-brand-text-muted mt-2">
              Половина набора — можно скомбинировать 2 разных вкуса
            </p>
          )}
        </div>
      )}

      {/* Price */}
      <div className="flex items-center gap-3">
        <span className="text-3xl font-black text-brand-red">
          {activePrice.toFixed(2)} €
        </span>
        {activeOldPrice && (
          <span className="text-brand-text-muted line-through text-lg">
            {Number(activeOldPrice).toFixed(2)} €
          </span>
        )}
        {activePieces != null && (
          <span className="text-brand-text-muted text-sm">
            {activePieces} шт{isHalf ? " / половина" : ""}
          </span>
        )}
      </div>

      {/* Add to cart */}
      <div>
        {is_available ? (
          <AddToCartButton
            product_id={product_id}
            name={isHalf ? `${name} (50/50)` : name}
            image_url={resolvedImage ?? undefined}
            unit_price={activePrice}
            mode={mode}
          />
        ) : (
          <div className="w-full py-4 text-center rounded-xl bg-brand-gray-mid text-brand-text-muted font-semibold">
            Нет в наличии
          </div>
        )}
      </div>
    </div>
  );
}
