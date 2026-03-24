import { prisma } from "@/lib/prisma";
import { apiSuccess, apiError } from "@/lib/api-response";
import { getAdminSession, requireAdmin } from "@/lib/session";
import { NextRequest } from "next/server";
import { z } from "zod";

export async function GET(req: NextRequest) {
  const session = await getAdminSession(req);
  const err = requireAdmin(session);
  if (err) return err;

  const settings = await prisma.restaurantSettings.findFirst();
  return apiSuccess(settings);
}

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
  working_hours_json: z.any().optional(),
  social_links_json: z.any().optional(),
});

export async function PATCH(req: NextRequest) {
  const session = await getAdminSession(req);
  const err = requireAdmin(session);
  if (err) return err;

  const body = await req.json().catch(() => null);
  if (!body) return apiError("Invalid JSON");

  const parsed = SettingsSchema.safeParse(body);
  if (!parsed.success) return apiError(parsed.error.message);

  let settings = await prisma.restaurantSettings.findFirst();

  if (!settings) {
    settings = await prisma.restaurantSettings.create({
      data: { restaurant_name: "Yappi Sushi", ...parsed.data },
    });
  } else {
    settings = await prisma.restaurantSettings.update({
      where: { id: settings.id },
      data: parsed.data,
    });
  }

  await prisma.adminActionLog.create({
    data: {
      admin_user_id: session!.id,
      action: "settings_updated",
      entity_type: "RestaurantSettings",
      entity_id: settings.id,
    },
  });

  return apiSuccess(settings);
}
