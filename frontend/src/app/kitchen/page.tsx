import { AppApi } from "@/lib/api-client";
import type { Metadata } from "next";
import KitchenOrderActions from "./KitchenOrderActions";

export const metadata: Metadata = { title: "Кухня — Yappi Sushi" };

// Kitchen view auto-refreshes every 30s
export const revalidate = 30;

const STATUS_LABELS: Record<string, string> = {
  new: "Новый",
  confirmed_preparing: "Готовится",
  ready: "Готов",
  sent: "Отправлен",
  completed: "Выполнен",
  cancelled: "Отменён",
};

const STATUS_BG: Record<string, string> = {
  new: "border-yellow-500/30 bg-yellow-500/5",
  confirmed_preparing: "border-brand-red/30 bg-brand-red/5",
  ready: "border-green-500/30 bg-green-500/5",
};

export default async function KitchenPage() {
  const orders = await AppApi.admin.orders
    .list({ statuses: "new,confirmed_preparing,ready", limit: 0 })
    .then((res) => res.orders)
    .catch(() => []);

  return (
    <div className="min-h-screen bg-brand-black p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <span className="text-brand-red font-black text-2xl">YS</span>
          <h1 className="text-xl font-black text-white">Кухня</h1>
        </div>
        <div className="flex items-center gap-2 text-brand-text-muted text-sm">
          <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse inline-block" />
          {orders.length} активных заказов
        </div>
      </div>

      {orders.length === 0 && (
        <div className="card p-16 text-center">
          <div className="text-5xl mb-4">✅</div>
          <p className="text-white font-bold text-xl mb-1">Всё готово</p>
          <p className="text-brand-text-muted">Новых заказов нет</p>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
        {orders.map((order: any) => (
          <div
            key={order.id}
            className={`rounded-2xl border p-4 ${STATUS_BG[order.status] ?? "border-white/10 bg-brand-gray-dark"}`}
          >
            {/* Card header */}
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="text-white font-black font-mono text-lg">{order.order_number}</p>
                <p className="text-brand-text-muted text-xs">
                  {order.type === "delivery" ? "🚚 Доставка" : "🏪 Самовывоз"} ·{" "}
                  {new Date(order.created_at).toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" })}
                </p>
              </div>
              <span className={`text-xs font-bold px-2 py-1 rounded-lg ${
                order.status === "new" ? "bg-yellow-500/20 text-yellow-400" :
                order.status === "confirmed_preparing" ? "bg-brand-red/20 text-brand-red" :
                "bg-green-500/20 text-green-400"
              }`}>
                {STATUS_LABELS[order.status]}
              </span>
            </div>

            {/* Items */}
            <div className="space-y-2 mb-4">
              {order.items.map((item: any) => (
                <div key={item.id} className="flex justify-between text-sm border-b border-white/5 pb-1.5">
                  <div>
                    <p className="text-white font-semibold">
                      ×{item.quantity} {item.product_name_snapshot}
                    </p>
                    {item.variant_name_snapshot && (
                      <p className="text-brand-text-muted text-xs">{item.variant_name_snapshot}</p>
                    )}
                    {item.selections.map((s: any) => (
                      <p key={s.id} className="text-brand-text-muted text-xs">
                        {s.option_group_name_snapshot}: {s.option_item_name_snapshot}
                      </p>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {order.comment && (
              <div className="mb-3 px-3 py-2 rounded-lg bg-white/5 text-brand-text-muted text-xs">
                💬 {order.comment}
              </div>
            )}

            {/* Action buttons */}
            <KitchenOrderActions
              orderId={order.id}
              currentStatus={order.status}
              orderType={order.type}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
