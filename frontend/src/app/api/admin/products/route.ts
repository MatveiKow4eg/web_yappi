import { prisma } from "@/lib/prisma";
import { apiSuccess, apiError } from "@/lib/api-response";
import { getAdminSession, requireAdmin } from "@/lib/session";
import { NextRequest } from "next/server";
import { z } from "zod";

export async function GET(req: NextRequest) {
  const session = await getAdminSession(req);
  const err = requireAdmin(session);
  if (err) return err;

  const products = await prisma.product.findMany({
    orderBy: [{ category_id: "asc" }, { sort_order: "asc" }],
    include: { category: { select: { name_ru: true } } },
  });

  return apiSuccess(products);
}

const CreateProductSchema = z.object({
  category_id: z.string().min(1),
  slug: z.string().min(2).regex(/^[a-z0-9-]+$/),
  name_ru: z.string().min(1),
  name_en: z.string().optional().default(""),
  name_et: z.string().optional().default(""),
  description_ru: z.string().optional(),
  description_en: z.string().optional(),
  description_et: z.string().optional(),
  image_url: z.string().url().optional().or(z.literal("")),
  base_price: z.number().positive(),
  old_price: z.number().positive().optional(),
  sort_order: z.number().int().default(0),
  is_active: z.boolean().default(true),
  is_available: z.boolean().default(true),
});

export async function POST(req: NextRequest) {
  const session = await getAdminSession(req);
  const err = requireAdmin(session);
  if (err) return err;

  const body = await req.json().catch(() => null);
  if (!body) return apiError("Invalid JSON");

  const parsed = CreateProductSchema.safeParse(body);
  if (!parsed.success) return apiError(parsed.error.message);

  const { image_url, ...rest } = parsed.data;

  try {
    const product = await prisma.product.create({
      data: {
        ...rest,
        image_url: image_url || null,
        name_en: rest.name_en || rest.name_ru,
        name_et: rest.name_et || rest.name_ru,
      },
    });

    await prisma.adminActionLog.create({
      data: {
        admin_user_id: session!.id,
        action: "product_created",
        entity_type: "Product",
        entity_id: product.id,
        payload_json: { name: product.name_ru, slug: product.slug },
      },
    });

    return apiSuccess(product, 201);
  } catch (e: unknown) {
    const err = e as { code?: string };
    if (err.code === "P2002") return apiError("Slug уже существует", 409);
    throw e;
  }
}
