"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const NEXT_STATUS: Record<string, { status: string; label: string; color: string }[]> = {
  new: [
    { status: "confirmed_preparing", label: "✅ Принять и готовить", color: "btn-primary" },
    { status: "cancelled", label: "✕ Отменить", color: "btn-secondary" },
  ],
  confirmed_preparing: [
    { status: "ready", label: "🔔 Готово!", color: "btn-primary" },
    { status: "cancelled", label: "✕ Отменить", color: "btn-secondary" },
  ],
  ready: [
    { status: "sent", label: "🚚 Отправлен", color: "btn-primary" },
    { status: "completed", label: "✅ Выдан", color: "btn-primary" },
  ],
};

const DELIVERY_NEXT: Record<string, { status: string; label: string; color: string }[]> = {
  ...NEXT_STATUS,
  ready: [{ status: "sent", label: "🚚 Передать курьеру", color: "btn-primary" }],
};

const PICKUP_NEXT: Record<string, { status: string; label: string; color: string }[]> = {
  ...NEXT_STATUS,
  ready: [{ status: "completed", label: "✅ Выдан клиенту", color: "btn-primary" }],
};

interface Props {
  orderId: string;
  currentStatus: string;
  orderType: string;
}

export default function KitchenOrderActions({ orderId, currentStatus, orderType }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const actions = (orderType === "delivery" ? DELIVERY_NEXT : PICKUP_NEXT)[currentStatus] ?? [];

  async function changeStatus(status: string) {
    setLoading(true);
    try {
      await fetch(`${process.env.NEXT_PUBLIC_API_URL || ""}/api/admin/orders/${orderId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  if (actions.length === 0) return null;

  return (
    <div className="flex gap-2 flex-wrap">
      {actions.map((a) => (
        <button
          key={a.status}
          onClick={() => changeStatus(a.status)}
          disabled={loading}
          className={`${a.color} flex-1 text-sm py-2.5`}
        >
          {a.label}
        </button>
      ))}
    </div>
  );
}
