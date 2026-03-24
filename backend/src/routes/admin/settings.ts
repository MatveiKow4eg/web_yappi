import { FastifyInstance } from "fastify";
import { prisma } from "../../lib/prisma";
import { getAdminSession, requireAdminSession, ok, err } from "../../lib/session";
import { z } from "zod";

const SettingsSchema = z.object({
  restaurant_name: z.string().min(1).optional(),
  phone: z.string().optional(),
  email: z.string().email().optional().or(z.literal("")),
  address_ru: z.string().optional(),
  address_en: z.string().optional(),
  address_et: z.string().optional(),
  pickup_enabled: z.boolean().optional(),
  delivery_enabled: z.boolean().optional(),
  stripe_enabled: z.boolean().optional(),
  cash_on_pickup_enabled: z.boolean().optional(),
  card_on_pickup_enabled: z.boolean().optional(),
  min_delivery_time_minutes: z.number().int().positive().optional(),
  max_delivery_time_minutes: z.number().int().positive().optional(),
});

export default async function adminSettingsRoutes(app: FastifyInstance) {
  app.get("/settings", async (req, reply) => {
    const session = await getAdminSession(req);
    if (!requireAdminSession(session, reply)) return;

    let settings = await prisma.restaurantSettings.findFirst();
    if (!settings) {
      settings = await prisma.restaurantSettings.create({ data: { restaurant_name: "Yappi Sushi" } });
    }
    return ok(reply, settings);
  });

  app.patch("/settings", async (req, reply) => {
    const session = await getAdminSession(req);
    if (!requireAdminSession(session, reply)) return;

    const parsed = SettingsSchema.safeParse(req.body);
    if (!parsed.success) return err(reply, parsed.error.message);

    let settings = await prisma.restaurantSettings.findFirst();
    if (!settings) {
      settings = await prisma.restaurantSettings.create({ data: { restaurant_name: "Yappi Sushi", ...parsed.data } });
    } else {
      settings = await prisma.restaurantSettings.update({ where: { id: settings.id }, data: parsed.data });
    }

    await prisma.adminActionLog.create({
      data: { admin_user_id: session.id, action: "settings_updated", entity_type: "RestaurantSettings", entity_id: settings.id },
    });

    return ok(reply, settings);
  });
}
