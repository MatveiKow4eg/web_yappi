import { FastifyReply, FastifyRequest } from "fastify";
import { verifyAdminToken, AdminTokenPayload } from "./auth";

export async function getAdminSession(
  req: FastifyRequest
): Promise<AdminTokenPayload | null> {
  const token = req.cookies?.admin_token;
  if (!token) return null;
  return verifyAdminToken(token);
}

export function requireAdminSession(
  session: AdminTokenPayload | null,
  reply: FastifyReply
): session is AdminTokenPayload {
  if (!session) {
    reply.code(401).send({ ok: false, error: "Unauthorized" });
    return false;
  }
  return true;
}

export function ok(reply: FastifyReply, data: unknown, status = 200) {
  return reply.code(status).send({ ok: true, data });
}

export function err(reply: FastifyReply, message: string, status = 400) {
  return reply.code(status).send({ ok: false, error: message });
}
