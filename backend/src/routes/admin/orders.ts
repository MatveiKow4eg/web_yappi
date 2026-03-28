import { FastifyInstance } from "fastify";
import { z } from "zod";
import { prisma } from "../../lib/prisma";
import { err, getAdminSession, ok, requireAdminSession, requireRoles } from "../../lib/session";

const StatusSchema = z.object({
  status: z.enum(["new", "confirmed_preparing", "ready", "sent", "completed", "cancelled"]),
  cancel_reason: z.string().optional(),
  estimated_prep_minutes: z.number().int().min(1).max(240).optional(),
});

const STATUS_TIMESTAMPS: Record<string, string> = {
  confirmed_preparing: "confirmed_at",
  ready: "ready_at",
  sent: "sent_at",
  completed: "completed_at",
  cancelled: "cancelled_at",
};

export default async function adminOrdersRoutes(app: FastifyInstance) {
  const kitchenVisibleStatuses = ["new", "confirmed_preparing", "ready", "sent", "completed", "cancelled"];

  // GET /api/admin/stats
  app.get("/stats", async (req, reply) => {
    const session = await getAdminSession(req);
    if (!requireAdminSession(session, reply)) return;
    if (!requireRoles(session, reply, ["admin", "kitchen"])) return;

    const [totalOrders, todayOrders, pendingOrders] = await Promise.all([
      prisma.order.count(),
      prisma.order.count({
        where: { created_at: { gte: new Date(new Date().setHours(0, 0, 0, 0)) } },
      }),
      prisma.order.count({ where: { status: { in: ["new", "confirmed_preparing"] } } }),
    ]);

    return ok(reply, { totalOrders, todayOrders, pendingOrders });
  });

  // GET /api/admin/shifts
  app.get("/shifts", async (req, reply) => {
    const session = await getAdminSession(req);
    if (!requireAdminSession(session, reply)) return;
    if (!requireRoles(session, reply, ["admin"])) return;

    const rows = await prisma.$queryRaw<Array<{ date: Date; count: bigint; total: string }>>`
      SELECT
        DATE_TRUNC('day', created_at) AS date,
        COUNT(*)::bigint              AS count,
        SUM(total_amount)::numeric    AS total
      FROM "Order"
      GROUP BY DATE_TRUNC('day', created_at)
      ORDER BY date DESC
      LIMIT 90
    `;

    const shifts = rows.map((r) => ({
      date: r.date.toISOString().slice(0, 10),
      count: Number(r.count),
      total: Number(r.total),
    }));

    return ok(reply, shifts);
  });

  // GET /api/admin/orders
  app.get<{ Querystring: { status?: string; statuses?: string; page?: string; limit?: string; created_after?: string; date?: string } }>(
    "/orders",
    async (req, reply) => {
      const session = await getAdminSession(req);
      if (!requireAdminSession(session, reply)) return;
      if (!requireRoles(session, reply, ["admin", "kitchen"])) return;

      const { status, statuses, page = "1", limit = "20", created_after, date } = req.query;
      const parsedPage = Number.parseInt(page, 10);
      const parsedLimit = Number.parseInt(limit, 10);
      const skip = (parsedPage - 1) * parsedLimit;

      let statusFilter: Record<string, unknown> = {};
      if (status) statusFilter = { status };
      if (statuses) statusFilter = { status: { in: statuses.split(",") } };

      if (session.role === "kitchen") {
        if (statuses) {
          const requested = statuses.split(",").map((s) => s.trim()).filter(Boolean);
          statusFilter = { status: { in: requested.filter((s) => kitchenVisibleStatuses.includes(s)) } };
        } else if (status) {
          statusFilter = kitchenVisibleStatuses.includes(status)
            ? { status }
            : { status: { in: [] } };
        } else {
          statusFilter = { status: { in: kitchenVisibleStatuses } };
        }

        if (created_after) {
          const since = new Date(created_after);
          if (!isNaN(since.getTime())) {
            statusFilter = { ...statusFilter, created_at: { gte: since } };
          }
        }
      }

      if (date && /^\d{4}-\d{2}-\d{2}$/.test(date) && session.role === "admin") {
        const dayStart = new Date(`${date}T00:00:00.000Z`);
        const dayEnd = new Date(`${date}T23:59:59.999Z`);
        statusFilter = { ...statusFilter, created_at: { gte: dayStart, lte: dayEnd } };
      }

      // Exclude unpaid Stripe orders from all views
      const paidFilter = {
        ...statusFilter,
        NOT: { payment_method: "stripe", payment_status: { not: "paid" } },
      };

      const [orders, total] = await Promise.all([
        prisma.order.findMany({
          where: paidFilter,
          orderBy: { created_at: "desc" },
          skip,
          ...(parsedLimit > 0 ? { take: parsedLimit } : {}),
          include: {
            items: { include: { selections: true } },
            promo_code: { select: { code: true } },
            delivery_zone: true,
          },
        }),
        prisma.order.count({ where: paidFilter }),
      ]);

      return ok(reply, { orders, total, page: parsedPage, limit: parsedLimit });
    }
  );

  // GET /api/admin/orders/:id
  app.get<{ Params: { id: string } }>("/orders/:id", async (req, reply) => {
    const session = await getAdminSession(req);
    if (!requireAdminSession(session, reply)) return;
    if (!requireRoles(session, reply, ["admin", "kitchen"])) return;

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
    if (!requireRoles(session, reply, ["admin", "kitchen"])) return;

    const parsed = StatusSchema.safeParse(req.body);
    if (!parsed.success) return err(reply, parsed.error.message);

    const existingOrder = await prisma.order.findUnique({
      where: { id: req.params.id },
      select: {
        id: true,
        status: true,
        estimated_prep_minutes: true,
      },
    });

    if (!existingOrder) return err(reply, "Заказ не найден", 404);

    const tsField = STATUS_TIMESTAMPS[parsed.data.status];
    let estimatedPrepMinutes = existingOrder.estimated_prep_minutes ?? undefined;
    let estimatedReadyAt: Date | null | undefined;

    if (parsed.data.status === "confirmed_preparing") {
      const settings = await prisma.restaurantSettings.findFirst({
        select: { kitchen_default_prep_minutes: true },
      });

      estimatedPrepMinutes =
        parsed.data.estimated_prep_minutes ??
        existingOrder.estimated_prep_minutes ??
        settings?.kitchen_default_prep_minutes ??
        20;

      estimatedReadyAt = new Date(Date.now() + estimatedPrepMinutes * 60 * 1000);
    }

    const order = await prisma.order.update({
      where: { id: req.params.id },
      data: {
        status: parsed.data.status,
        cancel_reason: parsed.data.status === "cancelled" ? parsed.data.cancel_reason ?? null : null,
        estimated_prep_minutes:
          parsed.data.status === "confirmed_preparing" ? estimatedPrepMinutes : existingOrder.estimated_prep_minutes,
        estimated_ready_at:
          parsed.data.status === "confirmed_preparing"
            ? estimatedReadyAt
            : parsed.data.status === "cancelled"
              ? null
              : undefined,
        ...(tsField ? { [tsField]: new Date() } : {}),
      },
    });

    await prisma.adminActionLog.create({
      data: {
        admin_user_id: session.id,
        action: "order_status_changed",
        entity_type: "Order",
        entity_id: order.id,
        payload_json: {
          from_status: existingOrder.status,
          status: parsed.data.status,
          estimated_prep_minutes: estimatedPrepMinutes,
        } as object,
      },
    });

    return ok(reply, order);
  });

  // DELETE /api/admin/orders/:id
  app.delete<{ Params: { id: string } }>("/orders/:id", async (req, reply) => {
    const session = await getAdminSession(req);
    if (!requireAdminSession(session, reply)) return;
    if (!requireRoles(session, reply, ["admin"])) return;

    const order = await prisma.order.findUnique({
      where: { id: req.params.id },
      select: { id: true, payment_method: true, order_number: true },
    });

    if (!order) return err(reply, "Заказ не найден", 404);

    await prisma.order.delete({ where: { id: order.id } });

    await prisma.adminActionLog.create({
      data: {
        admin_user_id: session.id,
        action: "order_deleted",
        entity_type: "Order",
        entity_id: order.id,
        payload_json: { order_number: order.order_number } as object,
      },
    });

    return ok(reply, { deleted: true });
  });
}
