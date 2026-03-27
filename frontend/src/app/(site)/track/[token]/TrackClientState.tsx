"use client";

import { useEffect } from "react";

const CART_STORAGE_KEY = "yappi_cart";
const CHECKOUT_DRAFT_KEY = "yappi_checkout_draft";

export default function TrackClientState({ paid }: { paid: boolean }) {
  useEffect(() => {
    if (!paid) return;

    localStorage.removeItem(CART_STORAGE_KEY);
    sessionStorage.removeItem(CHECKOUT_DRAFT_KEY);
  }, [paid]);

  return null;
}
