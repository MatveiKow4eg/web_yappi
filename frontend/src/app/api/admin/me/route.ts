import { getAdminSession } from "@/lib/session";
import { apiSuccess, apiError } from "@/lib/api-response";
import { NextRequest } from "next/server";

export async function GET(req: NextRequest) {
  const session = await getAdminSession(req);
  if (!session) return apiError("Unauthorized", 401);
  return apiSuccess(session);
}
