"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { AppApi, type Order, type KitchenShiftStats, type KitchenState } from "@/lib/api-client";
import { resolveProductImageSrc } from "@/lib/utils";
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
  completed: "border-l-gray-300",
  cancelled: "border-l-gray-300",
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

function OrderTypeIcon({ type }: { type: Order["type"] }) {
  if (type === "delivery") {
    return (
      <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M3 7h11v8H3z" />
        <path d="M14 10h3l3 3v2h-6z" />
        <circle cx="7.5" cy="17.5" r="1.5" fill="currentColor" stroke="none" />
        <circle cx="17.5" cy="17.5" r="1.5" fill="currentColor" stroke="none" />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 3 4 7l8 4 8-4-8-4z" />
      <path d="M4 7v10l8 4 8-4V7" />
      <path d="M12 11v10" />
    </svg>
  );
}

function extractProductCode(imageRef?: string | null): string | null {
  const value = (imageRef ?? "").replace(/^#\s*/, "").trim();
  if (!value) return null;
  const match = value.match(/\d+/);
  return match ? match[0] : null;
}

function extractPiecesCount(variantName?: string, defaultPieces?: number | null): number | null {
  const variantMatch = (variantName ?? "").match(/(\d+)\s*шт/i);
  if (variantMatch) return Number(variantMatch[1]);
  if (typeof defaultPieces === "number" && defaultPieces > 0) return defaultPieces;
  return null;
}

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
  const [showStats, setShowStats] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [showShiftModal, setShowShiftModal] = useState(false);
  const [showOrderDescription, setShowOrderDescription] = useState(true);
  const [preparedByOrder, setPreparedByOrder] = useState<Record<string, Record<string, boolean>>>({});

  function togglePrepared(orderId: string, itemId: string) {
    setPreparedByOrder((prev) => ({
      ...prev,
      [orderId]: { ...prev[orderId], [itemId]: !prev[orderId]?.[itemId] },
    }));
  }

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
      setShowStats(false);
      setShowHistory(false);
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
      setShowStats(true);
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
    if (historyByDay.length > 0 && showHistory) { setShowHistory(false); return; }
    setHistoryLoading(true);
    setShowHistory(true);
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
    if (shiftStats && showStats) { setShowStats(false); return; }
    setStatsLoading(true);
    setShowStats(true);
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
    <div className="h-screen bg-gray-50 overflow-hidden relative flex flex-col kitchen-light">

      {/* ── Gear modal: shift management (open shift only) ────────────── */}
      {showShiftModal && session?.kitchen_is_open && (
        <div
          className="absolute inset-0 z-50 flex items-center justify-center bg-gray-900/50 backdrop-blur-sm"
          onClick={() => setShowShiftModal(false)}
        >
          <div className="card p-6 max-w-sm w-full mx-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm font-bold text-gray-900 uppercase tracking-widest">Управление сменой</p>
              <button
                onClick={() => setShowShiftModal(false)}
                className="text-gray-900 hover:text-gray-900 text-2xl leading-none"
              >
                ×
              </button>
            </div>

            <div className="space-y-2">
              <button
                onClick={() => setShowOrderTimeEditor((prev) => !prev)}
                className="btn-secondary py-2.5 w-full"
              >
                Время заказов
              </button>

              {showOrderTimeEditor && (
                <div className="card p-3 space-y-3">
                  <div>
                    <p className="text-xs text-gray-900 mb-2">Самовывоз, мин</p>
                    <div className="flex items-center justify-between gap-2">
                      <button
                        onClick={() => setPickupMinutes(String(Math.max(1, parseInt(pickupMinutes, 10) - 5)))}
                        className="btn-secondary py-2 px-3 text-sm"
                      >
                        −5
                      </button>
                      <span className="text-gray-900 font-bold text-lg w-12 text-center">{pickupMinutes}</span>
                      <button
                        onClick={() => setPickupMinutes(String(Math.min(240, parseInt(pickupMinutes, 10) + 5)))}
                        className="btn-secondary py-2 px-3 text-sm"
                      >
                        +5
                      </button>
                    </div>
                  </div>

                  <div>
                    <p className="text-xs text-gray-900 mb-2">Доставка, мин</p>
                    <div className="flex items-center justify-between gap-2">
                      <button
                        onClick={() => setDeliveryMinutes(String(Math.max(1, parseInt(deliveryMinutes, 10) - 5)))}
                        className="btn-secondary py-2 px-3 text-sm"
                      >
                        −5
                      </button>
                      <span className="text-gray-900 font-bold text-lg w-12 text-center">{deliveryMinutes}</span>
                      <button
                        onClick={() => setDeliveryMinutes(String(Math.min(240, parseInt(deliveryMinutes, 10) + 5)))}
                        className="btn-secondary py-2 px-3 text-sm"
                      >
                        +5
                      </button>
                    </div>
                  </div>

                  <button onClick={saveKitchenTimes} disabled={savingTimes} className="btn-primary py-2 w-full">
                    {savingTimes ? "Сохранение..." : "Сохранить время"}
                  </button>
                </div>
              )}

              <button
                onClick={async () => { setShowShiftModal(false); await closeDay(); }}
                disabled={closingDay}
                className="btn-secondary py-2.5 w-full border-brand-red/40 text-brand-red hover:bg-brand-red/10"
              >
                {closingDay ? "Закрываем смену..." : "Закрыть смену"}
              </button>

              <button
                onClick={loadHistoryByDays}
                disabled={historyLoading}
                className="btn-secondary py-2.5 w-full"
              >
                {historyLoading ? "Загрузка..." : "Посмотреть историю"}
              </button>

              <button
                onClick={loadShiftStats}
                disabled={statsLoading}
                className="btn-secondary py-2.5 w-full"
              >
                {statsLoading ? "Загрузка..." : "Статистика смены"}
              </button>
            </div>

            {shiftStats && showStats && (
              <div className="card p-3 mt-4">
                <p className="text-xs text-gray-900 mb-2 uppercase tracking-wider">
                  Статистика смены
                  {shiftStats.shift_started_at
                    ? ` (${new Date(shiftStats.shift_started_at).toLocaleDateString("ru-RU")})`
                    : ""}
                </p>
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div>
                    <p className="text-gray-900 text-xs">Заказы</p>
                    <p className="text-gray-900 font-black text-xl">{shiftStats.orders_count}</p>
                  </div>
                  <div>
                    <p className="text-gray-900 text-xs">Роллы, шт</p>
                    <p className="text-gray-900 font-black text-xl">{shiftStats.rolls_count}</p>
                  </div>
                  <div>
                    <p className="text-gray-900 text-xs">Тотал чек</p>
                    <p className="text-brand-red font-black text-xl">{Number(shiftStats.total_revenue).toFixed(2)} €</p>
                  </div>
                </div>
              </div>
            )}

            {historyByDay.length > 0 && showHistory && (
              <div className="card p-3 mt-4 max-h-48 overflow-y-auto">
                <p className="text-xs text-gray-900 mb-2 uppercase tracking-wider">История по дням</p>
                <div className="space-y-2">
                  {historyByDay.map((row) => (
                    <div key={row.dayKey} className="flex items-center justify-between text-sm">
                      <span className="text-gray-900">{row.dayLabel}</span>
                      <span className="text-gray-900">{row.orders} зак.</span>
                      <span className="text-gray-900">{row.rolls} шт</span>
                      <span className="text-brand-red font-semibold">{row.total.toFixed(2)} €</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── CLOSED SHIFT: full-screen centred, no sidebar ─────────────── */}
      {!loadingSession && !session?.kitchen_is_open ? (
        <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
          <div className="text-6xl mb-6">🌙</div>
          <p className="text-gray-900 font-bold text-2xl mb-2">Смена закрыта</p>
          <p className="text-gray-900 mb-8">Нажмите «Открыть смену», чтобы начать новый день</p>

          <button onClick={openDay} disabled={openingDay} className="btn-primary py-3 px-10 text-base mb-6">
            {openingDay ? "Открываем смену..." : "Открыть смену"}
          </button>

          <div className="flex flex-wrap justify-center gap-3 mb-6">
            <button onClick={loadHistoryByDays} disabled={historyLoading} className="btn-secondary py-2 px-5 text-sm">
              {historyLoading ? "Загрузка..." : "Посмотреть историю"}
            </button>
            <button onClick={loadShiftStats} disabled={statsLoading} className="btn-secondary py-2 px-5 text-sm">
              {statsLoading ? "Загрузка..." : "Статистика последней смены"}
            </button>
          </div>

          {shiftStats && showStats && (
            <div className="card p-4 max-w-sm w-full">
              <p className="text-xs text-gray-900 mb-2 uppercase tracking-wider">
                Статистика смены
                {shiftStats.shift_started_at
                  ? ` (${new Date(shiftStats.shift_started_at).toLocaleDateString("ru-RU")})`
                  : ""}
              </p>
              <div className="grid grid-cols-3 gap-2 text-center">
                <div>
                  <p className="text-gray-900 text-xs">Заказы</p>
                  <p className="text-gray-900 font-black text-xl">{shiftStats.orders_count}</p>
                </div>
                <div>
                  <p className="text-gray-900 text-xs">Роллы, шт</p>
                  <p className="text-gray-900 font-black text-xl">{shiftStats.rolls_count}</p>
                </div>
                <div>
                  <p className="text-gray-900 text-xs">Тотал чек</p>
                  <p className="text-brand-red font-black text-xl">{Number(shiftStats.total_revenue).toFixed(2)} €</p>
                </div>
              </div>
            </div>
          )}

          {historyByDay.length > 0 && showHistory && (
            <div className="card p-3 mt-4 max-w-md w-full max-h-48 overflow-y-auto">
              <p className="text-xs text-gray-900 mb-2 uppercase tracking-wider">История по дням</p>
              <div className="space-y-2">
                {historyByDay.map((row) => (
                  <div key={row.dayKey} className="flex items-center justify-between text-sm">
                    <span className="text-gray-900">{row.dayLabel}</span>
                    <span className="text-gray-900">{row.orders} зак.</span>
                    <span className="text-gray-900">{row.rolls} шт</span>
                    <span className="text-brand-red font-semibold">{row.total.toFixed(2)} €</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : (
        /* ── OPEN SHIFT: 2-column layout ──────────────────────────────── */
        <div className="flex-1 min-h-0 flex overflow-hidden md:flex-row flex-col">
          {/* LEFT — detail panel */}
          <div className="flex-1 overflow-y-auto p-4 md:p-6">
            <div className="mb-3">
              <button
                onClick={() => setShowOrderDescription((prev) => !prev)}
                className="text-xs text-gray-900 hover:text-gray-900 bg-gray-100 hover:bg-gray-200 px-2 py-1 rounded-full transition-colors"
                title={showOrderDescription ? "Скрыть описание заказа" : "Показать описание заказа"}
              >
                {showOrderDescription ? "Скрыть" : "Показать"}
              </button>
            </div>

            {showOrderDescription && (
              <>
                {loadingSession ? (
                  <div className="flex items-center justify-center h-full">
                    <p className="text-gray-900">Загрузка смены...</p>
                  </div>
                ) : activeCount === 0 && allOrders.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-center">
                    <div className="text-5xl mb-4">✅</div>
                    <p className="text-gray-900 font-bold text-xl mb-1">Всё готово</p>
                    <p className="text-gray-900">Активных заказов нет</p>
                  </div>
                ) : selectedOrder ? (
                  <OrderDetail order={selectedOrder} session={session} onUpdate={fetchOrders} preparedItems={preparedByOrder[selectedOrder.id] ?? {}} onTogglePrepared={(itemId) => togglePrepared(selectedOrder.id, itemId)} />
                ) : (
                  <div className="flex items-center justify-center h-full text-gray-900">
                    Выберите заказ из списка
                  </div>
                )}
              </>
            )}

            {!showOrderDescription && (
              <div className="h-full" />
            )}
          </div>

          {/* RIGHT — order list with gear icon */}
          <div className="w-full md:w-96 shrink-0 border-l border-gray-200 overflow-y-auto bg-white flex flex-col">
            <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between shrink-0">
              <span className="text-xs font-bold text-gray-900 uppercase tracking-widest flex items-center gap-2">
                Заказы
                <span className="w-2 h-2 rounded-full bg-green-400" />
              </span>
              <div className="flex items-center gap-1.5">
                {activeCount > 0 && (
                  <span className="text-xs text-yellow-700 font-bold bg-yellow-100 px-2 py-0.5 rounded-full">
                    {activeCount} акт.
                  </span>
                )}
                <span className="text-xs text-gray-900 bg-gray-100 px-2 py-0.5 rounded-full">
                  {allOrders.length}
                </span>
                {lastRefreshed && (
                  <span className="text-[10px] text-gray-900">
                    {lastRefreshed.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
                  </span>
                )}
                <button
                  onClick={() => setShowShiftModal(true)}
                  className="ml-1 text-gray-900 hover:text-gray-900 transition-colors text-base leading-none"
                  title="Управление сменой"
                >
                  ⚙️
                </button>
              </div>
            </div>

            {allOrders.length === 0 ? (
              <p className="text-gray-900 text-xs text-center py-8">Нет заказов</p>
            ) : (
              <div className="flex flex-col flex-1">
                {allOrders.map((order) => {
                  const isClosed = CLOSED_STATUSES.has(order.status);
                  const isActive = !isClosed;
                  const isNew = order.status === "new";
                  const isSelected = selectedId === order.id;
                  const createdAt = new Date(order.created_at);
                  return (
                    <button
                      key={order.id}
                      onClick={() => setSelectedId(order.id)}
                      className={`w-full text-left px-4 py-3 border-b border-gray-200 border-l-2 transition-all duration-200 ${
                        isClosed ? "opacity-45 hover:opacity-70" : "hover:bg-gray-50"
                      } ${
                        isActive ? "bg-emerald-50" : ""
                      } ${
                        isNew ? "bg-yellow-50 ring-1 ring-yellow-300" : ""
                      } ${
                        isSelected
                          ? `-translate-x-2 bg-blue-200 ring-2 ring-blue-400 shadow-md ${STATUS_LEFT_BORDER[order.status] ?? "border-l-gray-300"}`
                          : "border-l-transparent"
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div
                          className={`mt-0.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-full ${
                            order.type === "delivery"
                              ? "bg-blue-100 text-blue-600"
                              : "bg-green-100 text-green-600"
                          }`}
                        >
                          <OrderTypeIcon type={order.type} />
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex items-start justify-between gap-3 mb-1">
                            <div className="flex items-center gap-2 min-w-0">
                              <span
                                className={`w-2 h-2 rounded-full shrink-0 ${STATUS_DOT[order.status] ?? "bg-gray-400"} ${isNew ? "animate-pulse" : ""}`}
                              />
                              <span className={`font-mono font-bold text-[13px] truncate ${isClosed ? "text-gray-900" : "text-gray-900"}`}>
                                #{order.order_number}
                              </span>
                              {isSelected && (
                                <span className="inline-flex items-center rounded-full bg-blue-600 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
                                  ✓ Выбран
                                </span>
                              )}
                            </div>
                            <span className="text-right text-[10px] leading-tight text-gray-900 shrink-0">
                              {createdAt.toLocaleDateString("ru-RU", {
                                day: "2-digit",
                                month: "2-digit",
                              })}
                              <br />
                              {createdAt.toLocaleTimeString("ru-RU", {
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </span>
                          </div>

                          <p className={`mb-1 text-[15px] font-semibold truncate ${isClosed ? "text-gray-900" : "text-gray-900"}`}>
                            {order.customer_name}
                          </p>

                          <div className="flex items-center justify-between gap-3 text-[12px]">
                            <span className="text-gray-900">
                              {order.items.length} поз.
                            </span>
                            <span className={`font-bold ${isClosed ? "text-gray-900" : "text-gray-900"}`}>
                              {Number(order.total_amount).toFixed(2)} €
                            </span>
                          </div>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function OrderDetail({
  order,
  session,
  onUpdate,
  preparedItems,
  onTogglePrepared,
}: {
  order: Order;
  session: KitchenState | null;
  onUpdate: () => void;
  preparedItems: Record<string, boolean>;
  onTogglePrepared: (itemId: string) => void;
}) {
  const preparedByItem = preparedItems;
  const preparedCount = order.items.reduce((acc, item) => acc + (preparedByItem[item.id] ? 1 : 0), 0);
  const remainingCount = Math.max(0, order.items.length - preparedCount);

  return (
    <div className="max-w-2xl">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <p className="text-gray-900 font-black font-mono text-3xl mb-1">
            #{order.order_number}
          </p>
          <p className="text-gray-900 text-sm">
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
              ? "bg-yellow-100 text-yellow-700"
              : order.status === "confirmed_preparing"
                ? "bg-red-100 text-red-700"
                : order.status === "sent"
                  ? "bg-blue-100 text-blue-700"
                  : "bg-green-100 text-green-700"
          }`}
        >
          {STATUS_LABELS[order.status]}
        </span>
      </div>

      {/* Customer + payment */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <div className="card p-4">
          <h3 className="text-xs font-bold text-gray-900 uppercase tracking-widest mb-3">
            Клиент
          </h3>
          <p className="text-gray-900 font-semibold">{order.customer_name}</p>
          <p className="text-gray-900 text-sm">{order.customer_phone}</p>
          {order.type === "delivery" && order.address_line && (
            <p className="text-gray-900 text-sm mt-2">
              📍 {order.address_line}
              {order.apartment ? `, кв. ${order.apartment}` : ""}
              {order.entrance ? `, подъезд ${order.entrance}` : ""}
              {order.floor ? `, этаж ${order.floor}` : ""}
              {order.door_code ? `, код ${order.door_code}` : ""}
            </p>
          )}
        </div>

        <div className="card p-4">
          <h3 className="text-xs font-bold text-gray-900 uppercase tracking-widest mb-3">
            Оплата
          </h3>
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-900">Способ</span>
            <span className="text-gray-900">
              {PAYMENT_LABELS[order.payment_method] ?? order.payment_method}
            </span>
          </div>
          <div className="flex items-center justify-between text-sm mt-1.5">
            <span className="text-gray-900">Статус</span>
            <span
              className={
                order.payment_status === "paid"
                  ? "text-green-600 font-semibold"
                  : "text-amber-600"
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
            <div className="mt-3 px-3 py-2 rounded-lg bg-red-50 border border-red-200 text-xs text-gray-900">
              ⏱ Готов к:{" "}
              <span className="text-gray-900 font-semibold">
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
      </div>

      {/* Items */}
      <div className="card p-4 mb-4">
        <h3 className="text-xs font-bold text-gray-900 uppercase tracking-widest mb-3">
          Состав заказа
        </h3>
        <div className="space-y-3">
          {order.items.map((item) => {
            const imageSrc = resolveProductImageSrc(item.product?.image_url);
            const productCode = extractProductCode(item.product?.image_url);
            const piecesCount = extractPiecesCount(item.variant_name_snapshot, item.product?.pieces_total);
            const isPrepared = Boolean(preparedByItem[item.id]);
            return (
            <button
              key={item.id}
              type="button"
              onClick={() => onTogglePrepared(item.id)}
              className={`w-full text-left flex items-start justify-between gap-3 rounded-lg p-2 transition-colors ${
                isPrepared ? "bg-green-100" : "hover:bg-gray-50"
              }`}
            >
              <div className="flex items-start gap-3 min-w-0 flex-1">
                <div className="h-11 w-11 rounded-full overflow-hidden bg-gray-100 border border-gray-200 shrink-0 mt-0.5">
                  {imageSrc ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={imageSrc} alt={item.product_name_snapshot} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-[10px] text-gray-900">
                      🍣
                    </div>
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <p className={`font-semibold truncate ${isPrepared ? "text-green-700" : "text-gray-900"}`}>
                    x{item.quantity} - {productCode ? `#${productCode} ` : ""}{item.product_name_snapshot} · {piecesCount ?? "?"}шт.
                  </p>
                {item.variant_name_snapshot && (
                  <p className="text-gray-900 text-xs">{item.variant_name_snapshot}</p>
                )}
                {item.selections?.map((s) => (
                  <p key={s.id} className="text-gray-900 text-xs">
                    {s.option_group_name_snapshot}: {s.option_item_name_snapshot}
                  </p>
                ))}
                </div>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <p className="text-gray-900 text-sm font-bold">
                  {Number(item.line_total).toFixed(2)} €
                </p>
                <span
                  className={`h-5 w-5 rounded-md border flex items-center justify-center text-xs font-black transition-colors ${
                    isPrepared
                      ? "bg-green-500 border-green-400 text-white"
                      : "border-gray-300 text-transparent"
                  }`}
                >
                  ✓
                </span>
              </div>
            </button>
            );
          })}
        </div>

        <div className="mt-4 pt-3 border-t border-gray-200 space-y-1 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-900">Подытог</span>
            <span className="text-gray-900">{Number(order.subtotal_amount).toFixed(2)} €</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-900">Доставка</span>
            <span className="text-gray-900">{Number(order.delivery_fee).toFixed(2)} €</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-900">Скидка</span>
            <span className="text-green-600">−{Number(order.discount_amount).toFixed(2)} €</span>
          </div>
          <div className="flex justify-between font-bold pt-1 border-t border-gray-200">
            <span className="text-gray-900 text-base">Итого</span>
            <span className="text-brand-red text-lg">{Number(order.total_amount).toFixed(2)} €</span>
          </div>
        </div>
      </div>

      {/* Comment */}
      {order.comment && (
        <div className="card p-4 mb-4">
          <h3 className="text-xs font-bold text-gray-900 uppercase tracking-widest mb-2">
            Комментарий
          </h3>
          <p className="text-gray-900 text-sm">💬 {order.comment}</p>
        </div>
      )}

      {/* Actions */}
      <div className="card p-4">
        <h3 className="text-xs font-bold text-gray-900 uppercase tracking-widest mb-3">
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
