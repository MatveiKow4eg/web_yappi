import { FastifyInstance } from "fastify";
import { prisma } from "../../lib/prisma";
import { getAdminSession, requireAdminSession, ok } from "../../lib/session";

export default async function adminBannersRoutes(app: FastifyInstance) {
  // GET /api/admin/banners
  app.get("/banners", async (req, reply) => {
    const session = await getAdminSession(req);
    if (!requireAdminSession(session, reply)) return;

    const banners = await prisma.banner.findMany({
      orderBy: { sort_order: "asc" },
    });
    return ok(reply, banners);
  });
}
