"use client";

import { useState } from "react";
import AddToCartButton from "@/components/ui/AddToCartButton";
import { resolveProductImageSrc } from "@/lib/utils";

interface Props {
  product_id: string;
  name: string;
  image_url?: string | null;
  base_price: number;
  pieces_total?: number | null;
  variant1_pieces?: number | null;
  variant1_price?: number | null;
  variant2_pieces?: number | null;
  variant2_price?: number | null;
  is_available: boolean;
}

type Mode = "full" | "v1" | "v2";

export default function ProductOrderBlock({
  product_id,
  name,
  image_url,
  base_price,
  pieces_total,
  variant1_pieces,
  variant1_price,
  variant2_pieces,
  variant2_price,
  is_available,
}: Props) {
  const hasV1 = variant1_pieces != null && variant1_price != null;
  const hasV2 = variant2_pieces != null && variant2_price != null;
  const hasVariants = hasV1 || hasV2;

  const [mode, setMode] = useState<Mode>("full");

  const activePrice =
    mode === "v1" ? (variant1_price ?? base_price)
    : mode === "v2" ? (variant2_price ?? base_price)
    : base_price;

  const activePieces =
    mode === "v1" ? variant1_pieces
    : mode === "v2" ? variant2_pieces
    : pieces_total ?? null;

  const resolvedImage = resolveProductImageSrc(image_url ?? undefined);

  const tabLabel = (m: Mode) => {
    if (m === "full") return pieces_total ? `${pieces_total} шт` : "Полный набор";
    if (m === "v1") return `${variant1_pieces} шт`;
    return `${variant2_pieces} шт`;
  };

  const cartName =
    mode === "full" ? name
    : `${name} (${activePieces} шт)`;

  return (
    <div className="space-y-4">
      {/* Variant tabs */}
      {hasVariants && (
        <div>
          <p className="text-sm text-brand-text-muted mb-2">Размер набора</p>
          <div className="inline-flex rounded-xl overflow-hidden border border-white/10">
            <button
              onClick={() => setMode("full")}
              className={`px-4 py-2 text-sm font-semibold transition-colors ${
                mode === "full"
                  ? "bg-brand-red text-white"
                  : "bg-brand-gray-mid text-brand-text-muted hover:text-white"
              }`}
            >
              {tabLabel("full")}
            </button>
            {hasV1 && (
              <button
                onClick={() => setMode("v1")}
                className={`px-4 py-2 text-sm font-semibold transition-colors ${
                  mode === "v1"
                    ? "bg-brand-red text-white"
                    : "bg-brand-gray-mid text-brand-text-muted hover:text-white"
                }`}
              >
                {tabLabel("v1")}
              </button>
            )}
            {hasV2 && (
              <button
                onClick={() => setMode("v2")}
                className={`px-4 py-2 text-sm font-semibold transition-colors ${
                  mode === "v2"
                    ? "bg-brand-red text-white"
                    : "bg-brand-gray-mid text-brand-text-muted hover:text-white"
                }`}
              >
                {tabLabel("v2")}
              </button>
            )}
          </div>
        </div>
      )}

      {/* Price */}
      <div className="flex items-center gap-3">
        <span className="text-3xl font-black text-brand-red">
          {Number(activePrice).toFixed(2)} €
        </span>
        {activePieces != null && (
          <span className="text-brand-text-muted text-sm">
            {activePieces} шт
          </span>
        )}
      </div>

      {/* Add to cart */}
      <div>
        {is_available ? (
          <AddToCartButton
            product_id={product_id}
            name={cartName}
            image_url={resolvedImage ?? undefined}
            unit_price={Number(activePrice)}
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
