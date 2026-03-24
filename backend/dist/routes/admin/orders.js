"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = adminOrdersRoutes;
const prisma_1 = require("../../lib/prisma");
const session_1 = require("../../lib/session");
const zod_1 = require("zod");
const StatusSchema = zod_1.z.object({
    status: zod_1.z.enum(["new", "confirmed_preparing", "ready", "sent", "completed", "cancelled"]),
    cancel_reason: zod_1.z.string().optional(),
});
const STATUS_TIMESTAMPS = {
    confirmed_preparing: "confirmed_at",
    ready: "ready_at",
    sent: "sent_at",
    completed: "completed_at",
    cancelled: "cancelled_at",
};
async function adminOrdersRoutes(app) {
    // GET /api/admin/stats
    app.get("/stats", async (req, reply) => {
        const session = await (0, session_1.getAdminSession)(req);
        if (!(0, session_1.requireAdminSession)(session, reply))
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
        const { status, statuses, page = "1", limit = "20" } = req.query;
        const skip = (parseInt(page) - 1) * parseInt(limit);
        let statusFilter = {};
        if (status)
            statusFilter = { status };
        if (statuses)
            statusFilter = { status: { in: statuses.split(",") } };
        const [orders, total] = await Promise.all([
            prisma_1.prisma.order.findMany({
                where: statusFilter,
                orderBy: { created_at: "desc" },
                skip,
                // If limit=0, take everything (for kitchen)
                ...(parseInt(limit) > 0 ? { take: parseInt(limit) } : {}),
                include: { items: { include: { selections: true } }, promo_code: { select: { code: true } } },
            }),
            prisma_1.prisma.order.count({ where: statusFilter }),
        ]);
        return (0, session_1.ok)(reply, { orders, total, page: parseInt(page), limit: parseInt(limit) });
    });
    // GET /api/admin/orders/:id
    app.get("/orders/:id", async (req, reply) => {
        const session = await (0, session_1.getAdminSession)(req);
        if (!(0, session_1.requireAdminSession)(session, reply))
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
        const parsed = StatusSchema.safeParse(req.body);
        if (!parsed.success)
            return (0, session_1.err)(reply, parsed.error.message);
        const tsField = STATUS_TIMESTAMPS[parsed.data.status];
        const order = await prisma_1.prisma.order.update({
            where: { id: req.params.id },
            data: {
                status: parsed.data.status,
                cancel_reason: parsed.data.cancel_reason,
                ...(tsField ? { [tsField]: new Date() } : {}),
            },
        });
        await prisma_1.prisma.adminActionLog.create({
            data: {
                admin_user_id: session.id,
                action: "order_status_changed",
                entity_type: "Order",
                entity_id: order.id,
                payload_json: { status: parsed.data.status },
            },
        });
        return (0, session_1.ok)(reply, order);
    });
}
