import type { Metadata } from "next";
import { AppApi } from "@/lib/api-client";
import MenuAddToCart from "@/components/ui/MenuAddToCart";
import HideOnErrorImage from "@/components/ui/HideOnErrorImage";
import { resolveProductImageSrc } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Меню",
  description: "Все позиции меню Yappi Sushi — роллы, суши, сеты.",
};

export default async function MenuPage() {
  const categories = await AppApi.categories.list(true).catch(() => []);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12">
      <h1 className="text-4xl font-black text-white mb-2">Меню</h1>
      <p className="text-brand-text-muted mb-10">Выберите блюда и добавьте их в корзину</p>

      {categories.length === 0 && (
        <div className="card p-12 text-center text-brand-text-muted">
          Меню пока не добавлено. Загляните позже!
        </div>
      )}

      {categories.map((cat: any) => (
        <section key={cat.id} className="mb-14">
          <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-3">
            {cat.name_ru}
            <span className="text-sm font-normal text-brand-text-muted">
              {cat.products.length} позиций
            </span>
          </h2>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {cat.products.map((p: any) => (
              <div
                key={p.id}
                className="rounded-2xl block overflow-hidden h-full flex flex-col"
              >
                {/* Image */}
                <div className="aspect-square relative">
                  <div className="absolute inset-0 flex items-center justify-center text-4xl">🍱</div>
                  <HideOnErrorImage
                    src={resolveProductImageSrc(p.image_url) ?? ""}
                    alt={p.name_ru}
                    className="absolute inset-0 w-full h-full object-contain"
                  />
                  {!p.is_available && (
                    <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                      <span className="text-sm font-semibold text-white bg-brand-red px-3 py-1 rounded-full">
                        Нет в наличии
                      </span>
                    </div>
                  )}
                </div>

                {/* Info */}
                <div className="p-3 flex flex-col flex-1">
                  <p className="text-white font-semibold text-sm leading-tight mb-2 line-clamp-2">
                    {p.image_url && (
                      <span className="text-brand-red mr-1">{`${p.image_url.replace(/^#\s*/, "").trim()}.`}</span>
                    )}
                    {p.name_ru}
                  </p>
                  <div className="mt-auto flex items-end justify-between gap-2">
                    <div>
                      <span className="text-white font-bold">
                        {parseFloat(p.base_price.toString()).toFixed(2)} €
                      </span>
                      {([p.pieces_total, p.variant1_pieces, p.variant2_pieces]
                        .filter((v: any) => typeof v === "number" && v > 0)
                        .length > 0) && (
                        <span className="text-brand-text-muted text-xs ml-2">
                          {[p.pieces_total, p.variant1_pieces, p.variant2_pieces]
                            .filter((v: any) => typeof v === "number" && v > 0)
                            .join("/")} шт
                        </span>
                      )}
                    </div>
                    {p.is_available && (
                      <MenuAddToCart
                        product_id={p.id}
                        name={p.name_ru}
                        image_url={resolveProductImageSrc(p.image_url) ?? undefined}
                        price={parseFloat(p.base_price.toString())}
                        pieces_total={p.pieces_total ?? null}
                        variant1_pieces={p.variant1_pieces ?? null}
                        variant1_price={p.variant1_price ? parseFloat(p.variant1_price.toString()) : null}
                        variant2_pieces={p.variant2_pieces ?? null}
                        variant2_price={p.variant2_price ? parseFloat(p.variant2_price.toString()) : null}
                      />
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
