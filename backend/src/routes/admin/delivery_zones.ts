import { FastifyInstance } from "fastify";
import { prisma } from "../../lib/prisma";
import { getAdminSession, requireAdminSession, ok } from "../../lib/session";

export default async function adminDeliveryZonesRoutes(app: FastifyInstance) {
  // GET /api/admin/delivery-zones
  app.get("/delivery-zones", async (req, reply) => {
    const session = await getAdminSession(req);
    if (!requireAdminSession(session, reply)) return;

    const zones = await prisma.deliveryZone.findMany({
      orderBy: { name: "asc" },
    });
    return ok(reply, zones);
  });
}
