import { FastifyInstance } from "fastify";
import { prisma } from "../../lib/prisma";
import { ok } from "../../lib/session";

export default async function publicCategoriesRoutes(app: FastifyInstance) {
  app.get("/categories", async (req, reply) => {
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
      },
    });
    return ok(reply, categories);
  });
}
