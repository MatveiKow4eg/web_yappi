"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = adminProductsRoutes;
const prisma_1 = require("../../lib/prisma");
const session_1 = require("../../lib/session");
const zod_1 = require("zod");
const ImageRefSchema = zod_1.z.string().trim().refine((value) => {
    if (!value)
        return true;
    return (value.startsWith("http://") ||
        value.startsWith("https://") ||
        value.startsWith("/") ||
        value.startsWith("#"));
}, { message: "image_url должен быть URL, /path или кодом вида '# nnn'" });
const ProductSchema = zod_1.z.object({
    category_id: zod_1.z.string().cuid(),
    slug: zod_1.z.string().min(2).regex(/^[a-z0-9-]+$/),
    name_ru: zod_1.z.string().min(1),
    name_en: zod_1.z.string().optional(),
    name_et: zod_1.z.string().optional(),
    description_ru: zod_1.z.string().optional(),
    description_en: zod_1.z.string().optional(),
    description_et: zod_1.z.string().optional(),
    base_price: zod_1.z.number().positive(),
    old_price: zod_1.z.number().positive().optional(),
    image_url: ImageRefSchema.optional().or(zod_1.z.literal("")),
    is_active: zod_1.z.boolean().optional().default(true),
    is_hidden: zod_1.z.boolean().optional().default(false),
    is_available: zod_1.z.boolean().optional().default(true),
    sort_order: zod_1.z.number().int().optional().default(0),
    sku: zod_1.z.string().optional(),
});
const UpdateSchema = ProductSchema.partial();
async function adminProductsRoutes(app) {
    // GET /api/admin/products
    app.get("/products", async (req, reply) => {
        const session = await (0, session_1.getAdminSession)(req);
        if (!(0, session_1.requireAdminSession)(session, reply))
            return;
        const { category, page = "1", limit = "50" } = req.query;
        const [products, total] = await Promise.all([
            prisma_1.prisma.product.findMany({
                where: category ? { category: { slug: category } } : {},
                orderBy: [{ category: { sort_order: "asc" } }, { sort_order: "asc" }],
                skip: (parseInt(page) - 1) * parseInt(limit),
                take: parseInt(limit),
                include: { category: { select: { name_ru: true, slug: true } } },
            }),
            prisma_1.prisma.product.count({ where: category ? { category: { slug: category } } : {} }),
        ]);
        return (0, session_1.ok)(reply, { products, total });
    });
    // POST /api/admin/products
    app.post("/products", async (req, reply) => {
        const session = await (0, session_1.getAdminSession)(req);
        if (!(0, session_1.requireAdminSession)(session, reply))
            return;
        const parsed = ProductSchema.safeParse(req.body);
        if (!parsed.success)
            return (0, session_1.err)(reply, parsed.error.message);
        const existing = await prisma_1.prisma.product.findUnique({ where: { slug: parsed.data.slug } });
        if (existing)
            return (0, session_1.err)(reply, "Товар с таким slug уже существует", 422);
        const product = await prisma_1.prisma.product.create({ data: parsed.data });
        await prisma_1.prisma.adminActionLog.create({
            data: { admin_user_id: session.id, action: "product_created", entity_type: "Product", entity_id: product.id },
        });
        return reply.code(201).send({ ok: true, data: product });
    });
    // PATCH /api/admin/products/:id
    app.patch("/products/:id", async (req, reply) => {
        const session = await (0, session_1.getAdminSession)(req);
        if (!(0, session_1.requireAdminSession)(session, reply))
            return;
        const parsed = UpdateSchema.safeParse(req.body);
        if (!parsed.success)
            return (0, session_1.err)(reply, parsed.error.message);
        const product = await prisma_1.prisma.product.update({ where: { id: req.params.id }, data: parsed.data });
        await prisma_1.prisma.adminActionLog.create({
            data: { admin_user_id: session.id, action: "product_updated", entity_type: "Product", entity_id: product.id },
        });
        return (0, session_1.ok)(reply, product);
    });
    // DELETE /api/admin/products/:id
    app.delete("/products/:id", async (req, reply) => {
        const session = await (0, session_1.getAdminSession)(req);
        if (!(0, session_1.requireAdminSession)(session, reply))
            return;
        await prisma_1.prisma.product.update({ where: { id: req.params.id }, data: { is_active: false, is_hidden: true } });
        return (0, session_1.ok)(reply, null);
    });
}
