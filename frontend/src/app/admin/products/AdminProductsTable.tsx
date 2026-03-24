"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import HideOnErrorImage from "@/components/ui/HideOnErrorImage";
import { resolveProductImageSrc } from "@/lib/utils";

type ProductRow = {
  id: string;
  slug: string;
  name_ru: string;
  image_url?: string | null;
  base_price: number | string;
  old_price?: number | string | null;
  is_active?: boolean;
  is_hidden?: boolean;
  is_available?: boolean;
  category?: {
    name_ru?: string;
  };
};

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "";

export default function AdminProductsTable() {
  const [products, setProducts] = useState<ProductRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function loadProducts() {
      setLoading(true);
      setError(null);

      try {
        const res = await fetch(`${API_BASE}/api/admin/products`, {
          method: "GET",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
        });

        const data = await res.json();
        if (!res.ok || data?.ok === false) {
          throw new Error(data?.error || "Не удалось загрузить товары");
        }

        const rows = Array.isArray(data?.data?.products)
          ? data.data.products
          : Array.isArray(data?.data)
            ? data.data
            : [];

        if (active) setProducts(rows);
      } catch (e) {
        if (active) {
          setError(e instanceof Error ? e.message : "Не удалось загрузить товары");
          setProducts([]);
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    loadProducts();

    return () => {
      active = false;
    };
  }, []);

  return (
    <>
      {error && (
        <div className="py-3 px-4 rounded-xl bg-brand-red/10 border border-brand-red/20 text-brand-red text-sm mb-4">
          {error}
        </div>
      )}

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/5 text-brand-text-muted text-xs">
                <th className="px-4 py-3 text-left font-medium w-16">Фото</th>
                <th className="px-4 py-3 text-left font-medium">Название</th>
                <th className="px-4 py-3 text-left font-medium">Категория</th>
                <th className="px-4 py-3 text-right font-medium">Цена</th>
                <th className="px-4 py-3 text-center font-medium">Статус</th>
                <th className="px-4 py-3 text-center font-medium">Наличие</th>
                <th className="px-4 py-3 text-right font-medium">Действия</th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-center text-brand-text-muted">
                    Загрузка товаров...
                  </td>
                </tr>
              )}

              {!loading &&
                products.map((p) => (
                  <tr
                    key={p.id}
                    className="border-b border-white/5 hover:bg-brand-gray-mid/50 transition-colors"
                  >
                    <td className="px-4 py-3">
                      <div className="w-10 h-10 rounded-lg bg-brand-gray-mid overflow-hidden flex items-center justify-center text-lg relative">
                        <span className="absolute inset-0 flex items-center justify-center">🍱</span>
                        <HideOnErrorImage
                          src={resolveProductImageSrc(p.image_url) ?? ""}
                          alt={p.name_ru}
                          className="absolute inset-0 w-full h-full object-cover"
                        />
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-white font-medium">{p.name_ru}</p>
                      <p className="text-brand-text-muted text-xs font-mono">{p.slug}</p>
                    </td>
                    <td className="px-4 py-3 text-brand-text-muted">{p.category?.name_ru ?? "—"}</td>
                    <td className="px-4 py-3 text-right">
                      <span className="text-white font-bold">
                        {parseFloat(p.base_price.toString()).toFixed(2)} €
                      </span>
                      {p.old_price && (
                        <span className="text-brand-text-muted line-through text-xs ml-1">
                          {parseFloat(p.old_price.toString()).toFixed(2)} €
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {p.is_active && !p.is_hidden ? (
                        <span className="badge-green">Активен</span>
                      ) : p.is_hidden ? (
                        <span className="badge-gray">Скрыт</span>
                      ) : (
                        <span className="badge-gray">Неактивен</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {p.is_available ? (
                        <span className="badge-green">В наличии</span>
                      ) : (
                        <span className="badge-red">Стоп-лист</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link
                        href={`/admin/products/${p.id}/edit`}
                        className="text-brand-text-muted hover:text-white text-xs transition-colors"
                      >
                        Редактировать
                      </Link>
                    </td>
                  </tr>
                ))}

              {!loading && products.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-brand-text-muted">
                    Товаров нет. Добавьте первый товар.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
