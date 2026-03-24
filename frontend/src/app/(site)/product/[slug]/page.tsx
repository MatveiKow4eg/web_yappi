import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { AppApi } from "@/lib/api-client";
import AddToCartButton from "@/components/ui/AddToCartButton";
import HideOnErrorImage from "@/components/ui/HideOnErrorImage";
import { resolveProductImageSrc } from "@/lib/utils";

const FALLBACK_SUSHI_IMAGES: Record<string, string> = {
  california: "/images/sushi/california.jpg",
  philadelphia: "/images/sushi/philadelphia.jpg",
  dragon: "/images/sushi/dragon.jpg",
  set: "/images/sushi/set.jpg",
  sushi: "/images/sushi/sushi.jpg",
};

interface Props {
  params: { slug: string };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const product = await AppApi.products.getBySlug(params.slug).catch(() => null);
  if (!product) return { title: "Не найдено" };
  return {
    title: product.name_ru,
    description: product.description_ru ?? undefined,
  };
}

export default async function ProductPage({ params }: Props) {
  const product = await AppApi.products.getBySlug(params.slug).catch(() => null);

  if (!product || !product.is_active) notFound();

  const price = parseFloat(product.base_price.toString());

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-12">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
        {/* Image */}
        <div className="aspect-square rounded-2xl relative">
          <div className="absolute inset-0 flex items-center justify-center text-8xl">🍱</div>
          <HideOnErrorImage
            src={
              resolveProductImageSrc(product.image_url) ??
              FALLBACK_SUSHI_IMAGES[product.slug] ??
              ""
            }
            alt={product.name_ru}
            className="absolute inset-0 w-full h-full object-contain"
          />
        </div>

        {/* Details */}
        <div className="flex flex-col">
          <p className="text-brand-text-muted text-sm mb-2">{product.category?.name_ru ?? "Категория"}</p>
          <h1 className="text-3xl font-black text-white mb-3">
            {product.image_url ? `${product.image_url.replace(/^#\s*/, "").trim()}. ` : ""}{product.name_ru}
          </h1>

          {product.description_ru && (
            <p className="text-brand-text-muted leading-relaxed mb-6">{product.description_ru}</p>
          )}

          {/* Price */}
          <div className="flex items-center gap-3 mb-6">
            <span className="text-3xl font-black text-brand-red">{price.toFixed(2)} €</span>
            {product.old_price && (
              <span className="text-brand-text-muted line-through text-lg">
                {parseFloat(product.old_price.toString()).toFixed(2)} €
              </span>
            )}
          </div>

          {/* Variants - display only (full interactivity can be added later) */}
          {(product.variants?.length ?? 0) > 0 && (
            <div className="mb-6">
              <p className="text-sm font-semibold text-white mb-2">Вариант</p>
              <div className="flex flex-wrap gap-2">
                {product.variants?.map((v: any) => (
                  <span
                    key={v.id}
                    className="px-4 py-2 rounded-xl bg-brand-gray-mid border border-white/10 text-sm text-white cursor-pointer hover:border-brand-red transition-colors"
                  >
                    {v.name_ru} — {parseFloat(v.price.toString()).toFixed(2)} €
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Option groups */}
          {(product as any).option_links?.map(({ option_group: g }: any) => (
            <div key={g.id} className="mb-4">
              <p className="text-sm font-semibold text-white mb-2">{g.name_ru}</p>
              <div className="flex flex-wrap gap-2">
                {g.items.map((item: any) => (
                  <span
                    key={item.id}
                    className="px-3 py-2 rounded-xl bg-brand-gray-mid border border-white/10 text-sm text-brand-text-muted cursor-pointer hover:border-brand-red hover:text-white transition-colors"
                  >
                    {item.name_ru}
                    {parseFloat(item.price_delta.toString()) > 0 && (
                      <span className="ml-1 text-brand-red">
                        +{parseFloat(item.price_delta.toString()).toFixed(2)} €
                      </span>
                    )}
                  </span>
                ))}
              </div>
            </div>
          ))}

          {/* Add to cart */}
          <div className="mt-auto pt-6">
            {product.is_available ? (
              <AddToCartButton
                product_id={product.id}
                name={product.name_ru}
                image_url={resolveProductImageSrc(product.image_url) ?? undefined}
                unit_price={price}
              />
            ) : (
              <div className="w-full py-4 text-center rounded-xl bg-brand-gray-mid text-brand-text-muted font-semibold">
                Нет в наличии
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
