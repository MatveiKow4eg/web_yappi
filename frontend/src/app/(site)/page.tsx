import { AppApi } from "@/lib/api-client";
import type { Metadata } from "next";
import Link from "next/link";
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
      <section className="relative overflow-hidden">
        {/* gradient bg */}
        <div className="absolute inset-0 bg-brand-black">
          <div className="absolute -top-32 -right-32 w-[700px] h-[700px] bg-brand-red/8 rounded-full blur-[140px]" />
          <div className="absolute -bottom-20 -left-20 w-[500px] h-[500px] bg-brand-red/5 rounded-full blur-[120px]" />
        </div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 pt-16 pb-24 flex flex-col lg:flex-row items-center gap-12">
          {/* Text side */}
          <div className="flex-1 text-center lg:text-left">
            {/* live badge */}
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-red/10 border border-brand-red/20 text-brand-red text-sm font-medium mb-6">
              <span className="w-2 h-2 rounded-full bg-brand-red animate-pulse" />
              Принимаем заказы · 11:00 — 23:00
            </div>

            <h1 className="text-5xl sm:text-6xl xl:text-7xl font-black text-white leading-[1.05] mb-5">
              Лучшие<br />
              <span className="text-brand-red">роллы</span> и суши<br />
              <span className="text-brand-text-muted text-5xl xl:text-6xl">в городе</span>
            </h1>

            <p className="text-brand-text-muted text-lg max-w-md mx-auto lg:mx-0 mb-8 leading-relaxed">
              Свежая рыба, авторские рецепты и доставка за 30–60 минут прямо к вашей двери.
            </p>

            <div className="flex flex-col sm:flex-row gap-3 justify-center lg:justify-start">
              <a
                href="#menu"
                className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-xl bg-brand-red hover:bg-brand-red-dark transition-colors text-white font-bold text-base"
              >
                Заказать сейчас
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </a>
              <Link
                href="/cart"
                className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-xl border border-white/10 bg-brand-gray-mid hover:border-white/25 transition-colors text-white font-semibold text-base"
              >
                🛒 Корзина
              </Link>
            </div>

            {/* stats */}
            <div className="flex items-center gap-8 mt-10 justify-center lg:justify-start">
              {[
                { value: "30 мин", label: "Доставка" },
                { value: "50+", label: "Позиций" },
                { value: "4.9 ★", label: "Рейтинг" },
              ].map((s) => (
                <div key={s.label}>
                  <p className="text-2xl font-black text-white">{s.value}</p>
                  <p className="text-brand-text-muted text-xs">{s.label}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Decorative sushi image side */}
          <div className="flex-1 flex justify-center lg:justify-end">
            <div className="relative w-72 h-72 sm:w-96 sm:h-96">
              {/* big glow ring */}
              <div className="absolute inset-0 rounded-full bg-brand-red/10 blur-2xl" />
              <div className="absolute inset-4 rounded-full bg-brand-red/8 blur-xl" />
              {/* central emoji */}
              <div className="absolute inset-0 flex items-center justify-center text-[10rem] select-none">
                🍣
              </div>
              {/* floating badges */}
              <div className="absolute top-4 right-0 bg-brand-gray-dark border border-white/10 rounded-2xl px-4 py-2 text-sm font-bold text-white shadow-xl">
                🔥 Хит продаж
              </div>
              <div className="absolute bottom-8 left-0 bg-brand-red rounded-2xl px-4 py-2 text-sm font-bold text-white shadow-xl">
                -15% сегодня
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ───────── PERKS BAR ───────── */}
      <section className="border-y border-white/5 bg-brand-gray-dark/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-5 grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { icon: "🚚", label: "Доставка 30–60 мин" },
            { icon: "✅", label: "Только свежие продукты" },
            { icon: "🎁", label: "Промокоды каждую неделю" },
            { icon: "💳", label: "Оплата онлайн или наличными" },
          ].map((p) => (
            <div key={p.label} className="flex items-center gap-2 justify-center md:justify-start">
              <span className="text-2xl">{p.icon}</span>
              <span className="text-sm text-white font-medium">{p.label}</span>
            </div>
          ))}
        </div>
      </section>

      {/* ───────── MENU ───────── */}
      <section id="menu" className="max-w-7xl mx-auto px-4 sm:px-6 py-16">
        <div className="flex items-end justify-between mb-8">
          <div>
            <h2 className="text-3xl sm:text-4xl font-black text-white">Наше меню</h2>
            <p className="text-brand-text-muted mt-1">Выберите блюда и добавьте в корзину</p>
          </div>
          <Link href="/menu" className="text-brand-red text-sm font-semibold hover:underline hidden sm:block">
            Всё меню →
          </Link>
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
                      className="rounded-2xl block overflow-hidden"
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
                      <div className="p-3">
                        <p className="text-white font-semibold text-sm leading-tight mb-2 line-clamp-2">
                          {p.image_url ? `${p.image_url.replace(/^#\s*/, "").trim()}. ` : ""}{p.name_ru}
                        </p>
                        <div className="flex items-center justify-between gap-2">
                          <div className="min-w-0">
                            <span className="text-brand-red font-black">
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
