import { FastifyInstance } from "fastify";
import { prisma } from "../../lib/prisma";
import { ok, err } from "../../lib/session";

export default async function publicProductsRoutes(app: FastifyInstance) {
  // GET /api/products?category=slug&search=q&page=1&limit=20
  app.get<{ Querystring: { category?: string; search?: string; page?: string; limit?: string } }>(
    "/products",
    async (req, reply) => {
      const { category, search, page = "1", limit = "20" } = req.query;
      const skip = (parseInt(page) - 1) * parseInt(limit);

      const products = await prisma.product.findMany({
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
      return ok(reply, products);
    }
  );

  // GET /api/products/:slug
  app.get<{ Params: { slug: string } }>("/products/:slug", async (req, reply) => {
    const product = await prisma.product.findFirst({
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
    if (!product) return err(reply, "Not found", 404);
    return ok(reply, product);
  });
}
