import { FastifyInstance } from "fastify";
import { prisma } from "../../lib/prisma";
import { getAdminSession, requireAdminSession, ok } from "../../lib/session";

export default async function adminPromoCodesRoutes(app: FastifyInstance) {
  // GET /api/admin/promo-codes
  app.get("/promo-codes", async (req, reply) => {
    const session = await getAdminSession(req);
    if (!requireAdminSession(session, reply)) return;

    const codes = await prisma.promoCode.findMany({
      orderBy: { created_at: "desc" },
      include: { _count: { select: { usages: true } } },
    });
    return ok(reply, codes);
  });
}
