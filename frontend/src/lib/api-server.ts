/**
 * Server-only API helpers for Next.js App Router Server Components.
 * Automatically forwards the admin_token cookie from the incoming request
 * to the backend, which is required because credentials:'include' has no
 * effect in a Node.js / server-side fetch context.
 */
import { cookies } from "next/headers";
import type { AdminOrdersListResponse, Order, Banner } from "./api-client";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

async function fetchServer<T>(path: string, options?: RequestInit): Promise<T> {
  const cookieStore = cookies();
  const adminToken = cookieStore.get("admin_token")?.value;

  const url = `${API_BASE}${path.startsWith("/") ? path : "/" + path}`;
  const hasBody = options?.body !== undefined;
  const headers: Record<string, string> = {
    ...(options?.headers as Record<string, string> || {}),
    ...(hasBody ? { "Content-Type": "application/json" } : {}),
    ...(adminToken ? { Cookie: `admin_token=${adminToken}` } : {}),
  };

  const res = await fetch(url, {
    ...options,
    cache: options?.cache ?? "no-store",
    headers,
  });

  if (!res.ok) {
    throw new Error(`API error: ${res.status} ${res.statusText}`);
  }

  const data = await res.json();
  if (data.ok === false) {
    throw new Error(data.error || data.message || "Unknown API error");
  }

  return data.data;
}

export const AdminApi = {
  stats: () =>
    fetchServer<{ totalOrders: number; todayOrders: number; pendingOrders: number }>(
      "/api/admin/stats"
    ),
  shifts: () =>
    fetchServer<Array<{ date: string; count: number; total: number }>>(
      "/api/admin/shifts"
    ),
  orders: {
    list: (params: Record<string, any> = {}) => {
      const qs = new URLSearchParams();
      Object.entries(params).forEach(([k, v]) => {
        if (v !== undefined && v !== null && v !== "") qs.set(k, String(v));
      });
      return fetchServer<AdminOrdersListResponse>(`/api/admin/orders?${qs.toString()}`);
    },
    get: (id: string) => fetchServer<Order>(`/api/admin/orders/${id}`),
  },
  banners: {
    list: () => fetchServer<Banner[]>("/api/admin/banners"),
  },
  promoCodes: {
    list: () => fetchServer<any[]>("/api/admin/promo-codes"),
  },
  deliveryZones: {
    list: () => fetchServer<any[]>("/api/admin/delivery-zones"),
  },
};
