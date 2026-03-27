const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

// ───── Type Definitions ─────
export interface CategorySummary {
  id: string;
  slug: string;
  name_ru: string;
  name_en: string;
  name_et: string;
  is_active: boolean;
}

export interface Category extends CategorySummary {
  products?: Product[];  // Optional since list() doesn't always include it
}

export interface Product {
  id: string;
  slug: string;
  name_ru: string;
  name_en: string;
  name_et: string;
  description_ru?: string;
  description_en?: string;
  description_et?: string;
  image_url?: string;
  base_price: number;
  is_active?: boolean;
  is_available?: boolean;
  category?: CategorySummary;
  variants?: ProductVariant[];
}

export interface ProductVariant {
  id: string;
  name_ru: string;
  price: number;
  is_default: boolean;
}

export interface Banner {
  id: string;
  title_ru: string;
  title_en: string;
  image_url?: string;
  link_url?: string;
}

export interface Order {
  id: string;
  order_number: string;
  tracking_token: string;
  type: "delivery" | "pickup";
  status: string;
  payment_method: string;
  payment_status: string;
  customer_name: string;
  customer_phone: string;
  language_code: string;
  address_line?: string;
  apartment?: string;
  entrance?: string;
  floor?: string;
  door_code?: string;
  comment?: string;
  promo_code?: {
    code: string;
  };
  subtotal_amount: number;
  delivery_fee: number;
  discount_amount: number;
  total_amount: number;
  created_at: string;
  confirmed_at?: string;
  ready_at?: string;
  sent_at?: string;
  completed_at?: string;
  cancelled_at?: string;
  items: Array<{
    id: string;
    product_name_snapshot: string;
    variant_name_snapshot?: string;
    quantity: number;
    line_total: number;
    selections?: Array<{
      id: string;
      option_group_name_snapshot: string;
      option_item_name_snapshot: string;
      price_delta: number;
    }>;
  }>;
}

export interface AdminOrdersListResponse {
  orders: Order[];
  total: number;
  page: number;
  limit: number;
}

export interface AdminLoginRequest {
  email: string;
  password: string;
}

export interface AdminAuthResponse {
  ok: boolean;
  data: {
    id: string;
    email: string;
    role: "admin" | "kitchen";
  };
}

export async function fetchApi<T>(path: string, options?: RequestInit): Promise<T> {
  const url = `${API_BASE}${path.startsWith('/') ? path : '/' + path}`;
  
  const res = await fetch(url, {
    ...options,
    // Prevent stale static caching in Next.js server components for storefront data.
    cache: options?.cache ?? "no-store",
    credentials: 'include', // 🍪 Automatically send cookies with every request
    headers: {
      "Content-Type": "application/json",
      ...(options?.headers || {}),
    },
  });

  if (!res.ok) {
    throw new Error(`API error: ${res.status} ${res.statusText}`);
  }

  const data = await res.json();
  if (data.ok === false) { // ✅ Only check 'ok' field (backend always uses it)
    throw new Error(data.error || data.message || "Unknown API error");
  }

  return data.data;
}

// ─── API Wrapper Functions ───

export const AppApi = {
  categories: {
    list: (includeProducts?: boolean) => {
      const url = `/api/categories${includeProducts ? "?includeProducts=true" : ""}`;
      return fetchApi<Category[]>(url);  // Always returns Category[] (includes products if flag is set)
    },
    getBySlug: (slug: string) => fetchApi<Category>(`/api/categories/${slug}`),
  },
  products: {
    list: (params?: { category?: string; search?: string; limit?: number }) => {
      const qs = new URLSearchParams();
      if (params?.category) qs.set("category", params.category);
      if (params?.search) qs.set("search", params.search);
      if (params?.limit) qs.set("limit", params.limit.toString());
      return fetchApi<Product[]>(`/api/products?${qs.toString()}`);
    },
    getBySlug: (slug: string) => fetchApi<Product>(`/api/products/${slug}`),
  },
  banners: {
    list: () => fetchApi<Banner[]>("/api/banners"),
  },
  orders: {
    track: (token: string) => fetchApi<Order>(`/api/orders/track/${token}`),
  },
  admin: {
    auth: {
      login: (credentials: AdminLoginRequest) => fetchApi<AdminAuthResponse>("/api/admin/auth/login", { method: "POST", body: JSON.stringify(credentials) }),
    },
    stats: () => fetchApi<any>("/api/admin/stats"),
    orders: {
      list: (params: Record<string, any> = {}) => {
        const qs = new URLSearchParams();
        Object.entries(params).forEach(([k, v]) => { if (v) qs.set(k, String(v)); });
        return fetchApi<AdminOrdersListResponse>(`/api/admin/orders?${qs.toString()}`);
      },
      get: (id: string) => fetchApi<Order>(`/api/admin/orders/${id}`)
    },
    banners: {
      list: () => fetchApi<Banner[]>("/api/admin/banners"),
    },
    categories: {
      list: () => fetchApi<Category[]>("/api/admin/categories"),
    },
    deliveryZones: {
      list: () => fetchApi<any[]>("/api/admin/delivery-zones"),
    },
    products: {
      list: () => fetchApi<Product[]>("/api/admin/products"),
    },
    settings: {
      get: () => fetchApi<any>("/api/admin/settings"),
    },
    promoCodes: {
      list: () => fetchApi<any[]>("/api/admin/promo-codes"),
    }
  }
};
