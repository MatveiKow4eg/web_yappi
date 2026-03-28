"use client";

import { useEffect, useState, useCallback } from "react";
import { AppApi, type Order, type KitchenState } from "@/lib/api-client";
import KitchenOrderActions from "./KitchenOrderActions";

const STATUS_LABELS: Record<string, string> = {
  new: "Новый",
  confirmed_preparing: "Готовится",
  ready: "Готов",
  sent: "В пути",
  completed: "Выполнен",
  cancelled: "Отменён",
};

const STATUS_DOT: Record<string, string> = {
  new: "bg-yellow-400",
  confirmed_preparing: "bg-brand-red",
  ready: "bg-green-400",
  sent: "bg-blue-400",
};

const STATUS_LEFT_BORDER: Record<string, string> = {
  new: "border-l-yellow-400",
  confirmed_preparing: "border-l-brand-red",
  ready: "border-l-green-400",
  sent: "border-l-blue-400",
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
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const fetchOrders = useCallback(async () => {
    try {
      const res = await AppApi.admin.orders.list({
        statuses: "new,confirmed_preparing,ready,sent",
        limit: 0,
      });
      setOrders(res.orders);
      setLastRefreshed(new Date());
      setSelectedId((prev) => {
        if (prev) {
          const still = res.orders.find((o: Order) => o.id === prev);
          return still ? prev : (res.orders[0]?.id ?? null);
        }
        return res.orders[0]?.id ?? null;
      });
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

  const allOrders = [
    ...orders.filter((o) => ["new", "confirmed_preparing", "ready"].includes(o.status)),
    ...orders.filter((o) => o.status === "sent"),
  ];

  const selectedOrder = allOrders.find((o) => o.id === selectedId) ?? null;

  return (
    <div className="h-screen bg-brand-black flex flex-col overflow-hidden">
      {/* ── Top bar ── */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/5 shrink-0">
        <div className="flex items-center gap-3">
          <span className="text-brand-red font-black text-2xl">YS</span>
          <h1 className="text-lg font-black text-white">Кухня</h1>
        </div>
        <div className="flex items-center gap-3">
          <span
            className={`flex items-center gap-1.5 text-xs ${
              session?.kitchen_is_open ? "text-green-400" : "text-brand-text-muted"
            }`}
          >
            <span
              className={`w-2 h-2 rounded-full inline-block ${
                session?.kitchen_is_open ? "bg-green-400 animate-pulse" : "bg-gray-500"
              }`}
            />
            {session?.kitchen_is_open ? "Смена открыта" : "Смена закрыта"}
          </span>
          {!loadingSession && (
            <>
              <button onClick={fetchOrders} className="btn-secondary text-xs py-1.5 px-3">
                🔄
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
            </>
          )}
        </div>
      </div>

      {/* ── Cook time bar ── */}
      {!loadingSession && (
        <div className="flex items-center gap-3 px-4 py-2 border-b border-white/5 bg-brand-gray-dark/40 text-xs shrink-0">
          <span className="text-brand-text-muted">По умолч.:</span>
          {editingCookTime ? (
            <>
              <input
                type="number"
                value={cookMinutes}
                onChange={(e) => setCookMinutes(e.target.value)}
                className="input w-16 py-1 text-sm text-center"
                min={1}
                max={240}
              />
              <span className="text-brand-text-muted">мин</span>
              <button onClick={saveCookTime} className="btn-primary text-xs py-1 px-3">
                Сохранить
              </button>
              <button
                onClick={() => {
                  setEditingCookTime(false);
                  setCookMinutes(String(session?.kitchen_default_prep_minutes ?? 20));
                }}
                className="btn-secondary text-xs py-1 px-2"
              >
                Отмена
              </button>
            </>
          ) : (
            <>
              <span className="text-white font-bold">
                {session?.kitchen_default_prep_minutes ?? 20} мин
              </span>
              <button
                onClick={() => setEditingCookTime(true)}
                className="btn-secondary text-xs py-1 px-2"
              >
                Изменить
              </button>
            </>
          )}
          {lastRefreshed && (
            <span className="ml-auto text-brand-text-muted">
              Обновлено{" "}
              {lastRefreshed.toLocaleTimeString("ru-RU", {
                hour: "2-digit",
                minute: "2-digit",
                second: "2-digit",
              })}
            </span>
          )}
        </div>
      )}

      {/* ── Master / Detail ── */}
      <div className="flex flex-1 overflow-hidden">
        {/* LEFT — detail panel */}
        <div className="flex-1 overflow-y-auto p-6">
          {allOrders.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <div className="text-5xl mb-4">✅</div>
              <p className="text-white font-bold text-xl mb-1">Всё готово</p>
              <p className="text-brand-text-muted">Активных заказов нет</p>
            </div>
          ) : selectedOrder ? (
            <OrderDetail order={selectedOrder} session={session} onUpdate={fetchOrders} />
          ) : (
            <div className="flex items-center justify-center h-full text-brand-text-muted">
              Выберите заказ из списка
            </div>
          )}
        </div>

        {/* RIGHT — order list */}
        <div className="w-72 shrink-0 border-l border-white/5 overflow-y-auto bg-brand-gray-dark/30 flex flex-col">
          <div className="px-4 py-3 border-b border-white/5 flex items-center justify-between shrink-0">
            <span className="text-xs font-bold text-brand-text-muted uppercase tracking-widest">
              Заказы
            </span>
            <span className="text-xs text-brand-text-muted bg-white/10 px-2 py-0.5 rounded-full">
              {allOrders.length}
            </span>
          </div>

          {allOrders.length === 0 ? (
            <p className="text-brand-text-muted text-xs text-center py-8">Нет заказов</p>
          ) : (
            <div className="flex flex-col flex-1">
              {allOrders.map((order) => (
                <button
                  key={order.id}
                  onClick={() => setSelectedId(order.id)}
                  className={`w-full text-left px-4 py-3.5 border-b border-white/5 transition-colors hover:bg-white/5 border-l-2 ${
                    selectedId === order.id
                      ? `bg-white/8 ${STATUS_LEFT_BORDER[order.status] ?? "border-l-white/20"}`
                      : "border-l-transparent"
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span
                      className={`w-2 h-2 rounded-full shrink-0 ${STATUS_DOT[order.status] ?? "bg-gray-400"} ${order.status === "new" ? "animate-pulse" : ""}`}
                    />
                    <span className="text-white font-mono font-bold text-sm">
                      #{order.order_number}
                    </span>
                    <span className="ml-auto text-xs text-brand-text-muted">
                      {new Date(order.created_at).toLocaleTimeString("ru-RU", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>
                  <div className="flex items-center gap-1 mb-1">
                    <span className="text-brand-text-muted text-xs truncate">
                      {order.type === "delivery" ? "🚚" : "🏪"} {order.customer_name}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-brand-text-muted text-xs">
                      {order.items.length} поз. · {Number(order.total_amount).toFixed(2)} €
                    </span>
                    <span
                      className={`text-xs font-semibold ${
                        order.status === "new"
                          ? "text-yellow-400"
                          : order.status === "confirmed_preparing"
                            ? "text-brand-red"
                            : order.status === "sent"
                              ? "text-blue-400"
                              : "text-green-400"
                      }`}
                    >
                      {STATUS_LABELS[order.status]}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function OrderDetail({
  order,
  session,
  onUpdate,
}: {
  order: Order;
  session: KitchenState | null;
  onUpdate: () => void;
}) {
  return (
    <div className="max-w-2xl">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <p className="text-white font-black font-mono text-3xl mb-1">
            #{order.order_number}
          </p>
          <p className="text-brand-text-muted text-sm">
            {order.type === "delivery" ? "🚚 Доставка" : "🏪 Самовывоз"} ·{" "}
            {new Date(order.created_at).toLocaleTimeString("ru-RU", {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </p>
        </div>
        <span
          className={`text-sm font-bold px-3 py-1.5 rounded-xl shrink-0 ${
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

      {/* Customer */}
      <div className="card p-4 mb-4">
        <h3 className="text-xs font-bold text-brand-text-muted uppercase tracking-widest mb-3">
          Клиент
        </h3>
        <p className="text-white font-semibold">{order.customer_name}</p>
        <p className="text-brand-text-muted text-sm">{order.customer_phone}</p>
        {order.type === "delivery" && order.address_line && (
          <p className="text-brand-text-muted text-sm mt-2">
            📍 {order.address_line}
            {order.apartment ? `, кв. ${order.apartment}` : ""}
            {order.entrance ? `, подъезд ${order.entrance}` : ""}
            {order.floor ? `, этаж ${order.floor}` : ""}
            {order.door_code ? `, код ${order.door_code}` : ""}
          </p>
        )}
      </div>

      {/* Items */}
      <div className="card p-4 mb-4">
        <h3 className="text-xs font-bold text-brand-text-muted uppercase tracking-widest mb-3">
          Состав заказа
        </h3>
        <div className="space-y-3">
          {order.items.map((item) => (
            <div key={item.id} className="flex items-start justify-between gap-2">
              <div className="flex-1">
                <p className="text-white font-semibold">
                  <span className="text-brand-red mr-1.5">×{item.quantity}</span>
                  {item.product_name_snapshot}
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
              <p className="text-white text-sm font-bold shrink-0">
                {Number(item.line_total).toFixed(2)} €
              </p>
            </div>
          ))}
        </div>

        <div className="mt-4 pt-3 border-t border-white/5 space-y-1 text-sm">
          <div className="flex justify-between">
            <span className="text-brand-text-muted">Подытог</span>
            <span className="text-white">{Number(order.subtotal_amount).toFixed(2)} €</span>
          </div>
          {Number(order.delivery_fee) > 0 && (
            <div className="flex justify-between">
              <span className="text-brand-text-muted">Доставка</span>
              <span className="text-white">{Number(order.delivery_fee).toFixed(2)} €</span>
            </div>
          )}
          {Number(order.discount_amount) > 0 && (
            <div className="flex justify-between">
              <span className="text-brand-text-muted">Скидка</span>
              <span className="text-green-400">−{Number(order.discount_amount).toFixed(2)} €</span>
            </div>
          )}
          <div className="flex justify-between font-bold pt-1 border-t border-white/5">
            <span className="text-white text-base">Итого</span>
            <span className="text-brand-red text-lg">{Number(order.total_amount).toFixed(2)} €</span>
          </div>
        </div>
      </div>

      {/* Payment */}
      <div className="card p-4 mb-4">
        <h3 className="text-xs font-bold text-brand-text-muted uppercase tracking-widest mb-3">
          Оплата
        </h3>
        <div className="flex items-center justify-between text-sm">
          <span className="text-brand-text-muted">Способ</span>
          <span className="text-white">
            {PAYMENT_LABELS[order.payment_method] ?? order.payment_method}
          </span>
        </div>
        <div className="flex items-center justify-between text-sm mt-1.5">
          <span className="text-brand-text-muted">Статус</span>
          <span
            className={
              order.payment_status === "paid"
                ? "text-green-400 font-semibold"
                : "text-amber-400"
            }
          >
            {order.payment_status === "paid"
              ? "✅ Оплачено"
              : order.payment_status === "pending"
                ? "⏳ Ожидание"
                : order.payment_status}
          </span>
        </div>
        {order.estimated_ready_at && order.status === "confirmed_preparing" && (
          <div className="mt-3 px-3 py-2 rounded-lg bg-brand-red/10 border border-brand-red/20 text-xs text-brand-text-muted">
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
      </div>

      {/* Comment */}
      {order.comment && (
        <div className="card p-4 mb-4">
          <h3 className="text-xs font-bold text-brand-text-muted uppercase tracking-widest mb-2">
            Комментарий
          </h3>
          <p className="text-brand-text-muted text-sm">💬 {order.comment}</p>
        </div>
      )}

      {/* Actions */}
      <div className="card p-4">
        <h3 className="text-xs font-bold text-brand-text-muted uppercase tracking-widest mb-3">
          Действия
        </h3>
        <KitchenOrderActions
          orderId={order.id}
          currentStatus={order.status}
          orderType={order.type}
          paymentMethod={order.payment_method}
          defaultPrepMinutes={session?.kitchen_default_prep_minutes ?? 20}
          onUpdate={onUpdate}
        />
      </div>
    </div>
  );
}
