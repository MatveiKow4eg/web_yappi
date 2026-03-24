import { FastifyInstance } from "fastify";
import { prisma } from "../../lib/prisma";
import { getAdminSession, requireAdminSession, ok, err } from "../../lib/session";
import { z } from "zod";

const ImageRefSchema = z.string().trim().refine(
  (value) => {
    if (!value) return true;
    return (
      value.startsWith("http://") ||
      value.startsWith("https://") ||
      value.startsWith("/") ||
      value.startsWith("#")
    );
  },
  { message: "image_url должен быть URL, /path или кодом вида '# nnn'" }
);

const ProductSchema = z.object({
  category_id: z.string().cuid(),
  slug: z.string().min(2).regex(/^[a-z0-9-]+$/),
  name_ru: z.string().min(1),
  name_en: z.string().optional(),
  name_et: z.string().optional(),
  description_ru: z.string().optional(),
  description_en: z.string().optional(),
  description_et: z.string().optional(),
  base_price: z.number().positive(),
  old_price: z.number().positive().optional(),
  image_url: ImageRefSchema.optional().or(z.literal("")),
  is_active: z.boolean().optional().default(true),
  is_hidden: z.boolean().optional().default(false),
  is_available: z.boolean().optional().default(true),
  sort_order: z.number().int().optional().default(0),
  sku: z.string().optional(),
});

const UpdateSchema = ProductSchema.partial();

export default async function adminProductsRoutes(app: FastifyInstance) {
  // GET /api/admin/products
  app.get<{ Querystring: { category?: string; page?: string; limit?: string } }>(
    "/products",
    async (req, reply) => {
      const session = await getAdminSession(req);
      if (!requireAdminSession(session, reply)) return;

      const { category, page = "1", limit = "50" } = req.query;
      const [products, total] = await Promise.all([
        prisma.product.findMany({
          where: category ? { category: { slug: category } } : {},
          orderBy: [{ category: { sort_order: "asc" } }, { sort_order: "asc" }],
          skip: (parseInt(page) - 1) * parseInt(limit),
          take: parseInt(limit),
          include: { category: { select: { name_ru: true, slug: true } } },
        }),
        prisma.product.count({ where: category ? { category: { slug: category } } : {} }),
      ]);
      return ok(reply, { products, total });
    }
  );

  // POST /api/admin/products
  app.post("/products", async (req, reply) => {
    const session = await getAdminSession(req);
    if (!requireAdminSession(session, reply)) return;

    const parsed = ProductSchema.safeParse(req.body);
    if (!parsed.success) return err(reply, parsed.error.message);

    const existing = await prisma.product.findUnique({ where: { slug: parsed.data.slug } });
    if (existing) return err(reply, "Товар с таким slug уже существует", 422);

    const product = await prisma.product.create({ data: parsed.data as Parameters<typeof prisma.product.create>[0]["data"] });

    await prisma.adminActionLog.create({
      data: { admin_user_id: session.id, action: "product_created", entity_type: "Product", entity_id: product.id },
    });

    return reply.code(201).send({ ok: true, data: product });
  });

  // PATCH /api/admin/products/:id
  app.patch<{ Params: { id: string } }>("/products/:id", async (req, reply) => {
    const session = await getAdminSession(req);
    if (!requireAdminSession(session, reply)) return;

    const parsed = UpdateSchema.safeParse(req.body);
    if (!parsed.success) return err(reply, parsed.error.message);

    const product = await prisma.product.update({ where: { id: req.params.id }, data: parsed.data as object });

    await prisma.adminActionLog.create({
      data: { admin_user_id: session.id, action: "product_updated", entity_type: "Product", entity_id: product.id },
    });

    return ok(reply, product);
  });

  // DELETE /api/admin/products/:id
  app.delete<{ Params: { id: string } }>("/products/:id", async (req, reply) => {
    const session = await getAdminSession(req);
    if (!requireAdminSession(session, reply)) return;

    await prisma.product.update({ where: { id: req.params.id }, data: { is_active: false, is_hidden: true } });
    return ok(reply, null);
  });
}
