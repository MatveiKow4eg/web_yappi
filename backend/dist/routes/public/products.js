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
            select: {
                id: true,
                category_id: true,
                slug: true,
                name_ru: true,
                name_en: true,
                name_et: true,
                description_ru: true,
                description_en: true,
                description_et: true,
                image_url: true,
                base_price: true,
                old_price: true,
                is_active: true,
                is_hidden: true,
                is_available: true,
                is_combo: true,
                sku: true,
                sort_order: true,
                pieces_total: true,
                allow_half_half: true,
                half_half_price: true,
                half_half_old_price: true,
                created_at: true,
                updated_at: true,
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
            select: {
                id: true,
                category_id: true,
                slug: true,
                name_ru: true,
                name_en: true,
                name_et: true,
                description_ru: true,
                description_en: true,
                description_et: true,
                image_url: true,
                base_price: true,
                old_price: true,
                is_active: true,
                is_hidden: true,
                is_available: true,
                is_combo: true,
                sku: true,
                sort_order: true,
                pieces_total: true,
                allow_half_half: true,
                half_half_price: true,
                half_half_old_price: true,
                created_at: true,
                updated_at: true,
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
