import { FastifyInstance } from "fastify";
import { prisma } from "../../lib/prisma";
import { ok, err } from "../../lib/session";
import { signAdminToken } from "../../lib/auth";
import bcrypt from "bcryptjs";
import { z } from "zod";

const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

const isProduction = process.env.NODE_ENV === "production";

export default async function adminAuthRoutes(app: FastifyInstance) {
  // POST /api/admin/auth/login
  app.post("/auth/login", async (req, reply) => {
    const parsed = LoginSchema.safeParse(req.body);
    if (!parsed.success) return err(reply, parsed.error.message);

    const { email, password } = parsed.data;

    const admin = await prisma.adminUser.findUnique({ where: { email } });
    if (!admin || !admin.is_active) return err(reply, "Неверные учётные данные", 401);

    const valid = await bcrypt.compare(password, admin.password_hash);
    if (!valid) return err(reply, "Неверные учётные данные", 401);

    await prisma.adminUser.update({
      where: { id: admin.id },
      data: { last_login_at: new Date() },
    });

    const token = await signAdminToken({ id: admin.id, email: admin.email, role: admin.role as "admin" | "kitchen" });

    reply.setCookie("admin_token", token, {
      httpOnly: true,
      secure: true,
      sameSite: "none",
      domain: ".yappisushi.ee",
      path: "/",
      maxAge: 60 * 60 * 8, // 8h
    });

    return ok(reply, { id: admin.id, email: admin.email, role: admin.role, full_name: admin.full_name });
  });

  // POST /api/admin/auth/logout
  app.post("/auth/logout", async (req, reply) => {
    reply.clearCookie("admin_token", { path: "/" });
    return ok(reply, null);
  });
}
