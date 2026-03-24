import { AppApi } from "@/lib/api-client";
import { cookies } from "next/headers";
import AdminSidebar from "@/components/ui/AdminSidebar";
import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Баннеры — Админка" };

export default async function AdminBannersPage() {
  const token = cookies().get("admin_token")?.value;
  const banners = await AppApi.admin.banners.list(token).catch(() => []);

  return (
    <div className="flex min-h-screen">
      <AdminSidebar active="/admin/banners" />
      <main className="flex-1 p-8 overflow-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-black text-white">Баннеры</h1>
          <Link href="/admin/banners/new" className="btn-primary text-sm px-4 py-2">
            + Добавить
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {banners.map((b: any) => (
            <div key={b.id} className="card overflow-hidden">
              <div className="aspect-video bg-brand-gray-mid relative">
                {b.image_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={b.image_url} alt={b.title_ru} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-4xl">🖼️</div>
                )}
                <div className="absolute top-2 right-2 flex gap-1">
                  {b.is_active ? <span className="badge-green">Активен</span> : <span className="badge-gray">Скрыт</span>}
                </div>
              </div>
              <div className="p-4">
                <p className="text-white font-semibold mb-1">{b.title_ru}</p>
                {b.subtitle_ru && <p className="text-brand-text-muted text-xs mb-2">{b.subtitle_ru}</p>}
                <div className="flex items-center justify-between text-xs text-brand-text-muted">
                  <span>Порядок: {b.sort_order}</span>
                  {b.link_url && (
                    <a href={b.link_url} target="_blank" rel="noreferrer" className="text-brand-red hover:underline">
                      Ссылка
                    </a>
                  )}
                </div>
              </div>
            </div>
          ))}
          {banners.length === 0 && (
            <div className="col-span-3 card p-12 text-center text-brand-text-muted">
              Баннеров пока нет
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
