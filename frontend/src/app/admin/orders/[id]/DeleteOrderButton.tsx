"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface Props {
  orderId: string;
  orderNumber: string;
}

export default function DeleteOrderButton({ orderId, orderNumber }: Props) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleDelete() {
    setError(null);
    setLoading(true);
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || ""}/api/admin/orders/${orderId}`,
        { method: "DELETE", credentials: "include" }
      );
      const data = await res.json();
      if (!data.ok) {
        setError(data.error ?? "Ошибка удаления");
        setConfirming(false);
      } else {
        router.push("/admin/orders");
        router.refresh();
      }
    } catch {
      setError("Ошибка соединения");
      setConfirming(false);
    } finally {
      setLoading(false);
    }
  }

  if (confirming) {
    return (
      <div className="mt-6 pt-6 border-t border-white/5">
        <p className="text-sm text-white mb-3">
          Удалить заказ <span className="font-mono font-bold">{orderNumber}</span> из базы данных?
          Это действие необратимо.
        </p>
        {error && <p className="text-red-400 text-xs mb-3">{error}</p>}
        <div className="flex gap-2">
          <button
            onClick={handleDelete}
            disabled={loading}
            className="bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white text-xs font-bold px-4 py-2 rounded-lg transition-colors"
          >
            {loading ? "Удаляю…" : "Да, удалить"}
          </button>
          <button
            onClick={() => { setConfirming(false); setError(null); }}
            disabled={loading}
            className="btn-secondary px-4 py-2 text-xs"
          >
            Отмена
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="mt-6 pt-6 border-t border-white/5">
      {error && <p className="text-red-400 text-xs mb-2">{error}</p>}
      <button
        onClick={() => setConfirming(true)}
        className="text-red-400 hover:text-red-300 text-xs transition-colors"
      >
        Удалить заказ из БД
      </button>
    </div>
  );
}
