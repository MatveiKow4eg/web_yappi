import { FastifyInstance } from "fastify";
import { z } from "zod";
import { prisma } from "../../lib/prisma";
import { err, getAdminSession, ok, requireAdminSession, requireRoles } from "../../lib/session";

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

function kitchenPayload(s: {
  kitchen_is_open: boolean;
  kitchen_day_started_at: Date | null;
  kitchen_day_ended_at: Date | null;
  kitchen_default_prep_minutes: number;
  min_delivery_time_minutes: number;
  max_delivery_time_minutes: number;
}) {
  return {
    kitchen_is_open: s.kitchen_is_open,
    kitchen_day_started_at: s.kitchen_day_started_at,
    kitchen_day_ended_at: s.kitchen_day_ended_at,
    kitchen_default_prep_minutes: s.kitchen_default_prep_minutes,
    min_delivery_time_minutes: s.min_delivery_time_minutes,
    max_delivery_time_minutes: s.max_delivery_time_minutes,
    server_time: new Date().toISOString(),
  };
}

export default async function adminKitchenRoutes(app: FastifyInstance) {
  app.get("/kitchen", async (req, reply) => {
    const session = await getAdminSession(req);
    if (!requireAdminSession(session, reply)) return;
    if (!requireRoles(session, reply, ["admin", "kitchen"])) return;

    const settings = await ensureSettings();
    return ok(reply, kitchenPayload(settings));
  });

  app.post("/kitchen/start-day", async (req, reply) => {
    const session = await getAdminSession(req);
    if (!requireAdminSession(session, reply)) return;
    if (!requireRoles(session, reply, ["admin", "kitchen"])) return;

    const now = new Date();
    const settings = await ensureSettings();
    const updated = await prisma.restaurantSettings.update({
      where: { id: settings.id },
      data: {
        kitchen_is_open: true,
        kitchen_day_started_at: now,
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

    return ok(reply, kitchenPayload(updated));
  });

  app.post("/kitchen/end-day", async (req, reply) => {
    const session = await getAdminSession(req);
    if (!requireAdminSession(session, reply)) return;
    if (!requireRoles(session, reply, ["admin", "kitchen"])) return;

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

    return ok(reply, kitchenPayload(updated));
  });

  app.patch("/kitchen/settings", async (req, reply) => {
    const session = await getAdminSession(req);
    if (!requireAdminSession(session, reply)) return;
    if (!requireRoles(session, reply, ["admin", "kitchen"])) return;

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

    return ok(reply, kitchenPayload(updated));
  });
}
