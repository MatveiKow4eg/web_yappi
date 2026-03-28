"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = adminKitchenRoutes;
const zod_1 = require("zod");
const prisma_1 = require("../../lib/prisma");
const session_1 = require("../../lib/session");
const KitchenSettingsSchema = zod_1.z.object({
    kitchen_default_prep_minutes: zod_1.z.number().int().min(1).max(240).optional(),
    kitchen_delivery_prep_minutes: zod_1.z.number().int().min(1).max(240).optional(),
});
async function ensureSettings() {
    let settings = await prisma_1.prisma.restaurantSettings.findFirst();
    if (!settings) {
        settings = await prisma_1.prisma.restaurantSettings.create({
            data: { restaurant_name: "Yappi Sushi" },
        });
    }
    return settings;
}
function kitchenPayload(s) {
    return {
        kitchen_is_open: s.kitchen_is_open,
        kitchen_day_started_at: s.kitchen_day_started_at,
        kitchen_day_ended_at: s.kitchen_day_ended_at,
        kitchen_default_prep_minutes: s.kitchen_default_prep_minutes,
        kitchen_delivery_prep_minutes: s.min_delivery_time_minutes,
        min_delivery_time_minutes: s.min_delivery_time_minutes,
        max_delivery_time_minutes: s.max_delivery_time_minutes,
        server_time: new Date().toISOString(),
    };
}
async function adminKitchenRoutes(app) {
    app.get("/kitchen", async (req, reply) => {
        const session = await (0, session_1.getAdminSession)(req);
        if (!(0, session_1.requireAdminSession)(session, reply))
            return;
        if (!(0, session_1.requireRoles)(session, reply, ["admin", "kitchen"]))
            return;
        const settings = await ensureSettings();
        return (0, session_1.ok)(reply, kitchenPayload(settings));
    });
    app.post("/kitchen/start-day", async (req, reply) => {
        const session = await (0, session_1.getAdminSession)(req);
        if (!(0, session_1.requireAdminSession)(session, reply))
            return;
        if (!(0, session_1.requireRoles)(session, reply, ["admin", "kitchen"]))
            return;
        const now = new Date();
        const settings = await ensureSettings();
        const updated = await prisma_1.prisma.restaurantSettings.update({
            where: { id: settings.id },
            data: {
                kitchen_is_open: true,
                kitchen_day_started_at: now,
                kitchen_day_ended_at: null,
            },
        });
        await prisma_1.prisma.adminActionLog.create({
            data: {
                admin_user_id: session.id,
                action: "kitchen_day_started",
                entity_type: "RestaurantSettings",
                entity_id: updated.id,
            },
        });
        return (0, session_1.ok)(reply, kitchenPayload(updated));
    });
    app.post("/kitchen/end-day", async (req, reply) => {
        const session = await (0, session_1.getAdminSession)(req);
        if (!(0, session_1.requireAdminSession)(session, reply))
            return;
        if (!(0, session_1.requireRoles)(session, reply, ["admin", "kitchen"]))
            return;
        const settings = await ensureSettings();
        if (!settings.kitchen_is_open) {
            return (0, session_1.err)(reply, "Кухонная смена уже закрыта", 409);
        }
        const updated = await prisma_1.prisma.restaurantSettings.update({
            where: { id: settings.id },
            data: {
                kitchen_is_open: false,
                kitchen_day_ended_at: new Date(),
            },
        });
        await prisma_1.prisma.adminActionLog.create({
            data: {
                admin_user_id: session.id,
                action: "kitchen_day_ended",
                entity_type: "RestaurantSettings",
                entity_id: updated.id,
            },
        });
        return (0, session_1.ok)(reply, kitchenPayload(updated));
    });
    app.patch("/kitchen/settings", async (req, reply) => {
        const session = await (0, session_1.getAdminSession)(req);
        if (!(0, session_1.requireAdminSession)(session, reply))
            return;
        if (!(0, session_1.requireRoles)(session, reply, ["admin", "kitchen"]))
            return;
        const parsed = KitchenSettingsSchema.safeParse(req.body);
        if (!parsed.success)
            return (0, session_1.err)(reply, parsed.error.message);
        const settings = await ensureSettings();
        const deliveryMinutes = parsed.data.kitchen_delivery_prep_minutes;
        const updated = await prisma_1.prisma.restaurantSettings.update({
            where: { id: settings.id },
            data: {
                ...(parsed.data.kitchen_default_prep_minutes
                    ? { kitchen_default_prep_minutes: parsed.data.kitchen_default_prep_minutes }
                    : {}),
                ...(deliveryMinutes
                    ? {
                        min_delivery_time_minutes: deliveryMinutes,
                        max_delivery_time_minutes: deliveryMinutes,
                    }
                    : {}),
            },
        });
        await prisma_1.prisma.adminActionLog.create({
            data: {
                admin_user_id: session.id,
                action: "kitchen_settings_updated",
                entity_type: "RestaurantSettings",
                entity_id: updated.id,
                payload_json: parsed.data,
            },
        });
        return (0, session_1.ok)(reply, kitchenPayload(updated));
    });
    app.get("/kitchen/shift-stats", async (req, reply) => {
        const session = await (0, session_1.getAdminSession)(req);
        if (!(0, session_1.requireAdminSession)(session, reply))
            return;
        if (!(0, session_1.requireRoles)(session, reply, ["admin", "kitchen"]))
            return;
        const settings = await ensureSettings();
        if (!settings.kitchen_day_started_at) {
            return (0, session_1.ok)(reply, {
                has_shift: false,
                shift_started_at: null,
                shift_ended_at: null,
                orders_count: 0,
                rolls_count: 0,
                total_revenue: 0,
            });
        }
        const from = settings.kitchen_day_started_at;
        const to = settings.kitchen_day_ended_at ?? new Date();
        const activeStatuses = ["new", "confirmed_preparing", "ready", "sent", "completed"];
        const [ordersCount, sumRevenue, sumRolls] = await Promise.all([
            prisma_1.prisma.order.count({
                where: {
                    created_at: { gte: from, lte: to },
                    status: { in: [...activeStatuses] },
                },
            }),
            prisma_1.prisma.order.aggregate({
                where: {
                    created_at: { gte: from, lte: to },
                    status: { in: [...activeStatuses] },
                },
                _sum: { total_amount: true },
            }),
            prisma_1.prisma.orderItem.aggregate({
                where: {
                    order: {
                        created_at: { gte: from, lte: to },
                        status: { in: [...activeStatuses] },
                    },
                },
                _sum: { quantity: true },
            }),
        ]);
        return (0, session_1.ok)(reply, {
            has_shift: true,
            shift_started_at: from,
            shift_ended_at: settings.kitchen_day_ended_at,
            orders_count: ordersCount,
            rolls_count: sumRolls._sum.quantity ?? 0,
            total_revenue: Number(sumRevenue._sum.total_amount ?? 0),
        });
    });
}
