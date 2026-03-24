/**
 * Utility to generate a unique order number like YS-240324-1234
 */
export function generateOrderNumber(): string {
  const date = new Date();
  const d = date.toISOString().slice(2, 10).replace(/-/g, "");
  const rand = Math.floor(1000 + Math.random() * 9000);
  return `YS-${d}-${rand}`;
}

/**
 * Generate a random public tracking token
 */
export function generateStatusToken(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let result = "";
  for (let i = 0; i < 12; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

/**
 * Format price to "12.50 €"
 */
export function formatPrice(amount: number | string | { toString(): string }): string {
  const num = typeof amount === "number" ? amount : parseFloat(amount.toString());
  return `${num.toFixed(2)} €`;
}

/**
 * Get localized value from an object with _ru / _en / _et fields
 */
export function getLocalized(
  obj: Record<string, string | null | undefined>,
  field: string,
  locale: string = "ru"
): string {
  return obj[`${field}_${locale}`] ?? obj[`${field}_ru`] ?? obj[`${field}_en`] ?? "";
}

/**
 * Resolve product image reference to a browser URL.
 * Supports:
 * - Full URL: https://...
 * - Absolute app path: /images/...
 * - Code format: "# nnn" or "nnn" -> /images/sushi/nnn.png
 */
export function resolveProductImageSrc(imageRef?: string | null): string | undefined {
  const value = (imageRef ?? "").trim();
  if (!value) return undefined;

  if (value.startsWith("http://") || value.startsWith("https://")) {
    return value;
  }

  if (value.startsWith("/")) {
    return value;
  }

  const numericCode = value.replace(/^#/, "").trim();
  if (/^\d+$/.test(numericCode)) {
    return `/images/sushi/${numericCode}.png`;
  }

  return undefined;
}
