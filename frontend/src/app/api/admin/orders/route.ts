import { prisma } from "@/lib/prisma";
import { apiSuccess, apiError } from "@/lib/api-response";
import { getAdminSession } from "@/lib/session";
import { requireAnyAdmin } from "@/lib/session";
import { NextRequest } from "next/server";
import { z } from "zod";

export async function GET(req: NextRequest) {
  const session = await getAdminSession(req);
  const err = requireAnyAdmin(session);
  if (err) return err;

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status");
  const page = parseInt(searchParams.get("page") ?? "1");
  const limit = 20;

  const orders = await prisma.order.findMany({
    where: status ? { status: status as never } : {},
    orderBy: { created_at: "desc" },
    take: limit,
    skip: (page - 1) * limit,
    include: {
      items: { select: { quantity: true } },
    },
  });

  const total = await prisma.order.count({
    where: status ? { status: status as never } : {},
  });

  return apiSuccess({ orders, total, page, limit });
}
