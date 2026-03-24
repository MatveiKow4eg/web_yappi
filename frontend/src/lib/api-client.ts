const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

export async function fetchApi<T>(path: string, options?: RequestInit): Promise<T> {
  const url = `${API_BASE}${path.startsWith('/') ? path : '/' + path}`;
  
  const res = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options?.headers || {}),
    },
    // For Vercel, we can add next: { revalidate: 60 } or cache: 'no-store' depending on use case.
    // For now we use the default or what is passed.
  });

  if (!res.ok) {
    throw new Error(`API error: ${res.status} ${res.statusText}`);
  }

  const data = await res.json();
  if (!data.success) {
    throw new Error(data.error || "Unknown API error");
  }

  return data.data;
}

// ─── API Wrapper Functions ───

export const AppApi = {
  categories: {
    list: (includeProducts = false) => 
      fetchApi<any[]>(`/api/categories${includeProducts ? "?includeProducts=true" : ""}`),
    getBySlug: (slug: string) => fetchApi<any>(`/api/categories/${slug}`),
  },
  products: {
    list: (params?: { category?: string; search?: string; limit?: number }) => {
      const qs = new URLSearchParams();
      if (params?.category) qs.set("category", params.category);
      if (params?.search) qs.set("search", params.search);
      if (params?.limit) qs.set("limit", params.limit.toString());
      return fetchApi<any[]>(`/api/products?${qs.toString()}`);
    },
    getBySlug: (slug: string) => fetchApi<any>(`/api/products/${slug}`),
  },
  banners: {
    list: () => fetchApi<any[]>("/api/banners"),
  },
  orders: {
    track: (token: string) => fetchApi<any>(`/api/orders/track/${token}`),
  },
  admin: {
    auth: {
      login: (credentials: any) => fetchApi<any>("/api/admin/auth/login", { method: "POST", body: JSON.stringify(credentials) }),
    },
    stats: (token?: string) => fetchApi<any>("/api/admin/stats", { headers: token ? { Cookie: `admin_token=${token}` } : {} }),
    orders: {
      list: (params: any, token?: string) => {
        const qs = new URLSearchParams();
        Object.entries(params).forEach(([k, v]) => { if (v) qs.set(k, String(v)); });
        return fetchApi<any>(`/api/admin/orders?${qs.toString()}`, { headers: token ? { Cookie: `admin_token=${token}` } : {} });
      },
      get: (id: string, token?: string) => fetchApi<any>(`/api/admin/orders/${id}`, { headers: token ? { Cookie: `admin_token=${token}` } : {} })
    },
    banners: {
      list: (token?: string) => fetchApi<any[]>("/api/admin/banners", { headers: token ? { Cookie: `admin_token=${token}` } : {} }),
    },
    categories: {
      list: (token?: string) => fetchApi<any[]>("/api/admin/categories", { headers: token ? { Cookie: `admin_token=${token}` } : {} }),
    },
    deliveryZones: {
      list: (token?: string) => fetchApi<any[]>("/api/admin/delivery-zones", { headers: token ? { Cookie: `admin_token=${token}` } : {} }),
    },
    products: {
      list: (token?: string) => fetchApi<any[]>("/api/admin/products", { headers: token ? { Cookie: `admin_token=${token}` } : {} }),
    },
    settings: {
      get: (token?: string) => fetchApi<any>("/api/admin/settings", { headers: token ? { Cookie: `admin_token=${token}` } : {} }),
    },
    promoCodes: {
      list: (token?: string) => fetchApi<any[]>("/api/admin/promo-codes", { headers: token ? { Cookie: `admin_token=${token}` } : {} }),
    }
  }
};
