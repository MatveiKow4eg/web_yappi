"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = adminOrdersRoutes;
const zod_1 = require("zod");
const prisma_1 = require("../../lib/prisma");
const session_1 = require("../../lib/session");
const StatusSchema = zod_1.z.object({
    status: zod_1.z.enum(["new", "confirmed_preparing", "ready", "sent", "completed", "cancelled"]),
    cancel_reason: zod_1.z.string().optional(),
    estimated_prep_minutes: zod_1.z.number().int().min(1).max(240).optional(),
});
const STATUS_TIMESTAMPS = {
    confirmed_preparing: "confirmed_at",
    ready: "ready_at",
    sent: "sent_at",
    completed: "completed_at",
    cancelled: "cancelled_at",
};
async function adminOrdersRoutes(app) {
    const kitchenVisibleStatuses = ["new", "confirmed_preparing", "ready", "sent", "completed", "cancelled"];
    // GET /api/admin/stats
    app.get("/stats", async (req, reply) => {
        const session = await (0, session_1.getAdminSession)(req);
        if (!(0, session_1.requireAdminSession)(session, reply))
            return;
        if (!(0, session_1.requireRoles)(session, reply, ["admin", "kitchen"]))
            return;
        const [totalOrders, todayOrders, pendingOrders] = await Promise.all([
            prisma_1.prisma.order.count(),
            prisma_1.prisma.order.count({
                where: { created_at: { gte: new Date(new Date().setHours(0, 0, 0, 0)) } },
            }),
            prisma_1.prisma.order.count({ where: { status: { in: ["new", "confirmed_preparing"] } } }),
        ]);
        return (0, session_1.ok)(reply, { totalOrders, todayOrders, pendingOrders });
    });
    // GET /api/admin/orders
    app.get("/orders", async (req, reply) => {
        const session = await (0, session_1.getAdminSession)(req);
        if (!(0, session_1.requireAdminSession)(session, reply))
            return;
        if (!(0, session_1.requireRoles)(session, reply, ["admin", "kitchen"]))
            return;
        const { status, statuses, page = "1", limit = "20", created_after } = req.query;
        const parsedPage = Number.parseInt(page, 10);
        const parsedLimit = Number.parseInt(limit, 10);
        const skip = (parsedPage - 1) * parsedLimit;
        let statusFilter = {};
        if (status)
            statusFilter = { status };
        if (statuses)
            statusFilter = { status: { in: statuses.split(",") } };
        if (session.role === "kitchen") {
            if (statuses) {
                const requested = statuses.split(",").map((s) => s.trim()).filter(Boolean);
                statusFilter = { status: { in: requested.filter((s) => kitchenVisibleStatuses.includes(s)) } };
            }
            else if (status) {
                statusFilter = kitchenVisibleStatuses.includes(status)
                    ? { status }
                    : { status: { in: [] } };
            }
            else {
                statusFilter = { status: { in: kitchenVisibleStatuses } };
            }
            if (created_after) {
                const since = new Date(created_after);
                if (!isNaN(since.getTime())) {
                    statusFilter = { ...statusFilter, created_at: { gte: since } };
                }
            }
        }
        const [orders, total] = await Promise.all([
            prisma_1.prisma.order.findMany({
                where: statusFilter,
                orderBy: { created_at: "desc" },
                skip,
                ...(parsedLimit > 0 ? { take: parsedLimit } : {}),
                include: {
                    items: { include: { selections: true } },
                    promo_code: { select: { code: true } },
                    delivery_zone: true,
                },
            }),
            prisma_1.prisma.order.count({ where: statusFilter }),
        ]);
        return (0, session_1.ok)(reply, { orders, total, page: parsedPage, limit: parsedLimit });
    });
    // GET /api/admin/orders/:id
    app.get("/orders/:id", async (req, reply) => {
        const session = await (0, session_1.getAdminSession)(req);
        if (!(0, session_1.requireAdminSession)(session, reply))
            return;
        if (!(0, session_1.requireRoles)(session, reply, ["admin", "kitchen"]))
            return;
        const order = await prisma_1.prisma.order.findUnique({
            where: { id: req.params.id },
            include: {
                items: { include: { selections: true } },
                promo_code: { select: { code: true } },
                delivery_zone: true,
            },
        });
        if (!order)
            return (0, session_1.err)(reply, "Not found", 404);
        return (0, session_1.ok)(reply, order);
    });
    // PATCH /api/admin/orders/:id/status
    app.patch("/orders/:id/status", async (req, reply) => {
        const session = await (0, session_1.getAdminSession)(req);
        if (!(0, session_1.requireAdminSession)(session, reply))
            return;
        if (!(0, session_1.requireRoles)(session, reply, ["admin", "kitchen"]))
            return;
        const parsed = StatusSchema.safeParse(req.body);
        if (!parsed.success)
            return (0, session_1.err)(reply, parsed.error.message);
        const existingOrder = await prisma_1.prisma.order.findUnique({
            where: { id: req.params.id },
            select: {
                id: true,
                status: true,
                estimated_prep_minutes: true,
            },
        });
        if (!existingOrder)
            return (0, session_1.err)(reply, "Заказ не найден", 404);
        const tsField = STATUS_TIMESTAMPS[parsed.data.status];
        let estimatedPrepMinutes = existingOrder.estimated_prep_minutes ?? undefined;
        let estimatedReadyAt;
        if (parsed.data.status === "confirmed_preparing") {
            const settings = await prisma_1.prisma.restaurantSettings.findFirst({
                select: { kitchen_default_prep_minutes: true },
            });
            estimatedPrepMinutes =
                parsed.data.estimated_prep_minutes ??
                    existingOrder.estimated_prep_minutes ??
                    settings?.kitchen_default_prep_minutes ??
                    20;
            estimatedReadyAt = new Date(Date.now() + estimatedPrepMinutes * 60 * 1000);
        }
        const order = await prisma_1.prisma.order.update({
            where: { id: req.params.id },
            data: {
                status: parsed.data.status,
                cancel_reason: parsed.data.status === "cancelled" ? parsed.data.cancel_reason ?? null : null,
                estimated_prep_minutes: parsed.data.status === "confirmed_preparing" ? estimatedPrepMinutes : existingOrder.estimated_prep_minutes,
                estimated_ready_at: parsed.data.status === "confirmed_preparing"
                    ? estimatedReadyAt
                    : parsed.data.status === "cancelled"
                        ? null
                        : undefined,
                ...(tsField ? { [tsField]: new Date() } : {}),
            },
        });
        await prisma_1.prisma.adminActionLog.create({
            data: {
                admin_user_id: session.id,
                action: "order_status_changed",
                entity_type: "Order",
                entity_id: order.id,
                payload_json: {
                    from_status: existingOrder.status,
                    status: parsed.data.status,
                    estimated_prep_minutes: estimatedPrepMinutes,
                },
            },
        });
        return (0, session_1.ok)(reply, order);
    });
    // DELETE /api/admin/orders/:id  (non-Stripe orders only)
    app.delete("/orders/:id", async (req, reply) => {
        const session = await (0, session_1.getAdminSession)(req);
        if (!(0, session_1.requireAdminSession)(session, reply))
            return;
        if (!(0, session_1.requireRoles)(session, reply, ["admin"]))
            return;
        const order = await prisma_1.prisma.order.findUnique({
            where: { id: req.params.id },
            select: { id: true, payment_method: true, order_number: true },
        });
        if (!order)
            return (0, session_1.err)(reply, "Заказ не найден", 404);
        if (order.payment_method === "stripe") {
            return (0, session_1.err)(reply, "Нельзя удалить заказ с онлайн-оплатой", 403);
        }
        await prisma_1.prisma.order.delete({ where: { id: order.id } });
        await prisma_1.prisma.adminActionLog.create({
            data: {
                admin_user_id: session.id,
                action: "order_deleted",
                entity_type: "Order",
                entity_id: order.id,
                payload_json: { order_number: order.order_number },
            },
        });
        return (0, session_1.ok)(reply, { deleted: true });
    });
}
