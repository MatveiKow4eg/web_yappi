"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = publicProductsRoutes;
const prisma_1 = require("../../lib/prisma");
const session_1 = require("../../lib/session");
async function publicProductsRoutes(app) {
    // GET /api/products?category=slug&search=q&page=1&limit=20
    app.get("/products", async (req, reply) => {
        const { category, search, page = "1", limit = "20" } = req.query;
        const skip = (parseInt(page) - 1) * parseInt(limit);
        const products = await prisma_1.prisma.product.findMany({
            where: {
                is_active: true,
                is_hidden: false,
                ...(category ? { category: { slug: category } } : {}),
                ...(search ? {
                    OR: [
                        { name_ru: { contains: search, mode: "insensitive" } },
                        { name_en: { contains: search, mode: "insensitive" } },
                    ],
                } : {}),
            },
            orderBy: { sort_order: "asc" },
            skip,
            take: parseInt(limit),
            include: {
                category: { select: { slug: true, name_ru: true } },
                variants: { where: { is_active: true }, orderBy: { sort_order: "asc" } },
                option_links: {
                    include: {
                        option_group: {
                            include: { items: { where: { is_active: true }, orderBy: { sort_order: "asc" } } },
                        },
                    },
                },
            },
        });
        return (0, session_1.ok)(reply, products);
    });
    // GET /api/products/:slug
    app.get("/products/:slug", async (req, reply) => {
        const product = await prisma_1.prisma.product.findFirst({
            where: { slug: req.params.slug, is_active: true, is_hidden: false },
            include: {
                category: { select: { slug: true, name_ru: true } },
                variants: { where: { is_active: true }, orderBy: { sort_order: "asc" } },
                option_links: {
                    include: {
                        option_group: {
                            include: { items: { where: { is_active: true }, orderBy: { sort_order: "asc" } } },
                        },
                    },
                },
            },
        });
        if (!product)
            return (0, session_1.err)(reply, "Not found", 404);
        return (0, session_1.ok)(reply, product);
    });
}
