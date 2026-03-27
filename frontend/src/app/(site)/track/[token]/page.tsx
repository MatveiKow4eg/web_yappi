import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { AppApi } from "@/lib/api-client";
import TrackClientState from "./TrackClientState";

export const metadata: Metadata = {
  title: "Отслеживание заказа",
};

const STATUS_LABELS: Record<string, string> = {
  new: "Новый — ожидает подтверждения",
  confirmed_preparing: "Подтвержден — готовится",
  ready: "Готов к выдаче",
  sent: "Отправлен курьером",
  completed: "Доставлен",
  cancelled: "Отменён",
};

const STATUS_COLORS: Record<string, string> = {
  new: "badge-gray",
  confirmed_preparing: "badge-red",
  ready: "badge-green",
  sent: "badge-red",
  completed: "badge-green",
  cancelled: "badge-gray",
};

const PAYMENT_STATUS_LABELS: Record<string, string> = {
  pending: "⏳ Ожидание",
  paid: "✅ Оплачено",
  failed: "❌ Не оплачено",
};

const PAYMENT_STATUS_COLORS: Record<string, string> = {
  pending: "badge-amber",
  paid: "badge-green",
  failed: "badge-red",
};

interface Props {
  params: { token: string };
  searchParams?: { paid?: string | string[] };
}

export default async function TrackPage({ params, searchParams }: Props) {
  const order = await AppApi.orders.track(params.token).catch(() => null);

  if (!order) notFound();

  const paidParam = Array.isArray(searchParams?.paid)
    ? searchParams?.paid[0]
    : searchParams?.paid;
  const returnedFromPaidStripe = paidParam === "1";
  const label = STATUS_LABELS[order.status] ?? order.status;
  const colorClass = STATUS_COLORS[order.status] ?? "badge-gray";

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-12">
      <TrackClientState paid={returnedFromPaidStripe} />

      <div className="mb-8">
        <h1 className="text-3xl font-black text-white mb-1">Статус заказа</h1>
        <p className="text-brand-text-muted">Заказ #{order.order_number}</p>
      </div>

      {returnedFromPaidStripe && (
        <div className="mb-6 rounded-2xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">
          Оплата в Stripe завершена. Если статус оплаты ещё не обновился, подождите несколько секунд: заказ станет paid только после подтверждённого webhook от Stripe.
        </div>
      )}

      {/* Status card */}
      <div className="card p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <span className="text-sm text-brand-text-muted">Статус заказа</span>
          <span className={colorClass}>{label}</span>
        </div>

        <div className="flex items-center justify-between mb-4 pb-4 border-b border-white/5">
          <span className="text-sm text-brand-text-muted">Статус оплаты</span>
          <span className={PAYMENT_STATUS_COLORS[order.payment_status] ?? "badge-gray"}>
            {PAYMENT_STATUS_LABELS[order.payment_status] ?? order.payment_status}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-brand-text-muted mb-1">Тип</p>
            <p className="text-white font-medium">
              {order.type === "delivery" ? "🚚 Доставка" : "🏪 Самовывоз"}
            </p>
          </div>
          <div>
            <p className="text-brand-text-muted mb-1">Оплата</p>
            <p className="text-white font-medium capitalize">
              {order.payment_method.replace(/_/g, " ")}
            </p>
          </div>
          <div>
            <p className="text-brand-text-muted mb-1">Имя</p>
            <p className="text-white font-medium">{order.customer_name}</p>
          </div>
          <div>
            <p className="text-brand-text-muted mb-1">Сумма</p>
            <p className="text-white font-bold text-brand-red">
              {parseFloat(order.total_amount.toString()).toFixed(2)} €
            </p>
          </div>
        </div>

        {order.address_line && (
          <div className="mt-4 pt-4 border-t border-white/5">
            <p className="text-brand-text-muted text-sm mb-1">Адрес доставки</p>
            <p className="text-white text-sm">{order.address_line}</p>
          </div>
        )}
      </div>

      {/* Items */}
      <div className="card p-6">
        <h2 className="font-bold text-white mb-4">Состав заказа</h2>
        <div className="space-y-3">
          {order.items.map((item: any) => (
            <div key={item.id} className="flex items-center justify-between text-sm">
              <div>
                <p className="text-white">{item.product_name_snapshot}</p>
                {item.variant_name_snapshot && (
                  <p className="text-brand-text-muted text-xs">{item.variant_name_snapshot}</p>
                )}
              </div>
              <div className="text-right">
                <p className="text-white">×{item.quantity}</p>
                <p className="text-brand-red font-bold">
                  {parseFloat(item.line_total.toString()).toFixed(2)} €
                </p>
              </div>
            </div>
          ))}
        </div>

        <div className="divider mt-4 pt-4 flex justify-between font-bold">
          <span className="text-white">Итого</span>
          <span className="text-brand-red">
            {parseFloat(order.total_amount.toString()).toFixed(2)} €
          </span>
        </div>
      </div>
    </div>
  );
}
