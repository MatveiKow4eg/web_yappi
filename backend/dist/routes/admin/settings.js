"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = adminSettingsRoutes;
const prisma_1 = require("../../lib/prisma");
const session_1 = require("../../lib/session");
const zod_1 = require("zod");
const SettingsSchema = zod_1.z.object({
    restaurant_name: zod_1.z.string().min(1).optional(),
    phone: zod_1.z.string().optional(),
    email: zod_1.z.string().email().optional().or(zod_1.z.literal("")),
    address_ru: zod_1.z.string().optional(),
    address_en: zod_1.z.string().optional(),
    address_et: zod_1.z.string().optional(),
    pickup_enabled: zod_1.z.boolean().optional(),
    delivery_enabled: zod_1.z.boolean().optional(),
    stripe_enabled: zod_1.z.boolean().optional(),
    cash_on_pickup_enabled: zod_1.z.boolean().optional(),
    card_on_pickup_enabled: zod_1.z.boolean().optional(),
    min_delivery_time_minutes: zod_1.z.number().int().positive().optional(),
    max_delivery_time_minutes: zod_1.z.number().int().positive().optional(),
});
async function adminSettingsRoutes(app) {
    app.get("/settings", async (req, reply) => {
        const session = await (0, session_1.getAdminSession)(req);
        if (!(0, session_1.requireAdminSession)(session, reply))
            return;
        let settings = await prisma_1.prisma.restaurantSettings.findFirst();
        if (!settings) {
            settings = await prisma_1.prisma.restaurantSettings.create({ data: { restaurant_name: "Yappi Sushi" } });
        }
        return (0, session_1.ok)(reply, settings);
    });
    app.patch("/settings", async (req, reply) => {
        const session = await (0, session_1.getAdminSession)(req);
        if (!(0, session_1.requireAdminSession)(session, reply))
            return;
        const parsed = SettingsSchema.safeParse(req.body);
        if (!parsed.success)
            return (0, session_1.err)(reply, parsed.error.message);
        let settings = await prisma_1.prisma.restaurantSettings.findFirst();
        if (!settings) {
            settings = await prisma_1.prisma.restaurantSettings.create({ data: { restaurant_name: "Yappi Sushi", ...parsed.data } });
        }
        else {
            settings = await prisma_1.prisma.restaurantSettings.update({ where: { id: settings.id }, data: parsed.data });
        }
        await prisma_1.prisma.adminActionLog.create({
            data: { admin_user_id: session.id, action: "settings_updated", entity_type: "RestaurantSettings", entity_id: settings.id },
        });
        return (0, session_1.ok)(reply, settings);
    });
}
