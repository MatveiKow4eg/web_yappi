import { prisma } from "@/lib/prisma";
import { apiSuccess, apiError } from "@/lib/api-response";
import { NextRequest } from "next/server";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const category = searchParams.get("category");
  const search = searchParams.get("search");

  const products = await prisma.product.findMany({
    where: {
      is_active: true,
      is_hidden: false,
      ...(category ? { category: { slug: category } } : {}),
      ...(search
        ? {
            OR: [
              { name_ru: { contains: search, mode: "insensitive" } },
              { name_en: { contains: search, mode: "insensitive" } },
            ],
          }
        : {}),
    },
    orderBy: { sort_order: "asc" },
    include: {
      category: { select: { slug: true, name_ru: true, name_en: true, name_et: true } },
      variants: { where: { is_active: true }, orderBy: { sort_order: "asc" } },
    },
  });

  return apiSuccess(products);
}
