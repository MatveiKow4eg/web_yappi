"use client";

import { useEffect, useState, useCallback } from "react";
import { AppApi, type Order, type KitchenState } from "@/lib/api-client";
import KitchenOrderActions from "./KitchenOrderActions";

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

const PAYMENT_LABELS: Record<string, string> = {
  stripe: "Интернет-платеж",
  cash_on_pickup: "Наличные при самовывозе",
  card_on_pickup: "Карта при самовывозе",
  cash_on_delivery: "Наличные на доставке",
  card_on_delivery: "Карта на доставке",
};

export default function KitchenPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [session, setSession] = useState<KitchenState | null>(null);
  const [loadingSession, setLoadingSession] = useState(true);
  const [cookMinutes, setCookMinutes] = useState("");
  const [editingCookTime, setEditingCookTime] = useState(false);
  const [lastRefreshed, setLastRefreshed] = useState<Date | null>(null);

  const fetchOrders = useCallback(async () => {
    try {
      const res = await AppApi.admin.orders.list({ statuses: "new,confirmed_preparing,ready,sent", limit: 0 });
      setOrders(res.orders);
      setLastRefreshed(new Date());
    } catch {}
  }, []);

  const fetchSession = useCallback(async () => {
    try {
      const s = await AppApi.admin.kitchen.get();
      setSession(s);
      setCookMinutes(String(s.kitchen_default_prep_minutes));
    } catch {
    } finally {
      setLoadingSession(false);
    }
  }, []);

  useEffect(() => {
    fetchSession();
    fetchOrders();
    const interval = setInterval(fetchOrders, 5_000);
    return () => clearInterval(interval);
  }, [fetchSession, fetchOrders]);

  async function toggleDay() {
    if (!session) return;
    try {
      const updated = session.kitchen_is_open
        ? await AppApi.admin.kitchen.endDay()
        : await AppApi.admin.kitchen.startDay();
      setSession(updated);
    } catch {}
  }

  async function saveCookTime() {
    const minutes = parseInt(cookMinutes, 10);
    if (!minutes || minutes < 1) return;
    try {
      const updated = await AppApi.admin.kitchen.updateSettings({
        kitchen_default_prep_minutes: minutes,
      });
      setSession(updated);
      setEditingCookTime(false);
    } catch {}
  }

  const activeOrders = orders.filter((o) =>
    ["new", "confirmed_preparing", "ready"].includes(o.status)
  );
  const sentOrders = orders.filter((o) => o.status === "sent");

  return (
    <div className="min-h-screen bg-brand-black p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <span className="text-brand-red font-black text-2xl">YS</span>
          <h1 className="text-xl font-black text-white">Кухня</h1>
        </div>
        <div className="flex items-center gap-2 text-brand-text-muted text-sm">
          <span
            className={`w-2 h-2 rounded-full inline-block ${
              session?.kitchen_is_open ? "bg-green-400 animate-pulse" : "bg-gray-500"
            }`}
          />
          {activeOrders.length} активных
        </div>
      </div>

      {/* Session Panel */}
      {!loadingSession && (
        <div className="card p-4 mb-6">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex-1 min-w-0">
              <p className="text-xs text-brand-text-muted mb-0.5">Смена</p>
              <p
                className={`font-bold text-sm ${session?.kitchen_is_open ? "text-green-400" : "text-brand-text-muted"}`}
              >
                {session?.kitchen_is_open ? "Открыта" : "Закрыта"}
              </p>
              {session?.kitchen_is_open && session.kitchen_day_started_at && (
                <p className="text-xs text-brand-text-muted">
                  с{" "}
                  {new Date(session.kitchen_day_started_at).toLocaleTimeString("ru-RU", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </p>
              )}
            </div>

            {/* Default cook time */}
            <div className="flex items-center gap-2">
              <p className="text-xs text-brand-text-muted whitespace-nowrap">По умолч.:</p>
              {editingCookTime ? (
                <>
                  <input
                    type="number"
                    value={cookMinutes}
                    onChange={(e) => setCookMinutes(e.target.value)}
                    className="input w-20 py-1 text-sm text-center"
                    min={1}
                    max={240}
                  />
                  <span className="text-brand-text-muted text-xs">мин</span>
                  <button onClick={saveCookTime} className="btn-primary text-xs py-1 px-3">
                    Сохранить
                  </button>
                  <button
                    onClick={() => {
                      setEditingCookTime(false);
                      setCookMinutes(String(session?.kitchen_default_prep_minutes ?? 20));
                    }}
                    className="btn-secondary text-xs py-1 px-3"
                  >
                    Отмена
                  </button>
                </>
              ) : (
                <>
                  <span className="text-white font-bold text-sm">
                    {session?.kitchen_default_prep_minutes ?? 20} мин
                  </span>
                  <button
                    onClick={() => setEditingCookTime(true)}
                    className="btn-secondary text-xs py-1 px-3"
                  >
                    Изменить
                  </button>
                </>
              )}
            </div>

            <div className="flex gap-2">
              <button onClick={fetchOrders} className="btn-secondary text-xs py-1.5 px-3">
                🔄 Обновить
              </button>
              <button
                onClick={toggleDay}
                className={
                  session?.kitchen_is_open
                    ? "btn-secondary text-xs py-1.5 px-3"
                    : "btn-primary text-xs py-1.5 px-3"
                }
              >
                {session?.kitchen_is_open ? "Закрыть смену" : "Открыть смену"}
              </button>
            </div>
          </div>
          {lastRefreshed && (
            <p className="text-xs text-brand-text-muted mt-2">
              Обновлено в{" "}
              {lastRefreshed.toLocaleTimeString("ru-RU", {
                hour: "2-digit",
                minute: "2-digit",
                second: "2-digit",
              })}
            </p>
          )}
        </div>
      )}

      {activeOrders.length === 0 && sentOrders.length === 0 && (
        <div className="card p-16 text-center">
          <div className="text-5xl mb-4">✅</div>
          <p className="text-white font-bold text-xl mb-1">Всё готово</p>
          <p className="text-brand-text-muted">Активных заказов нет</p>
        </div>
      )}

      {/* Active orders */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
        {activeOrders.map((order) => (
          <OrderCard
            key={order.id}
            order={order}
            session={session}
            onUpdate={fetchOrders}
          />
        ))}
      </div>

      {/* Sent/delivering orders */}
      {sentOrders.length > 0 && (
        <>
          <h2 className="text-sm font-bold text-brand-text-muted uppercase tracking-widest mt-8 mb-3">
            Доставляются
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
            {sentOrders.map((order) => (
              <OrderCard
                key={order.id}
                order={order}
                session={session}
                onUpdate={fetchOrders}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function OrderCard({
  order,
  session,
  onUpdate,
}: {
  order: Order;
  session: KitchenState | null;
  onUpdate: () => void;
}) {
  return (
    <div
      className={`rounded-2xl border p-4 ${STATUS_BG[order.status] ?? "border-white/10 bg-brand-gray-dark"}`}
    >
      {/* Card header */}
      <div className="flex items-start justify-between mb-3">
        <div>
          <p className="text-white font-black font-mono text-lg">{order.order_number}</p>
          <p className="text-brand-text-muted text-xs">
            {order.type === "delivery" ? "🚚 Доставка" : "🏪 Самовывоз"} ·{" "}
            {new Date(order.created_at).toLocaleTimeString("ru-RU", {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </p>
        </div>
        <span
          className={`text-xs font-bold px-2 py-1 rounded-lg shrink-0 ${
            order.status === "new"
              ? "bg-yellow-500/20 text-yellow-400"
              : order.status === "confirmed_preparing"
                ? "bg-brand-red/20 text-brand-red"
                : order.status === "sent"
                  ? "bg-blue-500/20 text-blue-400"
                  : "bg-green-500/20 text-green-400"
          }`}
        >
          {STATUS_LABELS[order.status]}
        </span>
      </div>

      {/* Customer info */}
      <div className="mb-3 space-y-0.5">
        <p className="text-white text-sm font-semibold">{order.customer_name}</p>
        <p className="text-brand-text-muted text-xs">{order.customer_phone}</p>
        {order.type === "delivery" && order.address_line && (
          <p className="text-brand-text-muted text-xs">
            📍 {order.address_line}
            {order.apartment ? `, кв. ${order.apartment}` : ""}
            {order.entrance ? `, подъезд ${order.entrance}` : ""}
            {order.floor ? `, этаж ${order.floor}` : ""}
          </p>
        )}
      </div>

      {/* Payment + total */}
      <div className="mb-3 flex items-center gap-2">
        <span className="text-xs px-2 py-0.5 rounded-md bg-white/5 text-brand-text-muted">
          {PAYMENT_LABELS[order.payment_method] ?? order.payment_method}
        </span>
        <span className="text-white font-bold text-sm ml-auto">
          {Number(order.total_amount).toFixed(2)} €
        </span>
      </div>

      {/* Items */}
      <div className="space-y-2 mb-4 border-t border-white/5 pt-3">
        {order.items.map((item) => (
          <div key={item.id} className="text-sm">
            <p className="text-white font-semibold">
              ×{item.quantity} {item.product_name_snapshot}
            </p>
            {item.variant_name_snapshot && (
              <p className="text-brand-text-muted text-xs">{item.variant_name_snapshot}</p>
            )}
            {item.selections?.map((s) => (
              <p key={s.id} className="text-brand-text-muted text-xs">
                {s.option_group_name_snapshot}: {s.option_item_name_snapshot}
              </p>
            ))}
          </div>
        ))}
      </div>

      {/* Comment */}
      {order.comment && (
        <div className="mb-3 px-3 py-2 rounded-lg bg-white/5 text-brand-text-muted text-xs">
          💬 {order.comment}
        </div>
      )}

      {/* Estimated ready time */}
      {order.estimated_ready_at && order.status === "confirmed_preparing" && (
        <div className="mb-3 px-3 py-2 rounded-lg bg-brand-red/10 border border-brand-red/20 text-xs text-brand-text-muted">
          ⏱ Готов к:{" "}
          <span className="text-white font-semibold">
            {new Date(order.estimated_ready_at).toLocaleTimeString("ru-RU", {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </span>
          {order.estimated_prep_minutes && (
            <span className="ml-1">({order.estimated_prep_minutes} мин)</span>
          )}
        </div>
      )}

      {/* Action buttons */}
      <KitchenOrderActions
        orderId={order.id}
        currentStatus={order.status}
        orderType={order.type}
        paymentMethod={order.payment_method}
        defaultPrepMinutes={session?.kitchen_default_prep_minutes ?? 20}
        onUpdate={onUpdate}
      />
    </div>
  );
}

