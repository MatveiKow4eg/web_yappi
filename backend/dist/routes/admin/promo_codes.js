"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = adminPromoCodesRoutes;
const prisma_1 = require("../../lib/prisma");
const session_1 = require("../../lib/session");
const zod_1 = require("zod");
const PromoCodeSchema = zod_1.z.object({
    code: zod_1.z.string().min(2).toUpperCase(),
    description: zod_1.z.string().optional().nullable(),
    discount_type: zod_1.z.enum(["percent", "fixed"]),
    discount_value: zod_1.z.number().or(zod_1.z.string()).transform(v => parseFloat(String(v))),
    min_order_amount: zod_1.z.number().or(zod_1.z.string()).optional().transform(v => v ? parseFloat(String(v)) : null),
    max_discount_amount: zod_1.z.number().or(zod_1.z.string()).optional().transform(v => v ? parseFloat(String(v)) : null),
    usage_limit_total: zod_1.z.number().int().optional().nullable(),
    usage_limit_per_phone: zod_1.z.number().int().optional().nullable(),
    valid_from: zod_1.z.string().datetime().optional().nullable(),
    valid_to: zod_1.z.string().datetime().optional().nullable(),
    is_active: zod_1.z.boolean().default(true),
});
async function adminPromoCodesRoutes(app) {
    // GET /api/admin/promo-codes
    app.get("/promo-codes", async (req, reply) => {
        const session = await (0, session_1.getAdminSession)(req);
        if (!(0, session_1.requireAdminSession)(session, reply))
            return;
        const codes = await prisma_1.prisma.promoCode.findMany({
            orderBy: { created_at: "desc" },
            include: { _count: { select: { usages: true } } },
        });
        return (0, session_1.ok)(reply, codes);
    });
    // POST /api/admin/promo-codes
    app.post("/promo-codes", async (req, reply) => {
        const session = await (0, session_1.getAdminSession)(req);
        if (!(0, session_1.requireAdminSession)(session, reply))
            return;
        const parsed = PromoCodeSchema.safeParse(req.body);
        if (!parsed.success)
            return (0, session_1.err)(reply, parsed.error.message);
        // Check if code already exists
        const existing = await prisma_1.prisma.promoCode.findFirst({
            where: { code: parsed.data.code },
        });
        if (existing) {
            return (0, session_1.err)(reply, "Промокод с таким кодом уже существует", 422);
        }
        const promo = await prisma_1.prisma.promoCode.create({
            data: {
                code: parsed.data.code,
                description: parsed.data.description,
                discount_type: parsed.data.discount_type,
                discount_value: parsed.data.discount_value,
                min_order_amount: parsed.data.min_order_amount,
                max_discount_amount: parsed.data.max_discount_amount,
                usage_limit_total: parsed.data.usage_limit_total,
                usage_limit_per_phone: parsed.data.usage_limit_per_phone,
                valid_from: parsed.data.valid_from ? new Date(parsed.data.valid_from) : null,
                valid_to: parsed.data.valid_to ? new Date(parsed.data.valid_to) : null,
                is_active: parsed.data.is_active,
            },
        });
        return (0, session_1.ok)(reply, promo, 201);
    });
    // PATCH /api/admin/promo-codes/:id
    app.patch("/promo-codes/:id", async (req, reply) => {
        const session = await (0, session_1.getAdminSession)(req);
        if (!(0, session_1.requireAdminSession)(session, reply))
            return;
        const { id } = req.params;
        const parsed = PromoCodeSchema.partial().safeParse(req.body);
        if (!parsed.success)
            return (0, session_1.err)(reply, parsed.error.message);
        const promo = await prisma_1.prisma.promoCode.update({
            where: { id },
            data: {
                ...(parsed.data.code !== undefined && { code: parsed.data.code }),
                ...(parsed.data.description !== undefined && { description: parsed.data.description }),
                ...(parsed.data.discount_type !== undefined && { discount_type: parsed.data.discount_type }),
                ...(parsed.data.discount_value !== undefined && { discount_value: parsed.data.discount_value }),
                ...(parsed.data.min_order_amount !== undefined && { min_order_amount: parsed.data.min_order_amount }),
                ...(parsed.data.max_discount_amount !== undefined && { max_discount_amount: parsed.data.max_discount_amount }),
                ...(parsed.data.usage_limit_total !== undefined && { usage_limit_total: parsed.data.usage_limit_total }),
                ...(parsed.data.usage_limit_per_phone !== undefined && { usage_limit_per_phone: parsed.data.usage_limit_per_phone }),
                ...(parsed.data.valid_from !== undefined && { valid_from: parsed.data.valid_from ? new Date(parsed.data.valid_from) : null }),
                ...(parsed.data.valid_to !== undefined && { valid_to: parsed.data.valid_to ? new Date(parsed.data.valid_to) : null }),
                ...(parsed.data.is_active !== undefined && { is_active: parsed.data.is_active }),
            },
        });
        return (0, session_1.ok)(reply, promo);
    });
    // DELETE /api/admin/promo-codes/:id
    app.delete("/promo-codes/:id", async (req, reply) => {
        const session = await (0, session_1.getAdminSession)(req);
        if (!(0, session_1.requireAdminSession)(session, reply))
            return;
        const { id } = req.params;
        await prisma_1.prisma.promoCode.delete({
            where: { id },
        });
        return (0, session_1.ok)(reply, { id });
    });
}
