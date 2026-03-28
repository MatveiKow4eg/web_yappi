"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { AppApi, type Order, type KitchenShiftStats, type KitchenState } from "@/lib/api-client";
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
  completed: "bg-gray-500",
  cancelled: "bg-gray-500",
};

const STATUS_LEFT_BORDER: Record<string, string> = {
  new: "border-l-yellow-400",
  confirmed_preparing: "border-l-brand-red",
  ready: "border-l-green-400",
  sent: "border-l-blue-400",
  completed: "border-l-gray-600",
  cancelled: "border-l-gray-600",
};

const CLOSED_STATUSES = new Set(["completed", "cancelled", "payment_failed", "expired"]);

function orderSortKey(o: Order): number {
  if (o.status === "new") return 0;
  if (["confirmed_preparing", "ready", "sent"].includes(o.status)) return 1;
  return 2;
}

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
  const sessionRef = useRef<KitchenState | null>(null);
  const [loadingSession, setLoadingSession] = useState(true);
  const [pickupMinutes, setPickupMinutes] = useState("20");
  const [deliveryMinutes, setDeliveryMinutes] = useState("45");
  const [savingTimes, setSavingTimes] = useState(false);
  const [showOrderTimeEditor, setShowOrderTimeEditor] = useState(false);
  const [closingDay, setClosingDay] = useState(false);
  const [openingDay, setOpeningDay] = useState(false);
  const [lastRefreshed, setLastRefreshed] = useState<Date | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyByDay, setHistoryByDay] = useState<Array<{ dayKey: string; dayLabel: string; orders: number; rolls: number; total: number }>>([]);
  const [statsLoading, setStatsLoading] = useState(false);
  const [shiftStats, setShiftStats] = useState<KitchenShiftStats | null>(null);

  const fetchOrders = useCallback(async () => {
    try {
      const currentSession = sessionRef.current;
      const params: Record<string, string | number> = {
        statuses: "new,confirmed_preparing,ready,sent,completed,cancelled",
        limit: 0,
      };
      if (currentSession?.kitchen_day_started_at) {
        params.created_after = currentSession.kitchen_day_started_at;
      }
      const res = await AppApi.admin.orders.list(params);
      const sorted = [...res.orders].sort((a: Order, b: Order) => {
        const kDiff = orderSortKey(a) - orderSortKey(b);
        if (kDiff !== 0) return kDiff;
        // Within same group: active = oldest first (needs attention), closed = newest first
        const aTime = new Date(a.created_at).getTime();
        const bTime = new Date(b.created_at).getTime();
        return orderSortKey(a) === 2 ? bTime - aTime : aTime - bTime;
      });
      setOrders(sorted);
      setLastRefreshed(new Date());
      setSelectedId((prev) => {
        if (prev) {
          const still = sorted.find((o: Order) => o.id === prev);
          return still ? prev : (sorted[0]?.id ?? null);
        }
        return sorted[0]?.id ?? null;
      });
    } catch {}
  }, []);

  const fetchSession = useCallback(async () => {
    try {
      const s = await AppApi.admin.kitchen.get();
      setSession(s);
      sessionRef.current = s;
      setPickupMinutes(String(s.kitchen_default_prep_minutes));
      setDeliveryMinutes(String(s.kitchen_delivery_prep_minutes ?? s.min_delivery_time_minutes ?? 45));
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

  useEffect(() => {
    if (!loadingSession && session && !session.kitchen_is_open) {
      loadShiftStats();
    }
  }, [loadingSession, session]);

  async function openDay() {
    if (!session) return;
    setOpeningDay(true);
    try {
      const updated = await AppApi.admin.kitchen.startDay();
      setSession(updated);
      sessionRef.current = updated;
      setShiftStats(null);
      setShowOrderTimeEditor(false);
      await fetchOrders();
    } catch {}
    setOpeningDay(false);
  }

  async function closeDay() {
    if (!session || !session.kitchen_is_open) return;
    setClosingDay(true);
    try {
      const updated = await AppApi.admin.kitchen.endDay();
      setSession(updated);
      sessionRef.current = updated;
      setShowOrderTimeEditor(false);
      setSelectedId(null);
      await fetchOrders();
      await loadShiftStats();
    } catch {}
    setClosingDay(false);
  }

  async function saveKitchenTimes() {
    const pickup = parseInt(pickupMinutes, 10);
    const delivery = parseInt(deliveryMinutes, 10);
    if (!pickup || pickup < 1 || !delivery || delivery < 1) return;

    setSavingTimes(true);
    try {
      const updated = await AppApi.admin.kitchen.updateSettings({
        kitchen_default_prep_minutes: pickup,
        kitchen_delivery_prep_minutes: delivery,
      });
      setSession(updated);
      sessionRef.current = updated;
      setShowOrderTimeEditor(false);
    } catch {}
    setSavingTimes(false);
  }

  async function loadHistoryByDays() {
    setHistoryLoading(true);
    try {
      const res = await AppApi.admin.orders.list({
        statuses: "new,confirmed_preparing,ready,sent,completed,cancelled",
        limit: 0,
      });

      const daily = new Map<string, { dayLabel: string; orders: number; rolls: number; total: number }>();
      for (const order of res.orders) {
        if (order.status === "cancelled" || order.status === "payment_failed" || order.status === "expired") continue;
        const dayKey = new Date(order.created_at).toLocaleDateString("en-CA", {
          timeZone: "Europe/Tallinn",
          year: "numeric",
          month: "2-digit",
          day: "2-digit",
        });
        const dayDate = new Date(order.created_at);
        const ddmmyyyy = dayDate.toLocaleDateString("ru-RU", {
          timeZone: "Europe/Tallinn",
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
        });
        const weekday = dayDate.toLocaleDateString("ru-RU", {
          timeZone: "Europe/Tallinn",
          weekday: "short",
        });
        const weekdayTitle = weekday.charAt(0).toUpperCase() + weekday.slice(1).replace(".", "");
        const dayLabel = `${ddmmyyyy} (${weekdayTitle})`;
        const prev = daily.get(dayKey) ?? { dayLabel, orders: 0, rolls: 0, total: 0 };
        daily.set(dayKey, {
          dayLabel: prev.dayLabel,
          orders: prev.orders + 1,
          rolls: prev.rolls + order.items.reduce((sum, item) => sum + item.quantity, 0),
          total: prev.total + Number(order.total_amount),
        });
      }

      const rows = Array.from(daily.entries())
        .sort(([a], [b]) => (a < b ? 1 : -1))
        .map(([dayKey, values]) => ({ dayKey, ...values }));
      setHistoryByDay(rows);
    } catch {
      setHistoryByDay([]);
    } finally {
      setHistoryLoading(false);
    }
  }

  async function loadShiftStats() {
    setStatsLoading(true);
    try {
      const stats = await AppApi.admin.kitchen.shiftStats();
      setShiftStats(stats);
    } catch {
      setShiftStats(null);
    } finally {
      setStatsLoading(false);
    }
  }

  const allOrders = orders;
  const activeCount = orders.filter((o) => !CLOSED_STATUSES.has(o.status)).length;

  const selectedOrder = allOrders.find((o) => o.id === selectedId) ?? null;

  return (
    <div className="h-screen bg-brand-black overflow-hidden relative flex flex-col">
      <div className="px-4 md:px-6 pt-4 pb-3 border-b border-white/5 bg-brand-gray-dark/20">
        <div className="max-w-5xl">
          <p className="text-xs text-brand-text-muted uppercase tracking-widest mb-2">Управление сменой</p>

          {loadingSession ? (
            <p className="text-sm text-brand-text-muted">Загрузка статуса смены...</p>
          ) : session?.kitchen_is_open ? (
            <>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={() => setShowOrderTimeEditor((prev) => !prev)}
                  className={showOrderTimeEditor ? "btn-secondary py-2.5" : "btn-primary py-2.5"}
                >
                  Время заказов
                </button>
                <button onClick={closeDay} disabled={closingDay} className="btn-secondary py-2.5">
                  {closingDay ? "Закрываем смену..." : "Закрыть смену"}
                </button>
                <button onClick={loadHistoryByDays} disabled={historyLoading} className="btn-secondary py-2.5">
                  {historyLoading ? "Загрузка..." : "Посмотреть историю"}
                </button>
              </div>

              {showOrderTimeEditor && (
                <div className="mt-3 card p-3 max-w-xl">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <label>
                      <span className="block text-xs text-brand-text-muted mb-1">Самовывоз, мин</span>
                      <input
                        type="number"
                        min={1}
                        max={240}
                        value={pickupMinutes}
                        onChange={(e) => setPickupMinutes(e.target.value)}
                        className="input text-sm"
                      />
                    </label>
                    <label>
                      <span className="block text-xs text-brand-text-muted mb-1">Доставка, мин</span>
                      <input
                        type="number"
                        min={1}
                        max={240}
                        value={deliveryMinutes}
                        onChange={(e) => setDeliveryMinutes(e.target.value)}
                        className="input text-sm"
                      />
                    </label>
                  </div>
                  <div className="mt-3">
                    <button onClick={saveKitchenTimes} disabled={savingTimes} className="btn-primary py-2.5 w-full sm:w-auto">
                      {savingTimes ? "Сохранение..." : "Сохранить время"}
                    </button>
                  </div>
                </div>
              )}
            </>
          ) : (
            <>
              <div className="flex flex-wrap items-center gap-2">
                <button onClick={openDay} disabled={openingDay} className="btn-primary py-2.5">
                  {openingDay ? "Открываем смену..." : "Открыть смену"}
                </button>
                <button onClick={loadHistoryByDays} disabled={historyLoading} className="btn-secondary py-2.5">
                  {historyLoading ? "Загрузка..." : "Посмотреть историю"}
                </button>
                <button onClick={loadShiftStats} disabled={statsLoading} className="btn-secondary py-2.5">
                  {statsLoading ? "Загрузка..." : "Статистика последней смены"}
                </button>
              </div>

              <p className="text-xs text-brand-text-muted mt-2">
                Смена закрыта. Откройте новую смену или посмотрите историю и статистику последней смены.
              </p>
            </>
          )}

          {shiftStats && (
            <div className="card p-3 mt-3 max-w-3xl">
              <p className="text-xs text-brand-text-muted mb-2 uppercase tracking-wider">
                Статистика смены
                {shiftStats.shift_started_at
                  ? ` (${new Date(shiftStats.shift_started_at).toLocaleDateString("ru-RU")})`
                  : ""}
              </p>
              <div className="grid grid-cols-3 gap-2 text-center">
                <div>
                  <p className="text-brand-text-muted text-xs">Заказы</p>
                  <p className="text-white font-black text-xl">{shiftStats.orders_count}</p>
                </div>
                <div>
                  <p className="text-brand-text-muted text-xs">Роллы, шт</p>
                  <p className="text-white font-black text-xl">{shiftStats.rolls_count}</p>
                </div>
                <div>
                  <p className="text-brand-text-muted text-xs">Тотал чек</p>
                  <p className="text-brand-red font-black text-xl">{Number(shiftStats.total_revenue).toFixed(2)} €</p>
                </div>
              </div>
            </div>
          )}

          {historyByDay.length > 0 && (
            <div className="card p-3 mt-3 max-w-3xl max-h-64 overflow-y-auto">
              <p className="text-xs text-brand-text-muted mb-2 uppercase tracking-wider">История по дням</p>
              <div className="space-y-2">
                {historyByDay.map((row) => (
                  <div key={row.dayKey} className="flex items-center justify-between text-sm">
                    <span className="text-white">{row.dayLabel}</span>
                    <span className="text-brand-text-muted">{row.orders} заказов</span>
                    <span className="text-brand-text-muted">{row.rolls} шт</span>
                    <span className="text-brand-red font-semibold">{row.total.toFixed(2)} €</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="flex-1 min-h-0 flex overflow-hidden md:flex-row flex-col">
        {/* LEFT — detail panel */}
        <div className="flex-1 overflow-y-auto p-4 md:p-6">
          {!session?.kitchen_is_open ? (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <div className="text-5xl mb-4">🌙</div>
              <p className="text-white font-bold text-xl mb-1">Смена закрыта</p>
              <p className="text-brand-text-muted">Нажмите «Открыть смену», чтобы начать новый день</p>
            </div>
          ) : activeCount === 0 && allOrders.length === 0 ? (
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
        <div className="w-full md:w-80 shrink-0 border-l border-white/5 overflow-y-auto bg-brand-gray-dark/30 flex flex-col">
          <div className="px-4 py-3 border-b border-white/5 flex items-center justify-between shrink-0">
            <span className="text-xs font-bold text-brand-text-muted uppercase tracking-widest flex items-center gap-2">
              Заказы
              <span className={`w-2 h-2 rounded-full ${session?.kitchen_is_open ? "bg-green-400" : "bg-gray-500"}`} />
            </span>
            <div className="flex items-center gap-1.5">
              {activeCount > 0 && (
                <span className="text-xs text-yellow-400 font-bold bg-yellow-400/10 px-2 py-0.5 rounded-full">
                  {activeCount} акт.
                </span>
              )}
              <span className="text-xs text-brand-text-muted bg-white/10 px-2 py-0.5 rounded-full">
                {allOrders.length}
              </span>
              {lastRefreshed && (
                <span className="text-[10px] text-brand-text-muted">
                  {lastRefreshed.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
                </span>
              )}
            </div>
          </div>

          {allOrders.length === 0 ? (
            <p className="text-brand-text-muted text-xs text-center py-8">Нет заказов</p>
          ) : (
            <div className="flex flex-col flex-1">
              {allOrders.map((order) => {
                const isClosed = CLOSED_STATUSES.has(order.status);
                const isNew = order.status === "new";
                return (
                  <button
                    key={order.id}
                    onClick={() => setSelectedId(order.id)}
                    className={`w-full text-left px-4 py-3.5 border-b border-white/5 transition-colors border-l-2 ${
                      isClosed ? "opacity-45 hover:opacity-70" : "hover:bg-white/5"
                    } ${
                      isNew ? "bg-yellow-500/8" : ""
                    } ${
                      selectedId === order.id
                        ? `bg-white/8 ${STATUS_LEFT_BORDER[order.status] ?? "border-l-white/20"}`
                        : "border-l-transparent"
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <span
                        className={`w-2 h-2 rounded-full shrink-0 ${STATUS_DOT[order.status] ?? "bg-gray-400"} ${isNew ? "animate-pulse" : ""}`}
                      />
                      <span className={`font-mono font-bold text-sm ${isClosed ? "text-brand-text-muted" : "text-white"}`}>
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
                          isClosed
                            ? "text-gray-500"
                            : order.status === "new"
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
                );
              })}
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
