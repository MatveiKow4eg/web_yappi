import { AppApi } from "@/lib/api-client";
import { cookies } from "next/headers";
import AdminSidebar from "@/components/ui/AdminSidebar";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Категории — Админка" };

export default async function AdminCategoriesPage() {
  const token = cookies().get("admin_token")?.value;
  const categories = await AppApi.admin.categories.list(token).catch(() => []);

  return (
    <div className="flex min-h-screen">
      <AdminSidebar active="/admin/categories" />
      <main className="flex-1 p-8 overflow-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-black text-white">Категории</h1>
        </div>

        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/5 text-brand-text-muted text-xs">
                  <th className="px-4 py-3 text-left font-medium">Название (RU)</th>
                  <th className="px-4 py-3 text-left font-medium">EN</th>
                  <th className="px-4 py-3 text-left font-medium">ET</th>
                  <th className="px-4 py-3 text-left font-medium">Slug</th>
                  <th className="px-4 py-3 text-center font-medium">Порядок</th>
                  <th className="px-4 py-3 text-center font-medium">Товаров</th>
                  <th className="px-4 py-3 text-center font-medium">Статус</th>
                </tr>
              </thead>
              <tbody>
                {categories.map((cat: any) => (
                  <tr
                    key={cat.id}
                    className="border-b border-white/5 hover:bg-brand-gray-mid/50 transition-colors"
                  >
                    <td className="px-4 py-3 text-white font-medium">{cat.name_ru}</td>
                    <td className="px-4 py-3 text-brand-text-muted">{cat.name_en}</td>
                    <td className="px-4 py-3 text-brand-text-muted">{cat.name_et}</td>
                    <td className="px-4 py-3 text-brand-text-muted font-mono text-xs">{cat.slug}</td>
                    <td className="px-4 py-3 text-center text-brand-text-muted">{cat.sort_order}</td>
                    <td className="px-4 py-3 text-center text-white font-bold">{cat._count.products}</td>
                    <td className="px-4 py-3 text-center">
                      {cat.is_active ? (
                        <span className="badge-green">Активна</span>
                      ) : (
                        <span className="badge-gray">Скрыта</span>
                      )}
                    </td>
                  </tr>
                ))}
                {categories.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-4 py-12 text-center text-brand-text-muted">
                      Категорий нет. Добавьте через seed или API.
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
