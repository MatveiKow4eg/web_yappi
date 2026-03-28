"use client";

import { useEffect, useRef, useState } from "react";
import { AppApi, type Order } from "@/lib/api-client";

const CART_STORAGE_KEY = "yappi_cart";
const CHECKOUT_DRAFT_KEY = "yappi_checkout_draft";

const ACCEPTANCE_LABELS: Record<string, string> = {
  awaiting_payment: "Ожидает оплату",
  new: "Ожидание",
  confirmed_preparing: "Приняли",
  ready: "Приняли",
  sent: "Приняли",
  completed: "Приняли",
  payment_failed: "Оплата не прошла",
  expired: "Сессия истекла",
  cancelled: "Отклонено",
};
const ACCEPTANCE_COLORS: Record<string, string> = {
  awaiting_payment: "badge-gray",
  new: "badge-amber",
  confirmed_preparing: "badge-green",
  ready: "badge-green",
  sent: "badge-green",
  completed: "badge-green",
  payment_failed: "badge-red",
  expired: "badge-red",
  cancelled: "badge-red",
};
const READINESS_LABELS: Record<string, string> = {
  awaiting_payment: "Ожидает оплату",
  new: "Ожидает",
  confirmed_preparing: "Готовится",
  ready: "Готов",
  sent: "Передан курьеру",
  completed: "Завершён",
  payment_failed: "Не начато",
  expired: "Не начато",
  cancelled: "Отменён",
};
const READINESS_COLORS: Record<string, string> = {
  awaiting_payment: "badge-gray",
  new: "badge-gray",
  confirmed_preparing: "badge-amber",
  ready: "badge-green",
  sent: "badge-amber",
  completed: "badge-green",
  payment_failed: "badge-red",
  expired: "badge-red",
  cancelled: "badge-red",
};
const DELIVERY_LABELS: Record<string, string> = {
  awaiting_payment: "Ожидание оплаты",
  new: "Ожидание",
  confirmed_preparing: "Ожидание",
  ready: "Ожидание",
  sent: "В процессе",
  completed: "Доставлен",
  payment_failed: "Не начато",
  expired: "Не начато",
  cancelled: "Отменено",
};
const DELIVERY_COLORS: Record<string, string> = {
  awaiting_payment: "badge-gray",
  new: "badge-gray",
  confirmed_preparing: "badge-gray",
  ready: "badge-gray",
  sent: "badge-amber",
  completed: "badge-green",
  payment_failed: "badge-red",
  expired: "badge-red",
  cancelled: "badge-red",
};
const PAYMENT_STATUS_LABELS: Record<string, string> = {
  pending: "⏳ Ожидание",
  paid: "✅ Оплачено",
  failed: "❌ Не оплачено",
  refunded: "↩️ Возврат",
  unpaid: "⏳ Не оплачено",
};
const PAYMENT_METHOD_LABELS: Record<string, string> = {
  stripe: "Интернет-платеж",
  cash_on_pickup: "Наличными при самовывозе",
  card_on_pickup: "Картой при самовывозе",
  cash_on_delivery: "Наличными курьеру",
  card_on_delivery: "Картой курьеру",
};

const TERMINAL_STATUSES = new Set(["completed", "cancelled", "payment_failed", "expired"]);

export default function TrackOrderClient({
  token,
}: {
  token: string;
}) {
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const clearedRef = useRef(false);

  useEffect(() => {
    let active = true;

    async function fetchOrder() {
      try {
        const data = await AppApi.orders.track(token);
        if (active) setOrder(data);
      } catch {
        // leave previous state
      } finally {
        if (active) setLoading(false);
      }
    }

    fetchOrder();

    const interval = setInterval(async () => {
      // Stop polling once order is in a terminal state
      if (order && TERMINAL_STATUSES.has(order.status)) return;
      await fetchOrder();
    }, 5_000);

    return () => {
      active = false;
      clearInterval(interval);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  // Keep interval up-to-date with latest order status
  useEffect(() => {
    if (!order || !TERMINAL_STATUSES.has(order.status)) return;
    // Nothing to do — polling will self-stop on next tick
  }, [order]);

  useEffect(() => {
    if (!order || order.payment_status !== "paid" || clearedRef.current) return;
    clearedRef.current = true;
    localStorage.removeItem(CART_STORAGE_KEY);
    sessionStorage.removeItem(CHECKOUT_DRAFT_KEY);
  }, [order]);

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-12">
        <p className="text-brand-text-muted text-center">Загружаем статус заказа…</p>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-12">
        <p className="text-brand-text-muted text-center">Заказ не найден.</p>
      </div>
    );
  }

  const acceptanceLabel = ACCEPTANCE_LABELS[order.status] ?? "Ожидание";
  const acceptanceColor = ACCEPTANCE_COLORS[order.status] ?? "badge-gray";
  const readinessLabel = READINESS_LABELS[order.status] ?? order.status;
  const readinessColor = READINESS_COLORS[order.status] ?? "badge-gray";
  const deliveryLabel = DELIVERY_LABELS[order.status] ?? "Ожидание";
  const deliveryColor = DELIVERY_COLORS[order.status] ?? "badge-gray";
  const showEstimated = !TERMINAL_STATUSES.has(order.status);
  const isTerminal = TERMINAL_STATUSES.has(order.status);

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-12">
      <div className="mb-8">
        <h1 className="text-3xl font-black text-white mb-1">Статус заказа</h1>
        <div className="flex items-center gap-2">
          <p className="text-brand-text-muted">Заказ #{order.order_number}</p>
          {!isTerminal && (
            <span className="flex items-center gap-1 text-xs text-green-400">
              <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse inline-block" />
              Live
            </span>
          )}
        </div>
      </div>

      {/* Status list card */}
      <div className="card p-6 mb-6">
        <h2 className="font-bold text-white mb-4">Статус заказа</h2>

        {/* Row 1: Acceptance */}
        <div className="flex items-center justify-between py-3 border-b border-white/5">
          <span className="text-sm text-brand-text-muted">Ожидание</span>
          <span className={acceptanceColor}>{acceptanceLabel}</span>
        </div>

        {/* Row 2: Estimated wait */}
        {showEstimated && (
          <div className="flex items-center justify-between py-3 border-b border-white/5">
            <span className="text-sm text-brand-text-muted">Примерное ожидание</span>
            <span className="text-white text-sm font-medium">
              {order.estimated_min_minutes ?? 30}–{order.estimated_max_minutes ?? 60} мин
            </span>
          </div>
        )}

        {/* Row 3: Readiness */}
        <div
          className={`flex items-center justify-between py-3 ${
            order.type === "delivery" ? "border-b border-white/5" : ""
          }`}
        >
          <span className="text-sm text-brand-text-muted">Готовность заказа</span>
          <span className={readinessColor}>{readinessLabel}</span>
        </div>

        {/* Row 4: Delivery */}
        {order.type === "delivery" && (
          <div className="flex items-center justify-between py-3">
            <span className="text-sm text-brand-text-muted">Доставка</span>
            <span className={deliveryColor}>{deliveryLabel}</span>
          </div>
        )}
      </div>

      {/* Order details card */}
      <div className="card p-6 mb-6">
        <h2 className="font-bold text-white mb-4">Детали заказа</h2>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-brand-text-muted mb-1">Тип</p>
            <p className="text-white font-medium">
              {order.type === "delivery" ? "🚚 Доставка" : "🏪 Самовывоз"}
            </p>
          </div>
          <div>
            <p className="text-brand-text-muted mb-1">Оплата</p>
            <p className="text-white font-medium">
              {PAYMENT_METHOD_LABELS[order.payment_method] ??
                order.payment_method.replace(/_/g, " ")}
            </p>
          </div>
          <div>
            <p className="text-brand-text-muted mb-1">Статус оплаты</p>
            <p className="text-white font-medium">
              {PAYMENT_STATUS_LABELS[order.payment_status] ?? order.payment_status}
            </p>
          </div>
          <div>
            <p className="text-brand-text-muted mb-1">Сумма</p>
            <p className="text-white font-bold text-brand-red">
              {parseFloat(order.total_amount.toString()).toFixed(2)} €
            </p>
          </div>
          <div>
            <p className="text-brand-text-muted mb-1">Имя</p>
            <p className="text-white font-medium">{order.customer_name}</p>
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
