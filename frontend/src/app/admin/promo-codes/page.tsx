import { AppApi } from "@/lib/api-client";
import AdminSidebar from "@/components/ui/AdminSidebar";
import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Промокоды — Админка" };

export default async function AdminPromoCodesPage() {
  const codes = await AppApi.admin.promoCodes.list().catch(() => []);

  return (
    <div className="flex min-h-screen">
      <AdminSidebar active="/admin/promo-codes" />
      <main className="flex-1 p-8 overflow-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-black text-white">Промокоды</h1>
          <Link href="/admin/promo-codes/new" className="btn-primary text-sm px-4 py-2">
            + Добавить
          </Link>
        </div>

        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/5 text-brand-text-muted text-xs">
                  <th className="px-4 py-3 text-left font-medium">Код</th>
                  <th className="px-4 py-3 text-left font-medium">Описание</th>
                  <th className="px-4 py-3 text-left font-medium">Тип</th>
                  <th className="px-4 py-3 text-right font-medium">Скидка</th>
                  <th className="px-4 py-3 text-right font-medium">Мин. сумма</th>
                  <th className="px-4 py-3 text-right font-medium">Исп.</th>
                  <th className="px-4 py-3 text-center font-medium">Активен</th>
                  <th className="px-4 py-3 text-left font-medium">Действует до</th>
                </tr>
              </thead>
              <tbody>
                {codes.map((c: any) => (
                  <tr key={c.id} className="border-b border-white/5 hover:bg-brand-gray-mid/50 transition-colors">
                    <td className="px-4 py-3">
                      <span className="text-white font-mono font-bold tracking-wide">{c.code}</span>
                    </td>
                    <td className="px-4 py-3 text-brand-text-muted">{c.description ?? "—"}</td>
                    <td className="px-4 py-3 text-brand-text-muted">
                      {c.discount_type === "percent" ? "%" : "фикс."}
                    </td>
                    <td className="px-4 py-3 text-right text-brand-red font-bold">
                      {c.discount_type === "percent"
                        ? `${parseFloat(c.discount_value.toString())}%`
                        : `${parseFloat(c.discount_value.toString()).toFixed(2)} €`}
                    </td>
                    <td className="px-4 py-3 text-right text-brand-text-muted">
                      {c.min_order_amount ? `${parseFloat(c.min_order_amount.toString()).toFixed(2)} €` : "—"}
                    </td>
                    <td className="px-4 py-3 text-right text-white font-bold">{c._count.usages}</td>
                    <td className="px-4 py-3 text-center">
                      {c.is_active ? <span className="badge-green">Да</span> : <span className="badge-gray">Нет</span>}
                    </td>
                    <td className="px-4 py-3 text-brand-text-muted text-xs">
                      {c.valid_to ? new Date(c.valid_to).toLocaleDateString("ru-RU") : "∞"}
                    </td>
                  </tr>
                ))}
                {codes.length === 0 && (
                  <tr>
                    <td colSpan={8} className="px-4 py-12 text-center text-brand-text-muted">
                      Промокодов нет
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
