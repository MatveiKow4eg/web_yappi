"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = adminBannersRoutes;
const prisma_1 = require("../../lib/prisma");
const session_1 = require("../../lib/session");
const zod_1 = require("zod");
const BannerSchema = zod_1.z.object({
    title_ru: zod_1.z.string().optional(),
    title_en: zod_1.z.string().default(""),
    title_et: zod_1.z.string().default(""),
    subtitle_ru: zod_1.z.string().optional().nullable(),
    subtitle_en: zod_1.z.string().optional().nullable(),
    subtitle_et: zod_1.z.string().optional().nullable(),
    image_url: zod_1.z.string().optional().nullable(),
    link_url: zod_1.z.string().optional().nullable(),
    is_active: zod_1.z.boolean().default(true),
    sort_order: zod_1.z.number().int().default(0),
    starts_at: zod_1.z.string().datetime().optional().nullable(),
    ends_at: zod_1.z.string().datetime().optional().nullable(),
});
async function adminBannersRoutes(app) {
    // GET /api/admin/banners
    app.get("/banners", async (req, reply) => {
        const session = await (0, session_1.getAdminSession)(req);
        if (!(0, session_1.requireAdminSession)(session, reply))
            return;
        const banners = await prisma_1.prisma.banner.findMany({
            orderBy: { sort_order: "asc" },
        });
        return (0, session_1.ok)(reply, banners);
    });
    // POST /api/admin/banners
    app.post("/banners", async (req, reply) => {
        const session = await (0, session_1.getAdminSession)(req);
        if (!(0, session_1.requireAdminSession)(session, reply))
            return;
        const parsed = BannerSchema.safeParse(req.body);
        if (!parsed.success)
            return (0, session_1.err)(reply, parsed.error.message);
        if (!parsed.data.title_ru) {
            return (0, session_1.err)(reply, "title_ru is required", 422);
        }
        const banner = await prisma_1.prisma.banner.create({
            data: {
                title_ru: parsed.data.title_ru,
                title_en: parsed.data.title_en,
                title_et: parsed.data.title_et,
                subtitle_ru: parsed.data.subtitle_ru,
                subtitle_en: parsed.data.subtitle_en,
                subtitle_et: parsed.data.subtitle_et,
                image_url: parsed.data.image_url,
                link_url: parsed.data.link_url,
                is_active: parsed.data.is_active,
                sort_order: parsed.data.sort_order,
                starts_at: parsed.data.starts_at ? new Date(parsed.data.starts_at) : null,
                ends_at: parsed.data.ends_at ? new Date(parsed.data.ends_at) : null,
            },
        });
        return (0, session_1.ok)(reply, banner, 201);
    });
    // PATCH /api/admin/banners/:id
    app.patch("/banners/:id", async (req, reply) => {
        const session = await (0, session_1.getAdminSession)(req);
        if (!(0, session_1.requireAdminSession)(session, reply))
            return;
        const { id } = req.params;
        const parsed = BannerSchema.partial().safeParse(req.body);
        if (!parsed.success)
            return (0, session_1.err)(reply, parsed.error.message);
        const banner = await prisma_1.prisma.banner.update({
            where: { id },
            data: {
                ...(parsed.data.title_ru !== undefined && { title_ru: parsed.data.title_ru }),
                ...(parsed.data.title_en !== undefined && { title_en: parsed.data.title_en }),
                ...(parsed.data.title_et !== undefined && { title_et: parsed.data.title_et }),
                ...(parsed.data.subtitle_ru !== undefined && { subtitle_ru: parsed.data.subtitle_ru }),
                ...(parsed.data.subtitle_en !== undefined && { subtitle_en: parsed.data.subtitle_en }),
                ...(parsed.data.subtitle_et !== undefined && { subtitle_et: parsed.data.subtitle_et }),
                ...(parsed.data.image_url !== undefined && { image_url: parsed.data.image_url }),
                ...(parsed.data.link_url !== undefined && { link_url: parsed.data.link_url }),
                ...(parsed.data.is_active !== undefined && { is_active: parsed.data.is_active }),
                ...(parsed.data.sort_order !== undefined && { sort_order: parsed.data.sort_order }),
                ...(parsed.data.starts_at !== undefined && { starts_at: parsed.data.starts_at ? new Date(parsed.data.starts_at) : null }),
                ...(parsed.data.ends_at !== undefined && { ends_at: parsed.data.ends_at ? new Date(parsed.data.ends_at) : null }),
            },
        });
        return (0, session_1.ok)(reply, banner);
    });
    // DELETE /api/admin/banners/:id
    app.delete("/banners/:id", async (req, reply) => {
        const session = await (0, session_1.getAdminSession)(req);
        if (!(0, session_1.requireAdminSession)(session, reply))
            return;
        const { id } = req.params;
        await prisma_1.prisma.banner.delete({
            where: { id },
        });
        return (0, session_1.ok)(reply, { id });
    });
}
