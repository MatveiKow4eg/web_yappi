"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = adminCategoriesRoutes;
const prisma_1 = require("../../lib/prisma");
const session_1 = require("../../lib/session");
const zod_1 = require("zod");
const CategorySchema = zod_1.z.object({
    slug: zod_1.z.string().min(2).regex(/^[a-z0-9-]+$/),
    name_ru: zod_1.z.string().min(1),
    name_en: zod_1.z.string().optional(),
    name_et: zod_1.z.string().optional(),
    sort_order: zod_1.z.number().int().optional().default(0),
    is_active: zod_1.z.boolean().optional().default(true),
});
async function adminCategoriesRoutes(app) {
    app.get("/categories", async (req, reply) => {
        const session = await (0, session_1.getAdminSession)(req);
        if (!(0, session_1.requireAdminSession)(session, reply))
            return;
        if (!(0, session_1.requireRoles)(session, reply, ["admin"]))
            return;
        const cats = await prisma_1.prisma.category.findMany({
            orderBy: { sort_order: "asc" },
            include: { _count: { select: { products: true } } },
        });
        return (0, session_1.ok)(reply, cats);
    });
    app.post("/categories", async (req, reply) => {
        const session = await (0, session_1.getAdminSession)(req);
        if (!(0, session_1.requireAdminSession)(session, reply))
            return;
        if (!(0, session_1.requireRoles)(session, reply, ["admin"]))
            return;
        const parsed = CategorySchema.safeParse(req.body);
        if (!parsed.success)
            return (0, session_1.err)(reply, parsed.error.message);
        const cat = await prisma_1.prisma.category.create({ data: parsed.data });
        return reply.code(201).send({ ok: true, data: cat });
    });
    app.patch("/categories/:id", async (req, reply) => {
        const session = await (0, session_1.getAdminSession)(req);
        if (!(0, session_1.requireAdminSession)(session, reply))
            return;
        if (!(0, session_1.requireRoles)(session, reply, ["admin"]))
            return;
        const parsed = CategorySchema.partial().safeParse(req.body);
        if (!parsed.success)
            return (0, session_1.err)(reply, parsed.error.message);
        const cat = await prisma_1.prisma.category.update({ where: { id: req.params.id }, data: parsed.data });
        return (0, session_1.ok)(reply, cat);
    });
}
