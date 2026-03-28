"use client";

import { useState } from "react";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "";

interface Props {
  orderId: string;
  currentStatus: string;
  orderType: string;
  paymentMethod: string;
  defaultPrepMinutes: number;
  onUpdate: () => void;
}

export default function KitchenOrderActions({
  orderId,
  currentStatus,
  orderType,
  paymentMethod,
  defaultPrepMinutes,
  onUpdate,
}: Props) {
  const [loading, setLoading] = useState(false);
  const [showPrepInput, setShowPrepInput] = useState(false);
  const [prepMinutes, setPrepMinutes] = useState(String(defaultPrepMinutes));

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

  function handleAccept() {
    const minutes = parseInt(prepMinutes, 10);
    changeStatus("confirmed_preparing", { estimated_prep_minutes: minutes || defaultPrepMinutes });
    setShowPrepInput(false);
  }

  const canDelete = paymentMethod !== "stripe";

  return (
    <div className="space-y-2">
      {/* Accept with prep time — new orders */}
      {currentStatus === "new" && (
        <>
          {showPrepInput ? (
            <div className="flex items-center gap-2">
              <input
                type="number"
                value={prepMinutes}
                onChange={(e) => setPrepMinutes(e.target.value)}
                className="input w-20 py-1.5 text-sm text-center"
                min={1}
                max={240}
              />
              <span className="text-brand-text-muted text-xs shrink-0">мин</span>
              <button
                onClick={handleAccept}
                disabled={loading}
                className="btn-primary flex-1 text-sm py-2"
              >
                ✅ Принять
              </button>
              <button
                onClick={() => setShowPrepInput(false)}
                disabled={loading}
                className="btn-secondary text-sm py-2 px-3"
              >
                ✕
              </button>
            </div>
          ) : (
            <div className="flex gap-2">
              <button
                onClick={() => setShowPrepInput(true)}
                disabled={loading}
                className="btn-primary flex-1 text-sm py-2.5"
              >
                ✅ Принять
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

      {/* Confirmed → ready */}
      {currentStatus === "confirmed_preparing" && (
        <div className="flex gap-2">
          <button
            onClick={() => changeStatus("ready")}
            disabled={loading}
            className="btn-primary flex-1 text-sm py-2.5"
          >
            🔔 Готово!
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

      {/* Ready → sent (delivery) or completed (pickup) */}
      {currentStatus === "ready" && orderType === "delivery" && (
        <div className="flex gap-2">
          <button
            onClick={() => changeStatus("sent")}
            disabled={loading}
            className="btn-primary flex-1 text-sm py-2.5"
          >
            🚚 Передать курьеру
          </button>
          <button
            onClick={() => changeStatus("completed")}
            disabled={loading}
            className="btn-secondary text-sm py-2.5 px-3"
          >
            ✅
          </button>
        </div>
      )}
      {currentStatus === "ready" && orderType === "pickup" && (
        <button
          onClick={() => changeStatus("completed")}
          disabled={loading}
          className="btn-primary w-full text-sm py-2.5"
        >
          ✅ Выдан клиенту
        </button>
      )}

      {/* Sent → completed (pickup only — delivery is confirmed by customer) */}
      {currentStatus === "sent" && orderType !== "delivery" && (
        <button
          onClick={() => changeStatus("completed")}
          disabled={loading}
          className="btn-primary w-full text-sm py-2.5"
        >
          ✅ Закрыть заказ
        </button>
      )}
      {currentStatus === "sent" && orderType === "delivery" && (
        <div className="py-2 px-3 rounded-xl bg-green-500/10 border border-green-500/20 text-green-400 text-xs text-center">
          Заказ передан курьеру. Ждём подтверждения клиента.
        </div>
      )}

      {/* Delete button — non-Stripe only */}
      {canDelete && (
        <button
          onClick={deleteOrder}
          disabled={loading}
          className="w-full text-xs py-1.5 rounded-lg text-red-400/60 hover:text-red-400 hover:bg-red-500/10 transition-colors"
        >
          Удалить заказ
        </button>
      )}
    </div>
  );
}

