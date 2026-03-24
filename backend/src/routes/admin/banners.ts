import { FastifyInstance } from "fastify";
import { prisma } from "../../lib/prisma";
import { getAdminSession, requireAdminSession, ok, err } from "../../lib/session";
import { z } from "zod";
import { v4 as uuidv4 } from "uuid";

const BannerSchema = z.object({
  title_ru: z.string().optional(),
  title_en: z.string().default(""),
  title_et: z.string().default(""),
  subtitle_ru: z.string().optional().nullable(),
  subtitle_en: z.string().optional().nullable(),
  subtitle_et: z.string().optional().nullable(),
  image_url: z.string().optional().nullable(),
  link_url: z.string().optional().nullable(),
  is_active: z.boolean().default(true),
  sort_order: z.number().int().default(0),
  starts_at: z.string().datetime().optional().nullable(),
  ends_at: z.string().datetime().optional().nullable(),
});

export default async function adminBannersRoutes(app: FastifyInstance) {
  // GET /api/admin/banners
  app.get("/banners", async (req, reply) => {
    const session = await getAdminSession(req);
    if (!requireAdminSession(session, reply)) return;

    const banners = await prisma.banner.findMany({
      orderBy: { sort_order: "asc" },
    });
    return ok(reply, banners);
  });

  // POST /api/admin/banners
  app.post("/banners", async (req, reply) => {
    const session = await getAdminSession(req);
    if (!requireAdminSession(session, reply)) return;

    const parsed = BannerSchema.safeParse(req.body);
    if (!parsed.success) return err(reply, parsed.error.message);

    if (!parsed.data.title_ru) {
      return err(reply, "title_ru is required", 422);
    }

    const banner = await prisma.banner.create({
      data: {
        title_ru: parsed.data.title_ru,
        title_en: parsed.data.title_en,
        title_et: parsed.data.title_et,
        subtitle_ru: parsed.data.subtitle_ru,
        subtitle_en: parsed.data.subtitle_en,
        subtitle_et: parsed.data.subtitle_et,
        image_url: parsed.data.image_url,
        link_url: parsed.data.link_url,
        is_active: parsed.data.is_active,
        sort_order: parsed.data.sort_order,
        starts_at: parsed.data.starts_at ? new Date(parsed.data.starts_at) : null,
        ends_at: parsed.data.ends_at ? new Date(parsed.data.ends_at) : null,
      },
    });

    return ok(reply, banner, 201);
  });

  // PATCH /api/admin/banners/:id
  app.patch("/banners/:id", async (req, reply) => {
    const session = await getAdminSession(req);
    if (!requireAdminSession(session, reply)) return;

    const { id } = req.params as { id: string };
    const parsed = BannerSchema.partial().safeParse(req.body);
    if (!parsed.success) return err(reply, parsed.error.message);

    const banner = await prisma.banner.update({
      where: { id },
      data: {
        ...(parsed.data.title_ru !== undefined && { title_ru: parsed.data.title_ru }),
        ...(parsed.data.title_en !== undefined && { title_en: parsed.data.title_en }),
        ...(parsed.data.title_et !== undefined && { title_et: parsed.data.title_et }),
        ...(parsed.data.subtitle_ru !== undefined && { subtitle_ru: parsed.data.subtitle_ru }),
        ...(parsed.data.subtitle_en !== undefined && { subtitle_en: parsed.data.subtitle_en }),
        ...(parsed.data.subtitle_et !== undefined && { subtitle_et: parsed.data.subtitle_et }),
        ...(parsed.data.image_url !== undefined && { image_url: parsed.data.image_url }),
        ...(parsed.data.link_url !== undefined && { link_url: parsed.data.link_url }),
        ...(parsed.data.is_active !== undefined && { is_active: parsed.data.is_active }),
        ...(parsed.data.sort_order !== undefined && { sort_order: parsed.data.sort_order }),
        ...(parsed.data.starts_at !== undefined && { starts_at: parsed.data.starts_at ? new Date(parsed.data.starts_at) : null }),
        ...(parsed.data.ends_at !== undefined && { ends_at: parsed.data.ends_at ? new Date(parsed.data.ends_at) : null }),
      },
    });

    return ok(reply, banner);
  });

  // DELETE /api/admin/banners/:id
  app.delete("/banners/:id", async (req, reply) => {
    const session = await getAdminSession(req);
    if (!requireAdminSession(session, reply)) return;

    const { id } = req.params as { id: string };

    await prisma.banner.delete({
      where: { id },
    });

    return ok(reply, { id });
  });
}
