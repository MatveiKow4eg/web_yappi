import { FastifyInstance } from "fastify";
import { prisma } from "../../lib/prisma";
import { getAdminSession, requireAdminSession, ok, err } from "../../lib/session";
import { z } from "zod";

const PromoCodeSchema = z.object({
  code: z.string().min(2).toUpperCase(),
  description: z.string().optional().nullable(),
  discount_type: z.enum(["percent", "fixed"]),
  discount_value: z.number().or(z.string()).transform(v => parseFloat(String(v))),
  min_order_amount: z.number().or(z.string()).optional().transform(v => v ? parseFloat(String(v)) : null),
  max_discount_amount: z.number().or(z.string()).optional().transform(v => v ? parseFloat(String(v)) : null),
  usage_limit_total: z.number().int().optional().nullable(),
  usage_limit_per_phone: z.number().int().optional().nullable(),
  valid_from: z.string().datetime().optional().nullable(),
  valid_to: z.string().datetime().optional().nullable(),
  is_active: z.boolean().default(true),
});

export default async function adminPromoCodesRoutes(app: FastifyInstance) {
  // GET /api/admin/promo-codes
  app.get("/promo-codes", async (req, reply) => {
    const session = await getAdminSession(req);
    if (!requireAdminSession(session, reply)) return;

    const codes = await prisma.promoCode.findMany({
      orderBy: { created_at: "desc" },
      include: { _count: { select: { usages: true } } },
    });
    return ok(reply, codes);
  });

  // POST /api/admin/promo-codes
  app.post("/promo-codes", async (req, reply) => {
    const session = await getAdminSession(req);
    if (!requireAdminSession(session, reply)) return;

    const parsed = PromoCodeSchema.safeParse(req.body);
    if (!parsed.success) return err(reply, parsed.error.message);

    // Check if code already exists
    const existing = await prisma.promoCode.findFirst({
      where: { code: parsed.data.code },
    });
    if (existing) {
      return err(reply, "Промокод с таким кодом уже существует", 422);
    }

    const promo = await prisma.promoCode.create({
      data: {
        code: parsed.data.code,
        description: parsed.data.description,
        discount_type: parsed.data.discount_type as "percent" | "fixed",
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

    return ok(reply, promo, 201);
  });

  // PATCH /api/admin/promo-codes/:id
  app.patch("/promo-codes/:id", async (req, reply) => {
    const session = await getAdminSession(req);
    if (!requireAdminSession(session, reply)) return;

    const { id } = req.params as { id: string };
    const parsed = PromoCodeSchema.partial().safeParse(req.body);
    if (!parsed.success) return err(reply, parsed.error.message);

    const promo = await prisma.promoCode.update({
      where: { id },
      data: {
        ...(parsed.data.code !== undefined && { code: parsed.data.code }),
        ...(parsed.data.description !== undefined && { description: parsed.data.description }),
        ...(parsed.data.discount_type !== undefined && { discount_type: parsed.data.discount_type as "percent" | "fixed" }),
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

    return ok(reply, promo);
  });

  // DELETE /api/admin/promo-codes/:id
  app.delete("/promo-codes/:id", async (req, reply) => {
    const session = await getAdminSession(req);
    if (!requireAdminSession(session, reply)) return;

    const { id } = req.params as { id: string };

    await prisma.promoCode.delete({
      where: { id },
    });

    return ok(reply, { id });
  });
}
