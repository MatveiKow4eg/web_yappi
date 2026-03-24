import { prisma } from "@/lib/prisma";
import { apiSuccess, apiError } from "@/lib/api-response";
import { signAdminToken } from "@/lib/auth";
import { compare } from "bcryptjs";
import { NextResponse } from "next/server";
import { z } from "zod";

const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  if (!body) return apiError("Invalid JSON");

  const parsed = LoginSchema.safeParse(body);
  if (!parsed.success) return apiError("Invalid email or password");

  const { email, password } = parsed.data;

  const user = await prisma.adminUser.findUnique({ where: { email } });
  if (!user || !user.is_active) return apiError("Invalid email or password", 401);

  const valid = await compare(password, user.password_hash);
  if (!valid) return apiError("Invalid email or password", 401);

  // Update last login
  await prisma.adminUser.update({
    where: { id: user.id },
    data: { last_login_at: new Date() },
  });

  const token = await signAdminToken({
    id: user.id,
    email: user.email,
    role: user.role,
  });

  const response = NextResponse.json({ ok: true, data: { role: user.role, full_name: user.full_name } });
  response.cookies.set("admin_token", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 8, // 8 hours
    path: "/",
  });

  return response;
}
