import { AppApi } from "@/lib/api-client";
import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import MenuAddToCart from "@/components/ui/MenuAddToCart";
import HideOnErrorImage from "@/components/ui/HideOnErrorImage";
import { resolveProductImageSrc } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Yappi Sushi — Доставка роллов и суши",
  description: "Свежие роллы, суши и сеты с доставкой и самовывозом.",
};

export default async function HomePage() {
  const categories = await AppApi.categories.list(true).catch((e) => {
    if (process.env.NODE_ENV === "development") {
      console.error("Failed to fetch categories from API", e);
    }
    return [];
  });

  return (
    <>
      {/* ───────── HERO ───────── */}
      <section className="relative overflow-hidden pt-6 sm:pt-8 pb-10 sm:pb-12">
        <div className="pointer-events-none absolute -inset-x-8 -inset-y-10 bg-[radial-gradient(circle_at_16%_20%,rgba(215,38,56,0.2),transparent_40%),linear-gradient(90deg,rgba(13,13,13,0),rgba(17,17,17,0.6)_20%,rgba(17,17,17,0.6)_80%,rgba(13,13,13,0))]" />

        <div className="pointer-events-none absolute inset-0">
          <div className="absolute inset-y-0 left-0 w-20 sm:w-28 bg-gradient-to-r from-brand-black to-transparent" />
          <div className="absolute inset-y-0 right-0 w-20 sm:w-28 bg-gradient-to-l from-brand-black to-transparent" />
          <div className="absolute inset-x-0 top-0 h-16 sm:h-24 bg-gradient-to-b from-brand-black to-transparent" />
          <div className="absolute inset-x-0 bottom-0 h-16 sm:h-24 bg-gradient-to-t from-brand-black to-transparent" />
        </div>

        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6">
          <div className="grid lg:grid-cols-2 gap-8 lg:gap-10 items-center py-2 sm:py-4">
            <div>
              <div className="max-w-xl">
                <h1 className="inline-block text-4xl sm:text-5xl xl:text-6xl font-black text-white leading-[1.02]">
                  Yappi Sushi
                </h1>

                <div className="mt-5 w-fit max-w-full min-w-[340px] sm:min-w-[390px] rounded-2xl border border-white/10 bg-[#111111] px-5 py-5 shadow-[0_10px_30px_rgba(0,0,0,0.35)]">
                  <div className="flex items-center justify-between gap-3 mb-3">
                    <p className="text-sm font-semibold text-white">Время ожидания</p>
                  </div>

                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between gap-3 text-sm">
                      <span className="text-brand-text-muted">
                        Доставка
                      </span>
                      <span className="text-white font-bold">35-45 мин</span>
                    </div>

                    <div className="flex items-center justify-between gap-3 text-sm">
                      <span className="text-brand-text-muted">
                        Самовывоз
                      </span>
                      <span className="text-white font-bold">15-20 мин</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-6 flex flex-wrap items-center gap-3">
                <a
                  href="#menu"
                  className="inline-flex items-center justify-center px-6 py-3 rounded-xl bg-brand-red hover:bg-brand-red-dark transition-colors text-white font-semibold"
                >
                  Меню
                </a>
                <a
                  href="#"
                  className="inline-flex items-center justify-center px-6 py-3 rounded-xl border border-white/15 bg-white/[0.02] hover:border-white/30 transition-colors text-white font-semibold"
                >
                  Приложение
                </a>
              </div>
            </div>

            <div className="relative lg:pl-4">
              <div className="relative rounded-[28px] overflow-hidden min-h-[280px] sm:min-h-[360px] lg:min-h-[440px]">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_58%,rgba(215,38,56,0.2),rgba(255,255,255,0.02)_45%,transparent_72%)]" />
                <Image
                  src="/images/sushi/115.png"
                  alt="Сет суши"
                  fill
                  className="object-contain drop-shadow-[0_30px_55px_rgba(0,0,0,0.55)]"
                  style={{
                    WebkitMaskImage: "linear-gradient(to bottom, black 0%, black 92%, transparent 100%)",
                    maskImage: "linear-gradient(to bottom, black 0%, black 92%, transparent 100%)",
                  }}
                  priority
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/10 via-transparent to-transparent" />

              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ───────── MENU ───────── */}
      <section id="menu" className="max-w-7xl mx-auto px-4 sm:px-6 pt-10 pb-16">
        <div className="mb-8 text-center">
          <h2 className="text-3xl sm:text-4xl font-black text-white">Меню</h2>
        </div>

        {categories.length === 0 ? (
          // Placeholder when DB is empty
          <div>
            {/* Category tabs placeholder */}
            <div className="flex gap-2 flex-wrap mb-8">
              {["Роллы", "Суши", "Сеты", "Напитки"].map((cat, i) => (
                <div
                  key={cat}
                  className={`px-4 py-2 rounded-xl text-sm font-semibold ${
                    i === 0
                      ? "bg-brand-red text-white"
                      : "bg-brand-gray-mid text-brand-text-muted"
                  }`}
                >
                  {cat}
                </div>
              ))}
            </div>

            {/* Product cards placeholder */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              {[
                { name: "Калифорния", desc: "Краб, авокадо, огурец, тобико", price: "8.90", emoji: "🦀" },
                { name: "Филадельфия", desc: "Лосось, сливочный сыр, огурец", price: "9.50", emoji: "🐟" },
                { name: "Дракон", desc: "Угорь, авокадо, соус унаги", price: "11.00", emoji: "🥑" },
                { name: "Острый тунец", desc: "Тунец, острый майонез, авокадо", price: "9.20", emoji: "🌶️" },
                { name: "Радуга", desc: "Ассорти рыбы, авокадо, огурец", price: "12.50", emoji: "🌈" },
                { name: "Лосось запечённый", desc: "Лосось, сыр, соус спайси", price: "10.50", emoji: "🍋" },
                { name: "Сет Калифорния 16", desc: "16 штук ролла Калифорния", price: "16.90", emoji: "📦" },
                { name: "Микс сет 32", desc: "Калифорния + Филадельфия + Дракон", price: "32.90", emoji: "🎁" },
              ].map((p) => (
                <div key={p.name} className="bg-brand-gray-dark rounded-2xl border border-white/5 overflow-hidden hover:border-brand-red/30 transition-all group">
                  {/* image placeholder */}
                  <div className="aspect-square bg-brand-gray-mid flex items-center justify-center text-5xl relative overflow-hidden">
                    <span className="group-hover:scale-110 transition-transform duration-300 inline-block">
                      {p.emoji}
                    </span>
                  </div>
                  <div className="p-3">
                    <p className="text-white font-semibold text-sm mb-0.5 line-clamp-1">{p.name}</p>
                    <p className="text-brand-text-muted text-xs mb-2 line-clamp-2">{p.desc}</p>
                    <div className="flex items-center justify-between">
                      <span className="text-brand-red font-black">{p.price} €</span>
                      <button className="w-8 h-8 rounded-xl bg-brand-red hover:bg-brand-red-dark flex items-center justify-center text-white transition-all active:scale-90">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-8 text-center">
              <p className="text-brand-text-muted text-sm mb-3">Это демо-данные. Добавьте товары через админку.</p>
              <Link href="/menu" className="btn-primary inline-flex">Перейти в меню →</Link>
            </div>
          </div>
        ) : (
          // Real data from DB
          <div className="space-y-12">
            {categories.filter((c: any) => c.products?.length > 0).map((cat: any) => (
              <div key={cat.id}>
                <div className="mb-5">
                  <h3 className="text-xl font-bold text-white">{cat.name_ru}</h3>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                  {cat.products.map((p: any) => (
                    <div
                      key={p.id}
                      className="rounded-2xl block overflow-hidden h-full flex flex-col"
                    >
                      <div className="aspect-square relative">
                        <div className="absolute inset-0 flex items-center justify-center text-4xl">🍱</div>
                        <HideOnErrorImage
                          src={resolveProductImageSrc(p.image_url) ?? ""}
                          alt={p.name_ru}
                          className="absolute inset-0 w-full h-full object-contain"
                        />
                        {!p.is_available && (
                          <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                            <span className="text-sm font-semibold text-white bg-brand-red px-3 py-1 rounded-full">Нет в наличии</span>
                          </div>
                        )}
                      </div>
                      <div className="p-3 flex flex-col flex-1">
                        <p className="text-white font-semibold text-sm leading-tight mb-2 line-clamp-2">
                          {p.image_url && (
                            <span className="text-brand-red mr-1">{`${p.image_url.replace(/^#\s*/, "").trim()}.`}</span>
                          )}
                          {p.name_ru}
                        </p>
                        <div className="mt-auto flex items-end justify-between gap-2">
                          <div className="min-w-0">
                            <span className="text-white font-black">
                              {parseFloat(p.base_price.toString()).toFixed(2)} €
                            </span>
                            {([p.pieces_total, p.variant1_pieces, p.variant2_pieces]
                              .filter((v: any) => typeof v === "number" && v > 0)
                              .length > 0) && (
                              <span className="text-brand-text-muted text-xs ml-2 align-middle">
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
              </div>
            ))}
          </div>
        )}

        <div className="mt-10 text-center">
          <Link href="/menu" className="inline-flex items-center gap-2 px-8 py-4 rounded-xl border border-white/10 hover:border-brand-red/40 transition-colors text-white font-semibold">
            Смотреть полное меню
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
            </svg>
          </Link>
        </div>
      </section>

      {/* ───────── PROMO BANNER ───────── */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 pb-20">
        <div className="rounded-3xl overflow-hidden relative bg-gradient-to-br from-[#1a0505] to-brand-gray-dark border border-brand-red/20">
          {/* texture */}
          <div
            className="absolute inset-0 opacity-5"
            style={{
              backgroundImage: "radial-gradient(circle, #fff 1px, transparent 1px)",
              backgroundSize: "32px 32px",
            }}
          />
          {/* red glow */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-brand-red/20 rounded-full blur-3xl" />

          <div className="relative p-10 sm:p-16 text-center">
            <div className="text-5xl mb-4">🎁</div>
            <h2 className="text-3xl sm:text-4xl font-black text-white mb-3">
              Промокод на первый заказ
            </h2>
            <p className="text-brand-text-muted text-lg mb-6">
              Введи код при оформлении и получи скидку 10%
            </p>
            <div className="inline-flex items-center gap-3 bg-brand-black border border-brand-red/30 rounded-2xl px-6 py-3 mb-8 select-all">
              <span className="font-mono font-black text-2xl text-brand-red tracking-widest">WELCOME10</span>
            </div>
            <br />
            <Link
              href="/menu"
              className="inline-flex items-center gap-2 px-8 py-4 rounded-xl bg-brand-red hover:bg-brand-red-dark transition-colors text-white font-bold text-base"
            >
              Заказать со скидкой
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
