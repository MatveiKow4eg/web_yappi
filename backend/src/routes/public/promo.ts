import { FastifyInstance } from "fastify";
import { prisma } from "../../lib/prisma";
import { ok, err } from "../../lib/session";
import { z } from "zod";

const PromoSchema = z.object({
  code: z.string().min(1),
  subtotal: z.number().positive(),
  phone: z.string().optional(),
});

export default async function publicPromoRoutes(app: FastifyInstance) {
  app.post("/promo-codes/validate", async (req, reply) => {
    const parsed = PromoSchema.safeParse(req.body);
    if (!parsed.success) return err(reply, parsed.error.message);

    const { code, subtotal, phone } = parsed.data;

    const promo = await prisma.promoCode.findFirst({
      where: {
        code: code.toUpperCase(),
        is_active: true,
        OR: [{ valid_from: null }, { valid_from: { lte: new Date() } }],
        AND: [{ OR: [{ valid_to: null }, { valid_to: { gte: new Date() } }] }],
      },
    });

    if (!promo) return err(reply, "Промокод не найден или истёк", 404);

    if (promo.min_order_amount && subtotal < parseFloat(promo.min_order_amount.toString())) {
      return err(reply, `Минимальная сумма: ${parseFloat(promo.min_order_amount.toString()).toFixed(2)} €`, 422);
    }

    if (phone && promo.usage_limit_per_phone) {
      const count = await prisma.promoCodeUsage.count({ where: { promo_code_id: promo.id, phone } });
      if (count >= promo.usage_limit_per_phone) return err(reply, "Вы уже использовали этот промокод", 422);
    }

    if (promo.usage_limit_total) {
      const total = await prisma.promoCodeUsage.count({ where: { promo_code_id: promo.id } });
      if (total >= promo.usage_limit_total) return err(reply, "Промокод больше не действителен", 422);
    }

    let discountAmount = promo.discount_type === "percent"
      ? (subtotal * parseFloat(promo.discount_value.toString())) / 100
      : parseFloat(promo.discount_value.toString());

    if (promo.max_discount_amount) {
      discountAmount = Math.min(discountAmount, parseFloat(promo.max_discount_amount.toString()));
    }

    return ok(reply, {
      code: promo.code,
      discount_type: promo.discount_type,
      discount_value: parseFloat(promo.discount_value.toString()),
      discount_amount: discountAmount,
      description: promo.description,
    });
  });
}
