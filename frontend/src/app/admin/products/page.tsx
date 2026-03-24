import { AppApi } from "@/lib/api-client";
import AdminSidebar from "@/components/ui/AdminSidebar";
import Link from "next/link";
import type { Metadata } from "next";
import HideOnErrorImage from "@/components/ui/HideOnErrorImage";
import { resolveProductImageSrc } from "@/lib/utils";

export const metadata: Metadata = { title: "Товары — Админка" };

export default async function AdminProductsPage() {
  const res: any = await AppApi.admin.products.list().catch(() => ({ products: [] }));
  const products: any[] = res.products || res || []; // Handle both array and object responses where possible

  return (
    <div className="flex min-h-screen">
      <AdminSidebar active="/admin/products" />
      <main className="flex-1 p-8 overflow-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-black text-white">Товары</h1>
          <Link href="/admin/products/new" className="btn-primary text-sm px-4 py-2">
            + Добавить товар
          </Link>
        </div>

        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/5 text-brand-text-muted text-xs">
                  <th className="px-4 py-3 text-left font-medium w-16">Фото</th>
                  <th className="px-4 py-3 text-left font-medium">Название</th>
                  <th className="px-4 py-3 text-left font-medium">Категория</th>
                  <th className="px-4 py-3 text-right font-medium">Цена</th>
                  <th className="px-4 py-3 text-center font-medium">Статус</th>
                  <th className="px-4 py-3 text-center font-medium">Наличие</th>
                  <th className="px-4 py-3 text-right font-medium">Действия</th>
                </tr>
              </thead>
              <tbody>
                {products.map((p: any) => (
                  <tr
                    key={p.id}
                    className="border-b border-white/5 hover:bg-brand-gray-mid/50 transition-colors"
                  >
                    <td className="px-4 py-3">
                      <div className="w-10 h-10 rounded-lg bg-brand-gray-mid overflow-hidden flex items-center justify-center text-lg relative">
                        <span className="absolute inset-0 flex items-center justify-center">🍱</span>
                        <HideOnErrorImage
                          src={resolveProductImageSrc(p.image_url) ?? ""}
                          alt={p.name_ru}
                          className="absolute inset-0 w-full h-full object-cover"
                        />
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-white font-medium">{p.name_ru}</p>
                      <p className="text-brand-text-muted text-xs font-mono">{p.slug}</p>
                    </td>
                    <td className="px-4 py-3 text-brand-text-muted">{p.category.name_ru}</td>
                    <td className="px-4 py-3 text-right">
                      <span className="text-white font-bold">
                        {parseFloat(p.base_price.toString()).toFixed(2)} €
                      </span>
                      {p.old_price && (
                        <span className="text-brand-text-muted line-through text-xs ml-1">
                          {parseFloat(p.old_price.toString()).toFixed(2)} €
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {p.is_active && !p.is_hidden ? (
                        <span className="badge-green">Активен</span>
                      ) : p.is_hidden ? (
                        <span className="badge-gray">Скрыт</span>
                      ) : (
                        <span className="badge-gray">Неактивен</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {p.is_available ? (
                        <span className="badge-green">В наличии</span>
                      ) : (
                        <span className="badge-red">Стоп-лист</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link
                        href={`/admin/products/${p.id}/edit`}
                        className="text-brand-text-muted hover:text-white text-xs transition-colors"
                      >
                        Редактировать
                      </Link>
                    </td>
                  </tr>
                ))}
                {products.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-4 py-12 text-center text-brand-text-muted">
                      Товаров нет. Добавьте первый товар.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
}
