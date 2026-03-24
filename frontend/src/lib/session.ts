import { NextRequest } from "next/server";
import { verifyAdminToken, AdminTokenPayload } from "./auth";

export async function getAdminSession(
  req: NextRequest
): Promise<AdminTokenPayload | null> {
  const token = req.cookies.get("admin_token")?.value;
  if (!token) return null;
  return verifyAdminToken(token);
}

export function requireAdmin(session: AdminTokenPayload | null) {
  if (!session || session.role !== "admin") {
    return new Response(JSON.stringify({ ok: false, error: "Unauthorized" }), {
      status: 401,
    });
  }
  return null;
}

export function requireAnyAdmin(session: AdminTokenPayload | null) {
  if (!session) {
    return new Response(JSON.stringify({ ok: false, error: "Unauthorized" }), {
      status: 401,
    });
  }
  return null;
}
