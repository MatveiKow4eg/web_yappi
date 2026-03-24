import { FastifyInstance } from "fastify";
import { prisma } from "../../lib/prisma";
import { ok } from "../../lib/session";

export default async function publicCategoriesRoutes(app: FastifyInstance) {
  app.get<{ Querystring: { includeProducts?: string } }>("/categories", async (req, reply) => {
    const includeProducts = req.query.includeProducts === "true" || req.query.includeProducts === "full";
    
    const categories = await prisma.category.findMany({
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
    return ok(reply, categories);
  });

  app.get<{ Params: { slug: string } }>("/categories/:slug", async (req, reply) => {
    const category = await prisma.category.findUnique({
      where: { slug: req.params.slug, is_active: true },
      include: {
        products: {
          where: { is_active: true, is_hidden: false },
          orderBy: { sort_order: "asc" },
        },
      },
    });
    if (!category) return reply.status(404).send({ success: false, error: "Category not found" });
    return ok(reply, category);
  });
}
