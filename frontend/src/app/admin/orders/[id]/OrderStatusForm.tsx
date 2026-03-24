"use client";

import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";

const STATUSES = [
  { value: "new", label: "Новый" },
  { value: "confirmed_preparing", label: "Подтверждён / Готовится" },
  { value: "ready", label: "Готов к выдаче" },
  { value: "sent", label: "Отправлен курьером" },
  { value: "completed", label: "Выполнен" },
  { value: "cancelled", label: "Отменён" },
];

interface Props {
  orderId: string;
  currentStatus: string;
}

export default function OrderStatusForm({ orderId, currentStatus }: Props) {
  const router = useRouter();
  const [status, setStatus] = useState(currentStatus);
  const [cancelReason, setCancelReason] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(false);
    setLoading(true);

    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || ""}/api/admin/orders/${orderId}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status,
          cancel_reason: status === "cancelled" ? cancelReason : undefined,
        }),
      });

      const data = await res.json();
      if (!data.ok) {
        setError(data.error ?? "Ошибка обновления статуса");
      } else {
        setSuccess(true);
        router.refresh();
      }
    } catch {
      setError("Ошибка соединения");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div>
        <label className="block text-xs text-brand-text-muted mb-1.5">Статус</label>
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="input text-sm"
        >
          {STATUSES.map((s) => (
            <option key={s.value} value={s.value} className="bg-brand-gray-dark">
              {s.label}
            </option>
          ))}
        </select>
      </div>

      {status === "cancelled" && (
        <div>
          <label className="block text-xs text-brand-text-muted mb-1.5">Причина отмены</label>
          <input
            type="text"
            value={cancelReason}
            onChange={(e) => setCancelReason(e.target.value)}
            className="input text-sm"
            placeholder="Не указана"
          />
        </div>
      )}

      {error && (
        <div className="py-2 px-3 rounded-lg bg-brand-red/10 border border-brand-red/20 text-brand-red text-xs">
          {error}
        </div>
      )}
      {success && (
        <div className="py-2 px-3 rounded-lg bg-green-900/20 border border-green-800/30 text-green-400 text-xs">
          Статус обновлён ✓
        </div>
      )}

      <button
        type="submit"
        disabled={loading || status === currentStatus}
        className="btn-primary w-full py-2.5 text-sm"
      >
        {loading ? "Сохраняем..." : "Обновить статус"}
      </button>
    </form>
  );
}
