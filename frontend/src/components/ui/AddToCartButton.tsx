"use client";

import { useCart } from "@/lib/cart-context";

interface AddToCartButtonProps {
  product_id: string;
  product_variant_id?: string;
  name: string;
  variant_name?: string;
  image_url?: string;
  unit_price: number;
  selections?: {
    option_item_id: string;
    option_group_name: string;
    option_item_name: string;
    price_delta: number;
    quantity: number;
  }[];
  disabled?: boolean;
  className?: string;
}

export default function AddToCartButton({
  product_id,
  product_variant_id,
  name,
  variant_name,
  image_url,
  unit_price,
  selections = [],
  disabled,
  className,
}: AddToCartButtonProps) {
  const { addItem } = useCart();

  function handleAdd() {
    addItem({
      product_id,
      product_variant_id,
      name,
      variant_name,
      image_url,
      unit_price,
      selections,
    });
  }

  return (
    <button
      onClick={handleAdd}
      disabled={disabled}
      className={className ?? "btn-primary w-full py-4 text-base"}
    >
      Добавить в корзину
    </button>
  );
}
