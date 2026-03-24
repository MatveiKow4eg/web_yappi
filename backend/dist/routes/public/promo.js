"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = publicPromoRoutes;
const prisma_1 = require("../../lib/prisma");
const session_1 = require("../../lib/session");
const zod_1 = require("zod");
const PromoSchema = zod_1.z.object({
    code: zod_1.z.string().min(1),
    subtotal: zod_1.z.number().positive(),
    phone: zod_1.z.string().optional(),
});
async function publicPromoRoutes(app) {
    app.post("/promo-codes/validate", async (req, reply) => {
        const parsed = PromoSchema.safeParse(req.body);
        if (!parsed.success)
            return (0, session_1.err)(reply, parsed.error.message);
        const { code, subtotal, phone } = parsed.data;
        const promo = await prisma_1.prisma.promoCode.findFirst({
            where: {
                code: code.toUpperCase(),
                is_active: true,
                OR: [{ valid_from: null }, { valid_from: { lte: new Date() } }],
                AND: [{ OR: [{ valid_to: null }, { valid_to: { gte: new Date() } }] }],
            },
        });
        if (!promo)
            return (0, session_1.err)(reply, "Промокод не найден или истёк", 404);
        if (promo.min_order_amount && subtotal < parseFloat(promo.min_order_amount.toString())) {
            return (0, session_1.err)(reply, `Минимальная сумма: ${parseFloat(promo.min_order_amount.toString()).toFixed(2)} €`, 422);
        }
        if (phone && promo.usage_limit_per_phone) {
            const count = await prisma_1.prisma.promoCodeUsage.count({ where: { promo_code_id: promo.id, phone } });
            if (count >= promo.usage_limit_per_phone)
                return (0, session_1.err)(reply, "Вы уже использовали этот промокод", 422);
        }
        if (promo.usage_limit_total) {
            const total = await prisma_1.prisma.promoCodeUsage.count({ where: { promo_code_id: promo.id } });
            if (total >= promo.usage_limit_total)
                return (0, session_1.err)(reply, "Промокод больше не действителен", 422);
        }
        let discountAmount = promo.discount_type === "percent"
            ? (subtotal * parseFloat(promo.discount_value.toString())) / 100
            : parseFloat(promo.discount_value.toString());
        if (promo.max_discount_amount) {
            discountAmount = Math.min(discountAmount, parseFloat(promo.max_discount_amount.toString()));
        }
        return (0, session_1.ok)(reply, {
            code: promo.code,
            discount_type: promo.discount_type,
            discount_value: parseFloat(promo.discount_value.toString()),
            discount_amount: discountAmount,
            description: promo.description,
        });
    });
}
