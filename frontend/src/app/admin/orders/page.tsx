import { AppApi } from "@/lib/api-client";
import AdminSidebar from "@/components/ui/AdminSidebar";
import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Заказы — Админка" };

const STATUS_CLASSES: Record<string, string> = {
  new: "badge-gray",
  confirmed_preparing: "badge-red",
  ready: "badge-green",
  sent: "badge-red",
  completed: "badge-green",
  cancelled: "badge-gray",
};

const STATUS_LABELS: Record<string, string> = {
  new: "Новый",
  confirmed_preparing: "Готовится",
  ready: "Готов",
  sent: "Отправлен",
  completed: "Выполнен",
  cancelled: "Отменён",
};

interface Props {
  searchParams: { status?: string; page?: string };
}

export default async function AdminOrdersPage({ searchParams }: Props) {
  const status = searchParams.status;
  const page = Math.max(1, parseInt(searchParams.page ?? "1"));
  const limit = 25;

  const res = await AppApi.admin.orders
    .list({ status, page, limit })
    .catch(() => ({ orders: [], total: 0, page: 1, limit }));
  const { orders = [], total = 0 } = res as any;

  const totalPages = Math.ceil(total / limit);

  const statusFilters = [
    { value: "", label: "Все" },
    { value: "new", label: "Новые" },
    { value: "confirmed_preparing", label: "Готовятся" },
    { value: "ready", label: "Готовы" },
    { value: "sent", label: "Отправлены" },
    { value: "completed", label: "Выполнены" },
    { value: "cancelled", label: "Отменены" },
  ];

  return (
    <div className="flex min-h-screen">
      <AdminSidebar active="/admin/orders" />
      <main className="flex-1 p-8 overflow-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-black text-white">Заказы</h1>
          <span className="text-brand-text-muted text-sm">{total} заказов</span>
        </div>

        {/* Status filter tabs */}
        <div className="flex gap-2 flex-wrap mb-6">
          {statusFilters.map((f) => (
            <Link
              key={f.value}
              href={f.value ? `/admin/orders?status=${f.value}` : "/admin/orders"}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                (status ?? "") === f.value
                  ? "bg-brand-red text-white"
                  : "bg-brand-gray-mid text-brand-text-muted hover:text-white"
              }`}
            >
              {f.label}
            </Link>
          ))}
        </div>

        {/* Table */}
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/5 text-brand-text-muted text-xs">
                  <th className="px-4 py-3 text-left font-medium">№ заказа</th>
                  <th className="px-4 py-3 text-left font-medium">Клиент</th>
                  <th className="px-4 py-3 text-left font-medium">Тип</th>
                  <th className="px-4 py-3 text-left font-medium">Статус</th>
                  <th className="px-4 py-3 text-left font-medium">Оплата</th>
                  <th className="px-4 py-3 text-right font-medium">Сумма</th>
                  <th className="px-4 py-3 text-right font-medium">Дата</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((order: any) => (
                  <tr
                    key={order.id}
                    className="border-b border-white/5 hover:bg-brand-gray-mid/50 transition-colors"
                  >
                    <td className="px-4 py-3">
                      <Link
                        href={`/admin/orders/${order.id}`}
                        className="text-brand-red hover:underline font-mono font-bold"
                      >
                        {order.order_number}
                      </Link>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-white">{order.customer_name}</p>
                      <p className="text-brand-text-muted text-xs">{order.customer_phone}</p>
                    </td>
                    <td className="px-4 py-3 text-brand-text-muted">
                      {order.type === "delivery" ? "🚚 Доставка" : "🏪 Самовывоз"}
                    </td>
                    <td className="px-4 py-3">
                      <span className={STATUS_CLASSES[order.status] ?? "badge-gray"}>
                        {STATUS_LABELS[order.status] ?? order.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-brand-text-muted text-xs">
                      {order.payment_method.replace(/_/g, " ")}
                    </td>
                    <td className="px-4 py-3 text-right text-white font-bold">
                      {parseFloat(order.total_amount.toString()).toFixed(2)} €
                    </td>
                    <td className="px-4 py-3 text-right text-brand-text-muted text-xs">
                      {new Date(order.created_at).toLocaleDateString("ru-RU")}
                    </td>
                  </tr>
                ))}
                {orders.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-4 py-12 text-center text-brand-text-muted">
                      Заказов нет
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="px-4 py-3 border-t border-white/5 flex items-center justify-between text-sm">
              <span className="text-brand-text-muted">
                Страница {page} из {totalPages}
              </span>
              <div className="flex gap-2">
                {page > 1 && (
                  <Link
                    href={`/admin/orders?page=${page - 1}${status ? `&status=${status}` : ""}`}
                    className="btn-secondary px-3 py-1 text-xs"
                  >
                    ← Назад
                  </Link>
                )}
                {page < totalPages && (
                  <Link
                    href={`/admin/orders?page=${page + 1}${status ? `&status=${status}` : ""}`}
                    className="btn-secondary px-3 py-1 text-xs"
                  >
                    Вперёд →
                  </Link>
                )}
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
