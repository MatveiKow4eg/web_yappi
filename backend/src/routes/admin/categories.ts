import { FastifyInstance } from "fastify";
import { prisma } from "../../lib/prisma";
import { getAdminSession, requireAdminSession, ok, err } from "../../lib/session";
import { z } from "zod";

const CategorySchema = z.object({
  slug: z.string().min(2).regex(/^[a-z0-9-]+$/),
  name_ru: z.string().min(1),
  name_en: z.string().optional(),
  name_et: z.string().optional(),
  sort_order: z.number().int().optional().default(0),
  is_active: z.boolean().optional().default(true),
});

export default async function adminCategoriesRoutes(app: FastifyInstance) {
  app.get("/categories", async (req, reply) => {
    const session = await getAdminSession(req);
    if (!requireAdminSession(session, reply)) return;

    const cats = await prisma.category.findMany({
      orderBy: { sort_order: "asc" },
      include: { _count: { select: { products: true } } },
    });
    return ok(reply, cats);
  });

  app.post("/categories", async (req, reply) => {
    const session = await getAdminSession(req);
    if (!requireAdminSession(session, reply)) return;

    const parsed = CategorySchema.safeParse(req.body);
    if (!parsed.success) return err(reply, parsed.error.message);

    const cat = await prisma.category.create({ data: parsed.data });
    return reply.code(201).send({ ok: true, data: cat });
  });

  app.patch<{ Params: { id: string } }>("/categories/:id", async (req, reply) => {
    const session = await getAdminSession(req);
    if (!requireAdminSession(session, reply)) return;

    const parsed = CategorySchema.partial().safeParse(req.body);
    if (!parsed.success) return err(reply, parsed.error.message);

    const cat = await prisma.category.update({ where: { id: req.params.id }, data: parsed.data });
    return ok(reply, cat);
  });
}
