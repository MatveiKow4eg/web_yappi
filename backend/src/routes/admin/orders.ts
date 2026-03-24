import { FastifyInstance } from "fastify";
import { prisma } from "../../lib/prisma";
import { getAdminSession, requireAdminSession, ok, err } from "../../lib/session";
import { z } from "zod";

const StatusSchema = z.object({
  status: z.enum(["new", "confirmed_preparing", "ready", "sent", "completed", "cancelled"]),
  cancel_reason: z.string().optional(),
});

const STATUS_TIMESTAMPS: Record<string, string> = {
  confirmed_preparing: "confirmed_at",
  ready: "ready_at",
  sent: "sent_at",
  completed: "completed_at",
  cancelled: "cancelled_at",
};

export default async function adminOrdersRoutes(app: FastifyInstance) {
  // GET /api/admin/orders
  app.get<{ Querystring: { status?: string; page?: string; limit?: string } }>(
    "/orders",
    async (req, reply) => {
      const session = await getAdminSession(req);
      if (!requireAdminSession(session, reply)) return;

      const { status, page = "1", limit = "20" } = req.query;
      const skip = (parseInt(page) - 1) * parseInt(limit);

      const [orders, total] = await Promise.all([
        prisma.order.findMany({
          where: status ? { status } : {},
          orderBy: { created_at: "desc" },
          skip,
          take: parseInt(limit),
          include: { items: true, promo_code: { select: { code: true } } },
        }),
        prisma.order.count({ where: status ? { status } : {} }),
      ]);

      return ok(reply, { orders, total, page: parseInt(page), limit: parseInt(limit) });
    }
  );

  // GET /api/admin/orders/:id
  app.get<{ Params: { id: string } }>("/orders/:id", async (req, reply) => {
    const session = await getAdminSession(req);
    if (!requireAdminSession(session, reply)) return;

    const order = await prisma.order.findUnique({
      where: { id: req.params.id },
      include: {
        items: { include: { selections: true } },
        promo_code: { select: { code: true } },
        delivery_zone: true,
      },
    });
    if (!order) return err(reply, "Not found", 404);
    return ok(reply, order);
  });

  // PATCH /api/admin/orders/:id/status
  app.patch<{ Params: { id: string } }>("/orders/:id/status", async (req, reply) => {
    const session = await getAdminSession(req);
    if (!requireAdminSession(session, reply)) return;

    const parsed = StatusSchema.safeParse(req.body);
    if (!parsed.success) return err(reply, parsed.error.message);

    const tsField = STATUS_TIMESTAMPS[parsed.data.status];
    const order = await prisma.order.update({
      where: { id: req.params.id },
      data: {
        status: parsed.data.status,
        cancel_reason: parsed.data.cancel_reason,
        ...(tsField ? { [tsField]: new Date() } : {}),
      },
    });

    await prisma.adminActionLog.create({
      data: {
        admin_user_id: session.id,
        action: "order_status_changed",
        entity_type: "Order",
        entity_id: order.id,
        payload_json: { status: parsed.data.status } as object,
      },
    });

    return ok(reply, order);
  });
}
