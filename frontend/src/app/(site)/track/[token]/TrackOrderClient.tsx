"use client";

import { useEffect, useRef, useState } from "react";
import { AppApi, type Order } from "@/lib/api-client";
import { useCart } from "@/lib/cart-context";

const CART_STORAGE_KEY = "yappi_cart";
const CHECKOUT_DRAFT_KEY = "yappi_checkout_draft";

const PAYMENT_STATUS_LABELS: Record<string, string> = {
  paid: "✅ Оплачено",
};
const PAYMENT_METHOD_LABELS: Record<string, string> = {
  stripe: "Интернет-платеж",
  cash_on_pickup: "Наличными при самовывозе",
  card_on_pickup: "Картой при самовывозе",
  cash_on_delivery: "Наличными курьеру",
  card_on_delivery: "Картой курьеру",
};

const TERMINAL_STATUSES = new Set(["completed", "cancelled", "payment_failed", "expired"]);

function Spinner() {
  return (
    <svg
      className="animate-spin w-3.5 h-3.5 text-amber-400 inline-block mr-1"
      fill="none"
      viewBox="0 0 24 24"
    >
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
    </svg>
  );
}

function TimeDot({ minutes }: { minutes: number }) {
  const color =
    minutes <= 25 ? "bg-green-400" : minutes <= 60 ? "bg-amber-400" : "bg-red-500";
  return <span className={`inline-block w-2.5 h-2.5 rounded-full ${color} mr-1.5 shrink-0`} />;
}

export default function TrackOrderClient({ token }: { token: string }) {
  const { clearCart } = useCart();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [confirming, setConfirming] = useState(false);
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
      if (order && TERMINAL_STATUSES.has(order.status)) return;
      await fetchOrder();
    }, 5_000);

    return () => {
      active = false;
      clearInterval(interval);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  useEffect(() => {
    if (!order || order.payment_status !== "paid" || clearedRef.current) return;
    clearedRef.current = true;
    clearCart();
    localStorage.removeItem(CART_STORAGE_KEY);
    sessionStorage.removeItem(CHECKOUT_DRAFT_KEY);
  }, [order, clearCart]);

  async function handleConfirmReceived() {
    setConfirming(true);
    try {
      const updated = await AppApi.orders.confirmReceived(token);
      setOrder(updated);
    } catch {
      // will re-poll
    } finally {
      setConfirming(false);
    }
  }

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

  const isTerminal = TERMINAL_STATUSES.has(order.status);
  const isPending = order.status === "new";
  const isAccepted = ["confirmed_preparing", "ready", "sent", "completed"].includes(order.status);
  const isCancelled = ["cancelled", "payment_failed", "expired"].includes(order.status);

  const prepMinutes = order.estimated_prep_minutes;
  const showEstimatedRow =
    ["confirmed_preparing", "ready", "sent"].includes(order.status) && !!prepMinutes;

  // Row 1 — acceptance badge
  let acceptanceBadge: React.ReactNode;
  if (order.status === "awaiting_payment") {
    acceptanceBadge = <span className="badge-gray">Ожидает оплату</span>;
  } else if (isPending) {
    acceptanceBadge = (
      <span className="badge-amber flex items-center gap-1">
        <Spinner />
        Ожидание
      </span>
    );
  } else if (isAccepted) {
    acceptanceBadge = <span className="badge-green">Принят ✓</span>;
  } else if (isCancelled) {
    const label =
      order.status === "cancelled"
        ? "Отклонён"
        : order.status === "expired"
          ? "Истёк"
          : "Ошибка оплаты";
    acceptanceBadge = <span className="badge-red">{label}</span>;
  } else {
    acceptanceBadge = <span className="badge-gray">{order.status}</span>;
  }

  const showConfirmButton = order.status === "sent" && order.type === "delivery";

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-12">
      {/* Header */}
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

      {/* Status card */}
      <div className="card p-6 mb-6">
        <h2 className="font-bold text-white mb-4">Статус заказа</h2>

        {/* Row 1: Acceptance */}
        <div className={`flex items-center justify-between py-3 ${showEstimatedRow ? "border-b border-white/5" : ""}`}>
          <span className="text-sm text-brand-text-muted">Ожидание</span>
          {acceptanceBadge}
        </div>

        {/* Row 2: Estimated wait with colored dot */}
        {showEstimatedRow && (
          <div className="flex items-center justify-between py-3">
            <span className="text-sm text-brand-text-muted">Примерное ожидание</span>
            <span className="flex items-center text-white text-sm font-medium">
              <TimeDot minutes={prepMinutes!} />
              {prepMinutes} мин
            </span>
          </div>
        )}
      </div>

      {/* Confirm received button */}
      {showConfirmButton && (
        <div className="mb-6">
          <button
            onClick={handleConfirmReceived}
            disabled={confirming}
            className="btn-primary w-full py-4 text-base"
          >
            {confirming ? "Подтверждаем…" : "✅ Заказ получен"}
          </button>
          <p className="text-xs text-brand-text-muted text-center mt-2">
            Нажмите, когда получите заказ от курьера
          </p>
        </div>
      )}

      {/* Order details */}
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
              {order.payment_status === "paid" ? "✅ Оплачено" : "⏳ Ожидает оплаты"}
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
