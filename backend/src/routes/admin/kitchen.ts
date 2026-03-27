import { FastifyInstance } from "fastify";
import { z } from "zod";
import { prisma } from "../../lib/prisma";
import { err, getAdminSession, ok, requireAdminSession } from "../../lib/session";

const KitchenSettingsSchema = z.object({
  kitchen_default_prep_minutes: z.number().int().min(1).max(240),
});

async function ensureSettings() {
  let settings = await prisma.restaurantSettings.findFirst();
  if (!settings) {
    settings = await prisma.restaurantSettings.create({
      data: { restaurant_name: "Yappi Sushi" },
    });
  }

  return settings;
}

export default async function adminKitchenRoutes(app: FastifyInstance) {
  app.get("/kitchen", async (req, reply) => {
    const session = await getAdminSession(req);
    if (!requireAdminSession(session, reply)) return;

    const settings = await ensureSettings();

    return ok(reply, {
      kitchen_is_open: settings.kitchen_is_open,
      kitchen_day_started_at: settings.kitchen_day_started_at,
      kitchen_day_ended_at: settings.kitchen_day_ended_at,
      kitchen_default_prep_minutes: settings.kitchen_default_prep_minutes,
      min_delivery_time_minutes: settings.min_delivery_time_minutes,
      max_delivery_time_minutes: settings.max_delivery_time_minutes,
    });
  });

  app.post("/kitchen/start-day", async (req, reply) => {
    const session = await getAdminSession(req);
    if (!requireAdminSession(session, reply)) return;

    const now = new Date();
    const settings = await ensureSettings();
    const updated = await prisma.restaurantSettings.update({
      where: { id: settings.id },
      data: {
        kitchen_is_open: true,
        kitchen_day_started_at: settings.kitchen_day_started_at ?? now,
        kitchen_day_ended_at: null,
      },
    });

    await prisma.adminActionLog.create({
      data: {
        admin_user_id: session.id,
        action: "kitchen_day_started",
        entity_type: "RestaurantSettings",
        entity_id: updated.id,
      },
    });

    return ok(reply, {
      kitchen_is_open: updated.kitchen_is_open,
      kitchen_day_started_at: updated.kitchen_day_started_at,
      kitchen_day_ended_at: updated.kitchen_day_ended_at,
      kitchen_default_prep_minutes: updated.kitchen_default_prep_minutes,
      min_delivery_time_minutes: updated.min_delivery_time_minutes,
      max_delivery_time_minutes: updated.max_delivery_time_minutes,
    });
  });

  app.post("/kitchen/end-day", async (req, reply) => {
    const session = await getAdminSession(req);
    if (!requireAdminSession(session, reply)) return;

    const settings = await ensureSettings();
    if (!settings.kitchen_is_open) {
      return err(reply, "Кухонная смена уже закрыта", 409);
    }

    const updated = await prisma.restaurantSettings.update({
      where: { id: settings.id },
      data: {
        kitchen_is_open: false,
        kitchen_day_ended_at: new Date(),
      },
    });

    await prisma.adminActionLog.create({
      data: {
        admin_user_id: session.id,
        action: "kitchen_day_ended",
        entity_type: "RestaurantSettings",
        entity_id: updated.id,
      },
    });

    return ok(reply, {
      kitchen_is_open: updated.kitchen_is_open,
      kitchen_day_started_at: updated.kitchen_day_started_at,
      kitchen_day_ended_at: updated.kitchen_day_ended_at,
      kitchen_default_prep_minutes: updated.kitchen_default_prep_minutes,
      min_delivery_time_minutes: updated.min_delivery_time_minutes,
      max_delivery_time_minutes: updated.max_delivery_time_minutes,
    });
  });

  app.patch("/kitchen/settings", async (req, reply) => {
    const session = await getAdminSession(req);
    if (!requireAdminSession(session, reply)) return;

    const parsed = KitchenSettingsSchema.safeParse(req.body);
    if (!parsed.success) return err(reply, parsed.error.message);

    const settings = await ensureSettings();
    const updated = await prisma.restaurantSettings.update({
      where: { id: settings.id },
      data: {
        kitchen_default_prep_minutes: parsed.data.kitchen_default_prep_minutes,
      },
    });

    await prisma.adminActionLog.create({
      data: {
        admin_user_id: session.id,
        action: "kitchen_settings_updated",
        entity_type: "RestaurantSettings",
        entity_id: updated.id,
        payload_json: parsed.data,
      },
    });

    return ok(reply, {
      kitchen_is_open: updated.kitchen_is_open,
      kitchen_day_started_at: updated.kitchen_day_started_at,
      kitchen_day_ended_at: updated.kitchen_day_ended_at,
      kitchen_default_prep_minutes: updated.kitchen_default_prep_minutes,
      min_delivery_time_minutes: updated.min_delivery_time_minutes,
      max_delivery_time_minutes: updated.max_delivery_time_minutes,
    });
  });
}
