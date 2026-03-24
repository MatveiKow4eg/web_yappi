import { prisma } from "@/lib/prisma";
import { apiSuccess, apiError } from "@/lib/api-response";

export async function GET(
  _req: Request,
  { params }: { params: { slug: string } }
) {
  const product = await prisma.product.findUnique({
    where: { slug: params.slug },
    include: {
      category: true,
      variants: { where: { is_active: true }, orderBy: { sort_order: "asc" } },
      option_links: {
        include: {
          option_group: {
            include: {
              items: { where: { is_active: true }, orderBy: { sort_order: "asc" } },
            },
          },
        },
      },
    },
  });

  if (!product || !product.is_active) return apiError("Not found", 404);
  return apiSuccess(product);
}
