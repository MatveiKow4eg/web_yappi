import { prisma } from "@/lib/prisma";
import { apiSuccess, apiError } from "@/lib/api-response";
import { getAdminSession, requireAnyAdmin } from "@/lib/session";
import { NextRequest } from "next/server";
import { z } from "zod";

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getAdminSession(req);
  const err = requireAnyAdmin(session);
  if (err) return err;

  const order = await prisma.order.findUnique({
    where: { id: params.id },
    include: {
      items: { include: { selections: true } },
      promo_code: true,
      delivery_zone: true,
    },
  });

  if (!order) return apiError("Order not found", 404);
  return apiSuccess(order);
}

const StatusSchema = z.object({
  status: z.enum(["new", "confirmed_preparing", "ready", "sent", "completed", "cancelled"]),
  cancel_reason: z.string().optional(),
});

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getAdminSession(req);
  const err = requireAnyAdmin(session);
  if (err) return err;

  const body = await req.json().catch(() => null);
  if (!body) return apiError("Invalid JSON");

  const parsed = StatusSchema.safeParse(body);
  if (!parsed.success) return apiError(parsed.error.message);

  const { status, cancel_reason } = parsed.data;

  const now = new Date();
  const timestamps: Record<string, Date> = {};
  if (status === "confirmed_preparing") timestamps.confirmed_at = now;
  if (status === "ready") timestamps.ready_at = now;
  if (status === "sent") timestamps.sent_at = now;
  if (status === "completed") timestamps.completed_at = now;
  if (status === "cancelled") timestamps.cancelled_at = now;

  const order = await prisma.order.update({
    where: { id: params.id },
    data: { status, cancel_reason, ...timestamps },
  });

  // Log the action
  await prisma.adminActionLog.create({
    data: {
      admin_user_id: session!.id,
      action: `status_changed_to_${status}`,
      entity_type: "Order",
      entity_id: params.id,
      payload_json: { status, cancel_reason },
    },
  });

  return apiSuccess(order);
}
