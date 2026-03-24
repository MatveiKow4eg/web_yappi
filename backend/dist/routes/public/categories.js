"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = publicCategoriesRoutes;
const prisma_1 = require("../../lib/prisma");
const session_1 = require("../../lib/session");
async function publicCategoriesRoutes(app) {
    app.get("/categories", async (req, reply) => {
        const includeProducts = req.query.includeProducts === "true" || req.query.includeProducts === "full";
        const categories = await prisma_1.prisma.category.findMany({
            where: { is_active: true },
            orderBy: { sort_order: "asc" },
            select: {
                id: true,
                slug: true,
                name_ru: true,
                name_en: true,
                name_et: true,
                sort_order: true,
                _count: { select: { products: { where: { is_active: true, is_hidden: false } } } },
                ...(includeProducts
                    ? {
                        products: {
                            where: { is_active: true, is_hidden: false, is_available: true },
                            orderBy: { sort_order: "asc" },
                        },
                    }
                    : {}),
            },
        });
        return (0, session_1.ok)(reply, categories);
    });
    app.get("/categories/:slug", async (req, reply) => {
        const category = await prisma_1.prisma.category.findUnique({
            where: { slug: req.params.slug, is_active: true },
            include: {
                products: {
                    where: { is_active: true, is_hidden: false },
                    orderBy: { sort_order: "asc" },
                },
            },
        });
        if (!category)
            return reply.status(404).send({ success: false, error: "Category not found" });
        return (0, session_1.ok)(reply, category);
    });
}
