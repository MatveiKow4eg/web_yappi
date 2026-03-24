import { FastifyInstance } from "fastify";
import { getAdminSession, requireAdminSession, ok } from "../../lib/session";

export default async function adminMeRoutes(app: FastifyInstance) {
  app.get("/me", async (req, reply) => {
    const session = await getAdminSession(req);
    if (!requireAdminSession(session, reply)) return;
    return ok(reply, session);
  });
}
