"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = adminKitchenRoutes;
const zod_1 = require("zod");
const prisma_1 = require("../../lib/prisma");
const session_1 = require("../../lib/session");
const KitchenSettingsSchema = zod_1.z.object({
    kitchen_default_prep_minutes: zod_1.z.number().int().min(1).max(240),
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
async function adminKitchenRoutes(app) {
    app.get("/kitchen", async (req, reply) => {
        const session = await (0, session_1.getAdminSession)(req);
        if (!(0, session_1.requireAdminSession)(session, reply))
            return;
        if (!(0, session_1.requireRoles)(session, reply, ["admin", "kitchen"]))
            return;
        const settings = await ensureSettings();
        return (0, session_1.ok)(reply, {
            kitchen_is_open: settings.kitchen_is_open,
            kitchen_day_started_at: settings.kitchen_day_started_at,
            kitchen_day_ended_at: settings.kitchen_day_ended_at,
            kitchen_default_prep_minutes: settings.kitchen_default_prep_minutes,
            min_delivery_time_minutes: settings.min_delivery_time_minutes,
            max_delivery_time_minutes: settings.max_delivery_time_minutes,
        });
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
                kitchen_day_started_at: settings.kitchen_day_started_at ?? now,
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
        return (0, session_1.ok)(reply, {
            kitchen_is_open: updated.kitchen_is_open,
            kitchen_day_started_at: updated.kitchen_day_started_at,
            kitchen_day_ended_at: updated.kitchen_day_ended_at,
            kitchen_default_prep_minutes: updated.kitchen_default_prep_minutes,
            min_delivery_time_minutes: updated.min_delivery_time_minutes,
            max_delivery_time_minutes: updated.max_delivery_time_minutes,
        });
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
        return (0, session_1.ok)(reply, {
            kitchen_is_open: updated.kitchen_is_open,
            kitchen_day_started_at: updated.kitchen_day_started_at,
            kitchen_day_ended_at: updated.kitchen_day_ended_at,
            kitchen_default_prep_minutes: updated.kitchen_default_prep_minutes,
            min_delivery_time_minutes: updated.min_delivery_time_minutes,
            max_delivery_time_minutes: updated.max_delivery_time_minutes,
        });
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
        const updated = await prisma_1.prisma.restaurantSettings.update({
            where: { id: settings.id },
            data: {
                kitchen_default_prep_minutes: parsed.data.kitchen_default_prep_minutes,
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
        return (0, session_1.ok)(reply, {
            kitchen_is_open: updated.kitchen_is_open,
            kitchen_day_started_at: updated.kitchen_day_started_at,
            kitchen_day_ended_at: updated.kitchen_day_ended_at,
            kitchen_default_prep_minutes: updated.kitchen_default_prep_minutes,
            min_delivery_time_minutes: updated.min_delivery_time_minutes,
            max_delivery_time_minutes: updated.max_delivery_time_minutes,
        });
    });
}
