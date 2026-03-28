import { FastifyInstance } from "fastify";
import { prisma } from "../../lib/prisma";
import { getAdminSession, requireAdminSession, requireRoles, ok, err } from "../../lib/session";
import { z } from "zod";

const DeliveryZoneSchema = z.object({
  name: z.string().min(2),
  delivery_fee: z.number().or(z.string()).transform(v => parseFloat(String(v))),
  min_order_amount: z.number().or(z.string()).transform(v => parseFloat(String(v))).default(0),
  free_delivery_from: z.number().or(z.string()).optional().transform(v => v ? parseFloat(String(v)) : null),
  is_active: z.boolean().default(true),
});

export default async function adminDeliveryZonesRoutes(app: FastifyInstance) {
  // GET /api/admin/delivery-zones
  app.get("/delivery-zones", async (req, reply) => {
    const session = await getAdminSession(req);
    if (!requireAdminSession(session, reply)) return;
    if (!requireRoles(session, reply, ["admin"])) return;

    const zones = await prisma.deliveryZone.findMany({
      orderBy: { name: "asc" },
    });
    return ok(reply, zones);
  });

  // POST /api/admin/delivery-zones
  app.post("/delivery-zones", async (req, reply) => {
    const session = await getAdminSession(req);
    if (!requireAdminSession(session, reply)) return;
    if (!requireRoles(session, reply, ["admin"])) return;

    const parsed = DeliveryZoneSchema.safeParse(req.body);
    if (!parsed.success) return err(reply, parsed.error.message);

    const zone = await prisma.deliveryZone.create({
      data: {
        name: parsed.data.name,
        delivery_fee: parsed.data.delivery_fee,
        min_order_amount: parsed.data.min_order_amount,
        free_delivery_from: parsed.data.free_delivery_from,
        is_active: parsed.data.is_active,
      },
    });

    return ok(reply, zone, 201);
  });

  // PATCH /api/admin/delivery-zones/:id
  app.patch("/delivery-zones/:id", async (req, reply) => {
    const session = await getAdminSession(req);
    if (!requireAdminSession(session, reply)) return;
    if (!requireRoles(session, reply, ["admin"])) return;

    const { id } = req.params as { id: string };
    const parsed = DeliveryZoneSchema.partial().safeParse(req.body);
    if (!parsed.success) return err(reply, parsed.error.message);

    const zone = await prisma.deliveryZone.update({
      where: { id },
      data: {
        ...(parsed.data.name !== undefined && { name: parsed.data.name }),
        ...(parsed.data.delivery_fee !== undefined && { delivery_fee: parsed.data.delivery_fee }),
        ...(parsed.data.min_order_amount !== undefined && { min_order_amount: parsed.data.min_order_amount }),
        ...(parsed.data.free_delivery_from !== undefined && { free_delivery_from: parsed.data.free_delivery_from }),
        ...(parsed.data.is_active !== undefined && { is_active: parsed.data.is_active }),
      },
    });

    return ok(reply, zone);
  });

  // DELETE /api/admin/delivery-zones/:id
  app.delete("/delivery-zones/:id", async (req, reply) => {
    const session = await getAdminSession(req);
    if (!requireAdminSession(session, reply)) return;
    if (!requireRoles(session, reply, ["admin"])) return;

    const { id } = req.params as { id: string };

    await prisma.deliveryZone.delete({
      where: { id },
    });

    return ok(reply, { id });
  });
}
