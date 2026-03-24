import { prisma } from "@/lib/prisma";
import { apiSuccess, apiError } from "@/lib/api-response";
import { NextRequest } from "next/server";
import { z } from "zod";

const Schema = z.object({
  code: z.string().min(1),
  subtotal: z.number().positive(),
  phone: z.string().optional(),
});

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  if (!body) return apiError("Invalid JSON");

  const parsed = Schema.safeParse(body);
  if (!parsed.success) return apiError(parsed.error.message);

  const { code, subtotal, phone } = parsed.data;

  const promo = await prisma.promoCode.findFirst({
    where: {
      code: code.toUpperCase(),
      is_active: true,
      OR: [{ valid_from: null }, { valid_from: { lte: new Date() } }],
      AND: [{ OR: [{ valid_to: null }, { valid_to: { gte: new Date() } }] }],
    },
  });

  if (!promo) return apiError("Промокод не найден или истёк", 404);

  if (promo.min_order_amount && subtotal < parseFloat(promo.min_order_amount.toString())) {
    return apiError(
      `Минимальная сумма заказа для этого промокода: ${parseFloat(promo.min_order_amount.toString()).toFixed(2)} €`,
      422
    );
  }

  // Check per-phone usage limit
  if (phone && promo.usage_limit_per_phone) {
    const usageCount = await prisma.promoCodeUsage.count({
      where: { promo_code_id: promo.id, phone },
    });
    if (usageCount >= promo.usage_limit_per_phone) {
      return apiError("Вы уже использовали этот промокод", 422);
    }
  }

  // Check total usage limit
  if (promo.usage_limit_total) {
    const totalUsage = await prisma.promoCodeUsage.count({
      where: { promo_code_id: promo.id },
    });
    if (totalUsage >= promo.usage_limit_total) {
      return apiError("Промокод больше не действителен", 422);
    }
  }

  let discountAmount =
    promo.discount_type === "percent"
      ? (subtotal * parseFloat(promo.discount_value.toString())) / 100
      : parseFloat(promo.discount_value.toString());

  if (promo.max_discount_amount) {
    discountAmount = Math.min(discountAmount, parseFloat(promo.max_discount_amount.toString()));
  }

  return apiSuccess({
    code: promo.code,
    discount_type: promo.discount_type,
    discount_value: parseFloat(promo.discount_value.toString()),
    discount_amount: discountAmount,
    description: promo.description,
  });
}
