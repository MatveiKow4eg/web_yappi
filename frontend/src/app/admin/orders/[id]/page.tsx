import { AdminApi } from "@/lib/api-server";
import AdminSidebar from "@/components/ui/AdminSidebar";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import OrderStatusForm from "./OrderStatusForm";
import DeleteOrderButton from "./DeleteOrderButton";

export const metadata: Metadata = { title: "Заказ — Админка" };

interface Props {
  params: { id: string };
}

const STATUS_LABELS: Record<string, string> = {
  new: "Новый",
  confirmed_preparing: "Готовится",
  ready: "Готов",
  sent: "Отправлен",
  completed: "Выполнен",
  cancelled: "Отменён",
};

const PAYMENT_LABELS: Record<string, string> = {
  stripe: "Интернет-платеж",
  cash_on_pickup: "Наличными при самовывозе",
  card_on_pickup: "Картой при самовывозе",
  cash_on_delivery: "Наличными курьеру",
  card_on_delivery: "Картой курьеру",
};

export default async function AdminOrderDetailPage({ params }: Props) {
  const order = await AdminApi.orders.get(params.id).catch(() => null);

  if (!order) notFound();

  return (
    <div className="flex min-h-screen">
      <AdminSidebar active="/admin/orders" />
      <main className="flex-1 p-8 overflow-auto">
        <div className="flex items-center gap-3 mb-6">
          <a href="/admin/orders" className="text-brand-text-muted hover:text-white transition-colors text-sm">
            ← Заказы
          </a>
          <span className="text-brand-text-muted">/</span>
          <h1 className="text-2xl font-black text-white">{order.order_number}</h1>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left: order info + items */}
          <div className="lg:col-span-2 space-y-4">
            {/* Info */}
            <div className="card p-6">
              <h2 className="font-bold text-white mb-4">Информация о заказе</h2>
              <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
                {[
                  { label: "Тип", value: order.type === "delivery" ? "🚚 Доставка" : "🏪 Самовывоз" },
                  { label: "Оплата", value: PAYMENT_LABELS[order.payment_method] ?? order.payment_method },
                  { label: "Статус оплаты", value: order.payment_status },
                  { label: "Клиент", value: order.customer_name },
                  { label: "Телефон", value: order.customer_phone },
                  { label: "Язык", value: (order.language_code ?? "ru").toUpperCase() },
                  ...(order.address_line ? [
                    { label: "Адрес", value: order.address_line },
                    { label: "Квартира", value: order.apartment ?? "—" },
                    { label: "Подъезд", value: order.entrance ?? "—" },
                    { label: "Этаж", value: order.floor ?? "—" },
                    { label: "Домофон", value: order.door_code ?? "—" },
                  ] : []),
                  ...(order.promo_code ? [{ label: "Промокод", value: order.promo_code.code }] : []),
                  ...(order.comment ? [{ label: "Комментарий", value: order.comment }] : []),
                ].map(({ label, value }) => (
                  <div key={label}>
                    <dt className="text-brand-text-muted">{label}</dt>
                    <dd className="text-white font-medium">{value}</dd>
                  </div>
                ))}
              </dl>
            </div>

            {/* Items */}
            <div className="card p-6">
              <h2 className="font-bold text-white mb-4">Состав заказа</h2>
              <div className="space-y-4">
                {order.items.map((item: any) => (
                  <div key={item.id} className="flex justify-between text-sm border-b border-white/5 pb-3 last:border-0 last:pb-0">
                    <div>
                      <p className="text-white font-medium">{item.product_name_snapshot}</p>
                      {item.variant_name_snapshot && (
                        <p className="text-brand-text-muted text-xs">{item.variant_name_snapshot}</p>
                      )}
                      {item.selections.map((s: any) => (
                        <p key={s.id} className="text-brand-text-muted text-xs">
                          {s.option_group_name_snapshot}: {s.option_item_name_snapshot}
                          {parseFloat(s.price_delta.toString()) > 0 && (
                            <span className="text-brand-red ml-1">
                              +{parseFloat(s.price_delta.toString()).toFixed(2)} €
                            </span>
                          )}
                        </p>
                      ))}
                    </div>
                    <div className="text-right pl-4 flex-shrink-0">
                      <p className="text-brand-text-muted">×{item.quantity}</p>
                      <p className="text-white font-bold">
                        {parseFloat(item.line_total.toString()).toFixed(2)} €
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-4 pt-4 border-t border-white/5 space-y-1.5 text-sm">
                <div className="flex justify-between text-brand-text-muted">
                  <span>Подытог</span>
                  <span>{parseFloat(order.subtotal_amount.toString()).toFixed(2)} €</span>
                </div>
                {parseFloat(order.delivery_fee.toString()) > 0 && (
                  <div className="flex justify-between text-brand-text-muted">
                    <span>Доставка</span>
                    <span>{parseFloat(order.delivery_fee.toString()).toFixed(2)} €</span>
                  </div>
                )}
                {parseFloat(order.discount_amount.toString()) > 0 && (
                  <div className="flex justify-between text-green-400">
                    <span>Скидка</span>
                    <span>−{parseFloat(order.discount_amount.toString()).toFixed(2)} €</span>
                  </div>
                )}
                <div className="flex justify-between font-bold text-white pt-1 border-t border-white/5">
                  <span>Итого</span>
                  <span className="text-brand-red">
                    {parseFloat(order.total_amount.toString()).toFixed(2)} €
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Right: status management */}
          <div className="lg:col-span-1">
            <div className="card p-6 sticky top-8">
              <h2 className="font-bold text-white mb-2">Статус заказа</h2>
              <p className="text-brand-text-muted text-xs mb-4">
                Создан: {new Date(order.created_at).toLocaleString("ru-RU")}
              </p>
              <OrderStatusForm orderId={order.id} currentStatus={order.status} />

              {/* Status timeline */}              <div className="mt-6 space-y-2 text-xs">
                {[
                  { key: "confirmed_at", label: "Подтверждён", value: order.confirmed_at },
                  { key: "ready_at", label: "Готов", value: order.ready_at },
                  { key: "sent_at", label: "Отправлен", value: order.sent_at },
                  { key: "completed_at", label: "Выполнен", value: order.completed_at },
                  { key: "cancelled_at", label: "Отменён", value: order.cancelled_at },
                ]
                  .filter((e) => e.value)
                  .map((e) => (
                    <div key={e.key} className="flex justify-between text-brand-text-muted">
                      <span>{e.label}</span>
                      <span>{new Date(e.value!).toLocaleString("ru-RU")}</span>
                    </div>
                  ))}
              </div>

              <DeleteOrderButton orderId={order.id} orderNumber={order.order_number} />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
