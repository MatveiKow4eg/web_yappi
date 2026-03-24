import { AppApi } from "@/lib/api-client";
import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Акции — Yappi Sushi",
  description: "Актуальные акции и предложения Yappi Sushi",
};

export default async function PromotionsPage() {
  const banners = await AppApi.banners.list().catch(() => []);

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-16">
      <h1 className="text-4xl font-black text-white mb-2">Акции</h1>
      <p className="text-brand-text-muted mb-12">Актуальные предложения для наших гостей</p>

      {banners.length === 0 ? (
        <div className="card p-16 text-center">
          <div className="text-5xl mb-4">🎁</div>
          <h2 className="text-xl font-bold text-white mb-2">Акций пока нет</h2>
          <p className="text-brand-text-muted mb-6">Следите за обновлениями!</p>
          <Link href="/menu" className="btn-primary inline-flex">Перейти в меню</Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {banners.map((b: any) => (
            <div key={b.id} className="card overflow-hidden group">
              <div className="aspect-video bg-brand-gray-mid relative overflow-hidden">
                {b.image_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={b.image_url}
                    alt={b.title_ru}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-5xl">🍣</div>
                )}
              </div>
              <div className="p-5">
                <h2 className="text-white font-bold text-lg mb-1">{b.title_ru}</h2>
                {b.subtitle_ru && <p className="text-brand-text-muted text-sm mb-3">{b.subtitle_ru}</p>}
                {b.link_url && (
                  <a
                    href={b.link_url}
                    className="inline-flex items-center gap-1 text-brand-red text-sm font-semibold hover:underline"
                  >
                    Подробнее →
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
