"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = adminAuthRoutes;
const prisma_1 = require("../../lib/prisma");
const session_1 = require("../../lib/session");
const auth_1 = require("../../lib/auth");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const zod_1 = require("zod");
const LoginSchema = zod_1.z.object({
    email: zod_1.z.string().email(),
    password: zod_1.z.string().min(1),
});
const isProduction = process.env.NODE_ENV === "production";
const cookieDomain = isProduction
    ? process.env.COOKIE_DOMAIN?.trim() || ".yappisushi.ee"
    : undefined;
async function adminAuthRoutes(app) {
    // POST /api/admin/auth/login
    app.post("/auth/login", async (req, reply) => {
        const parsed = LoginSchema.safeParse(req.body);
        if (!parsed.success)
            return (0, session_1.err)(reply, parsed.error.message);
        const { email, password } = parsed.data;
        const admin = await prisma_1.prisma.adminUser.findUnique({ where: { email } });
        if (!admin || !admin.is_active)
            return (0, session_1.err)(reply, "Неверные учётные данные", 401);
        const valid = await bcryptjs_1.default.compare(password, admin.password_hash);
        if (!valid)
            return (0, session_1.err)(reply, "Неверные учётные данные", 401);
        await prisma_1.prisma.adminUser.update({
            where: { id: admin.id },
            data: { last_login_at: new Date() },
        });
        const token = await (0, auth_1.signAdminToken)({ id: admin.id, email: admin.email, role: admin.role });
        const cookieOptions = {
            httpOnly: true,
            secure: isProduction,
            sameSite: (isProduction ? "none" : "lax"),
            ...(cookieDomain ? { domain: cookieDomain } : {}),
            path: "/",
        };
        reply.setCookie("admin_token", token, {
            ...cookieOptions,
            maxAge: 60 * 60 * 8, // 8h
        });
        return (0, session_1.ok)(reply, { id: admin.id, email: admin.email, role: admin.role, full_name: admin.full_name });
    });
    // POST /api/admin/auth/logout
    app.post("/auth/logout", async (req, reply) => {
        reply.clearCookie("admin_token", {
            path: "/",
            ...(cookieDomain ? { domain: cookieDomain } : {}),
        });
        return (0, session_1.ok)(reply, null);
    });
}
