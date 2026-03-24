import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";
import MenuAddToCart from "@/components/ui/MenuAddToCart";

interface Props {
  params: { slug: string };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const cat = await prisma.category.findUnique({ where: { slug: params.slug } });
  if (!cat) return { title: "Не найдено" };
  return { title: `${cat.name_ru} — Yappi Sushi` };
}

export default async function CategoryMenuPage({ params }: Props) {
  const category = await prisma.category.findUnique({
    where: { slug: params.slug, is_active: true },
    include: {
      products: {
        where: { is_active: true, is_hidden: false },
        orderBy: { sort_order: "asc" },
      },
    },
  });

  if (!category) notFound();

  // all categories for sidebar nav
  const allCategories = await prisma.category.findMany({
    where: { is_active: true },
    orderBy: { sort_order: "asc" },
    select: { slug: true, name_ru: true },
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12">
      {/* Category nav */}
      <div className="flex gap-2 flex-wrap mb-8">
        <Link
          href="/menu"
          className="px-3 py-1.5 rounded-lg text-xs font-medium bg-brand-gray-mid text-brand-text-muted hover:text-white transition-colors"
        >
          Все
        </Link>
        {allCategories.map((c) => (
          <Link
            key={c.slug}
            href={`/menu/${c.slug}`}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              c.slug === params.slug
                ? "bg-brand-red text-white"
                : "bg-brand-gray-mid text-brand-text-muted hover:text-white"
            }`}
          >
            {c.name_ru}
          </Link>
        ))}
      </div>

      <h1 className="text-3xl font-black text-white mb-2">{category.name_ru}</h1>
      <p className="text-brand-text-muted mb-8">{category.products.length} позиций</p>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
        {category.products.map((p) => (
          <a
            key={p.id}
            href={`/product/${p.slug}`}
            className="card-hover group cursor-pointer block overflow-hidden"
          >
            <div className="aspect-square bg-brand-gray-mid relative overflow-hidden">
              {p.image_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={p.image_url}
                  alt={p.name_ru}
                  className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center text-4xl">🍱</div>
              )}
              {!p.is_available && (
                <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                  <span className="text-sm font-semibold text-white bg-brand-red px-3 py-1 rounded-full">
                    Нет в наличии
                  </span>
                </div>
              )}
            </div>
            <div className="p-3">
              <p className="text-white font-semibold text-sm leading-tight mb-2 line-clamp-2">{p.name_ru}</p>
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-brand-red font-bold">
                    {parseFloat(p.base_price.toString()).toFixed(2)} €
                  </span>
                  {p.old_price && (
                    <span className="text-brand-text-muted line-through text-xs ml-2">
                      {parseFloat(p.old_price.toString()).toFixed(2)} €
                    </span>
                  )}
                </div>
                {p.is_available && (
                  <MenuAddToCart
                    product_id={p.id}
                    name={p.name_ru}
                    image_url={p.image_url ?? undefined}
                    price={parseFloat(p.base_price.toString())}
                  />
                )}
              </div>
            </div>
          </a>
        ))}
        {category.products.length === 0 && (
          <div className="col-span-4 card p-12 text-center text-brand-text-muted">
            В этой категории пока нет товаров
          </div>
        )}
      </div>
    </div>
  );
}
