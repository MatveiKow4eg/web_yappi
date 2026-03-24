import { FastifyInstance } from "fastify";
import { prisma } from "../../lib/prisma";
import { ok } from "../../lib/session";

export default async function publicBannersRoutes(app: FastifyInstance) {
  app.get("/banners", async (req, reply) => {
    const now = new Date();
    const banners = await prisma.banner.findMany({
      where: {
        is_active: true,
        OR: [{ starts_at: null }, { starts_at: { lte: now } }],
        AND: [{ OR: [{ ends_at: null }, { ends_at: { gte: now } }] }],
      },
      orderBy: { sort_order: "asc" },
    });
    return ok(reply, banners);
  });
}
