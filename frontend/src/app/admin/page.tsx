import { prisma } from "@/lib/prisma";
import AdminSidebar from "@/components/ui/AdminSidebar";
import Link from "next/link";

export default async function AdminDashboard() {
  const [totalOrders, todayOrders, pendingOrders] = await Promise.all([
    prisma.order.count(),
    prisma.order.count({
      where: { created_at: { gte: new Date(new Date().setHours(0, 0, 0, 0)) } },
    }),
    prisma.order.count({ where: { status: { in: ["new", "confirmed_preparing"] } } }),
  ]);

  const recentOrders = await prisma.order.findMany({
    orderBy: { created_at: "desc" },
    take: 10,
    include: { items: true },
  });

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

  return (
    <div className="flex min-h-screen">
      <AdminSidebar active="/admin" />
      <main className="flex-1 p-8 overflow-auto">
        <h1 className="text-2xl font-black text-white mb-8">Dashboard</h1>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          {[
            { label: "Всего заказов", value: totalOrders, icon: "📦" },
            { label: "Заказов сегодня", value: todayOrders, icon: "📅" },
            { label: "В обработке", value: pendingOrders, icon: "⏳" },
          ].map((s) => (
            <div key={s.label} className="card p-5 flex items-center gap-4">
              <span className="text-3xl">{s.icon}</span>
              <div>
                <p className="text-brand-text-muted text-xs mb-0.5">{s.label}</p>
                <p className="text-3xl font-black text-white">{s.value}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Recent orders */}
        <div className="card overflow-hidden">
          <div className="p-4 border-b border-white/5 flex items-center justify-between">
            <h2 className="font-bold text-white">Последние заказы</h2>
            <Link href="/admin/orders" className="text-brand-red text-sm hover:underline">
              Все заказы →
            </Link>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/5 text-brand-text-muted text-xs">
                  <th className="px-4 py-3 text-left font-medium">№</th>
                  <th className="px-4 py-3 text-left font-medium">Клиент</th>
                  <th className="px-4 py-3 text-left font-medium">Тип</th>
                  <th className="px-4 py-3 text-left font-medium">Статус</th>
                  <th className="px-4 py-3 text-right font-medium">Сумма</th>
                </tr>
              </thead>
              <tbody>
                {recentOrders.map((order) => (
                  <tr
                    key={order.id}
                    className="border-b border-white/5 hover:bg-brand-gray-mid/50 transition-colors"
                  >
                    <td className="px-4 py-3">
                      <Link href={`/admin/orders/${order.id}`} className="text-brand-red hover:underline font-mono">
                        {order.order_number}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-white">{order.customer_name}</td>
                    <td className="px-4 py-3 text-brand-text-muted">
                      {order.type === "delivery" ? "🚚 Доставка" : "🏪 Самовывоз"}
                    </td>
                    <td className="px-4 py-3">
                      <span className={STATUS_CLASSES[order.status] ?? "badge-gray"}>
                        {STATUS_LABELS[order.status] ?? order.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right text-white font-bold">
                      {parseFloat(order.total_amount.toString()).toFixed(2)} €
                    </td>
                  </tr>
                ))}
                {recentOrders.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-brand-text-muted">
                      Заказов пока нет
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
