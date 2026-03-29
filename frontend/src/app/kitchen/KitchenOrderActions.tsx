"use client";

import { useState } from "react";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "";
const PREP_PRESETS = [10, 20, 30, 40, 50, 60, 70, 80, 90];

interface Props {
  orderId: string;
  currentStatus: string;
  orderType: string;
  paymentMethod: string;
  defaultPrepMinutes: number;
  onUpdate: () => void;
  onClose?: () => void;
}

export default function KitchenOrderActions({
  orderId,
  currentStatus,
  orderType,
  paymentMethod,
  defaultPrepMinutes,
  onUpdate,
  onClose,
}: Props) {
  const [loading, setLoading] = useState(false);
  const [showPrepInput, setShowPrepInput] = useState(false);
  const [gridBlocked, setGridBlocked] = useState(false);
  const [prepMinutes, setPrepMinutes] = useState(String(defaultPrepMinutes));
  const [pendingMinutes, setPendingMinutes] = useState<number | null>(null);

  function openGrid() {
    setShowPrepInput(true);
    setGridBlocked(true);
    setTimeout(() => setGridBlocked(false), 450);
  }

  async function changeStatus(status: string, extraBody?: Record<string, unknown>) {
    setLoading(true);
    try {
      await fetch(`${API_BASE}/api/admin/orders/${orderId}/status`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status, ...extraBody }),
      });
      onUpdate();
    } finally {
      setLoading(false);
    }
  }

  async function deleteOrder() {
    if (!confirm("Удалить заказ? Это действие нельзя отменить.")) return;
    setLoading(true);
    try {
      await fetch(`${API_BASE}/api/admin/orders/${orderId}`, {
        method: "DELETE",
        credentials: "include",
      });
      onUpdate();
    } finally {
      setLoading(false);
    }
  }

  async function handleAcceptWithTime(minutes: number) {
    setLoading(true);
    try {
      await fetch(`${API_BASE}/api/admin/orders/${orderId}/status`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "confirmed_preparing", estimated_prep_minutes: minutes }),
      });
      onUpdate();
    } finally {
      setLoading(false);
    }
    setShowPrepInput(false);
  }

  function handleManualAccept() {
    const minutes = parseInt(prepMinutes, 10);
    if (!minutes || minutes < 1) return;
    setPendingMinutes(minutes);
  }

  async function handleComplete() {
    await changeStatus("completed");
    onClose?.();
  }

  const canDelete = paymentMethod !== "stripe";
  const isActive = ["confirmed_preparing", "ready", "sent"].includes(currentStatus);

  return (
    <div className="space-y-3">
      {/* new → показать кнопку Принять или пресеты времени */}
      {currentStatus === "new" && (
        <>
          {showPrepInput ? (
            <div className="space-y-3">
              {/* Большие квадратики с временем */}
              <div className="grid grid-cols-5 gap-2">
                {PREP_PRESETS.map((min) => (
                  <button
                    key={min}
                    onClick={() => !gridBlocked && setPendingMinutes(min)}
                    disabled={loading || gridBlocked}
                    className="aspect-square flex items-center justify-center rounded-xl bg-white border-2 border-gray-300 text-gray-900 text-xl font-bold hover:bg-blue-600 hover:border-blue-600 hover:text-white active:scale-95 transition-all"
                  >
                    {min}
                  </button>
                ))}
              </div>
              {/* Ручной ввод */}
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  value={prepMinutes}
                  onChange={(e) => setPrepMinutes(e.target.value)}
                  className="input flex-1 py-2 text-sm text-center"
                  min={1}
                  max={240}
                  placeholder="мин"
                />
                <button
                  onClick={handleManualAccept}
                  disabled={loading}
                  className="btn-primary text-sm py-2 px-4"
                >
                  ОК
                </button>
                <button
                  onClick={() => setShowPrepInput(false)}
                  disabled={loading}
                  className="btn-secondary text-sm py-2 px-3"
                >
                  ✕
                </button>
              </div>
            </div>
          ) : (
            <div className="flex gap-2">
              <button
                onClick={openGrid}
                disabled={loading}
                className="btn-primary flex-1 text-sm py-2.5"
              >
                Принять
              </button>
              <button
                onClick={() => changeStatus("cancelled")}
                disabled={loading}
                className="btn-secondary text-sm py-2.5 px-3"
              >
                ✕
              </button>
            </div>
          )}
        </>
      )}

      {/* confirmed_preparing / ready / sent → Готово! (закрывает заказ) */}
      {isActive && (
        <button
          onClick={handleComplete}
          disabled={loading}
          className="btn-primary w-full text-sm py-2.5"
        >
          🔔 Готово!
        </button>
      )}

      {/* Удалить — только не-Stripe */}
      {canDelete && (
        <button
          onClick={deleteOrder}
          disabled={loading}
          className="w-full text-xs py-1.5 rounded-lg text-red-500 hover:text-red-700 hover:bg-red-50 transition-colors"
        >
          Удалить заказ
        </button>
      )}

      {/* Модальное подтверждение времени */}
      {pendingMinutes !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setPendingMinutes(null)}>
          <div
            className="bg-white rounded-2xl shadow-2xl p-8 flex flex-col items-center gap-6 min-w-[260px]"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="text-2xl font-black text-gray-900 text-center">
              Время готовки — {pendingMinutes} мин
            </p>
            <div className="flex gap-3 w-full">
              <button
                onClick={() => { setPendingMinutes(null); handleAcceptWithTime(pendingMinutes); }}
                disabled={loading}
                className="btn-primary flex-1 py-3 text-base"
              >
                Подтвердить
              </button>
              <button
                onClick={() => setPendingMinutes(null)}
                disabled={loading}
                className="btn-secondary flex-1 py-3 text-base"
              >
                Отмена
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

