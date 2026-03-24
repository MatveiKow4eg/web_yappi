import { prisma } from "@/lib/prisma";
import { apiSuccess } from "@/lib/api-response";

export async function GET() {
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
    },
  });
  return apiSuccess(categories);
}
