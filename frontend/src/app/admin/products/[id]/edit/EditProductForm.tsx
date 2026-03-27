"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type Category = {
  id: string;
  name_ru: string;
};

type ProductPayload = {
  category_id: string;
  slug: string;
  name_ru: string;
  name_en: string;
  name_et: string;
  description_ru: string;
  description_en: string;
  description_et: string;
  base_price: string;
  image_url: string;
  is_available: boolean;
  is_active: boolean;
  pieces_total: string;
  variant1_pieces: string;
  variant1_price: string;
  variant2_pieces: string;
  variant2_price: string;
};

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "";

function generateSlug(name: string) {
  return name
    .toLowerCase()
    .replace(/[а-яёa-z]/gi, (match) => {
      const map: Record<string, string> = {
        а: "a", б: "b", в: "v", г: "g", д: "d", е: "e", ё: "yo", ж: "zh",
        з: "z", и: "i", й: "y", к: "k", л: "l", м: "m", н: "n", о: "o",
        п: "p", р: "r", с: "s", т: "t", у: "u", ф: "f", х: "kh", ц: "ts",
        ч: "ch", ш: "sh", щ: "sch", ъ: "", ы: "y", ь: "", э: "e", ю: "yu", я: "ya",
      };
      return map[match] ?? match;
    })
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export default function EditProductForm({ productId }: { productId: string }) {
  const router = useRouter();
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState<ProductPayload>({
    category_id: "",
    slug: "",
    name_ru: "",
    name_en: "",
    name_et: "",
    description_ru: "",
    description_en: "",
    description_et: "",
    base_price: "",
    image_url: "",
    is_available: true,
    is_active: true,
    pieces_total: "",
    variant1_pieces: "",
    variant1_price: "",
    variant2_pieces: "",
    variant2_price: "",
  });

  useEffect(() => {
    let active = true;

    async function load() {
      setLoading(true);
      setError(null);

      try {
        const [categoriesRes, productRes] = await Promise.all([
          fetch(`${API_BASE}/api/admin/categories`, {
            method: "GET",
            credentials: "include",
            headers: { "Content-Type": "application/json" },
          }),
          fetch(`${API_BASE}/api/admin/products/${productId}`, {
            method: "GET",
            credentials: "include",
            headers: { "Content-Type": "application/json" },
          }),
        ]);

        const categoriesData = await categoriesRes.json();
        const productData = await productRes.json();

        if (!categoriesRes.ok || categoriesData?.ok === false) {
          throw new Error(categoriesData?.error || "Не удалось загрузить категории");
        }
        if (!productRes.ok || productData?.ok === false) {
          throw new Error(productData?.error || "Не удалось загрузить товар");
        }

        if (!active) return;

        const categoriesList: Category[] = Array.isArray(categoriesData?.data) ? categoriesData.data : [];
        const product = productData?.data;

        setCategories(categoriesList);
        setForm({
          category_id: product?.category_id || categoriesList[0]?.id || "",
          slug: product?.slug || "",
          name_ru: product?.name_ru || "",
          name_en: product?.name_en || "",
          name_et: product?.name_et || "",
          description_ru: product?.description_ru || "",
          description_en: product?.description_en || "",
          description_et: product?.description_et || "",
          base_price: product?.base_price?.toString?.() || "",
          image_url: product?.image_url || "",
          is_available: Boolean(product?.is_available),
          is_active: Boolean(product?.is_active),
          pieces_total: product?.pieces_total?.toString?.() || "",
          variant1_pieces: product?.variant1_pieces?.toString?.() || "",
          variant1_price: product?.variant1_price?.toString?.() || "",
          variant2_pieces: product?.variant2_pieces?.toString?.() || "",
          variant2_price: product?.variant2_price?.toString?.() || "",
        });
      } catch (e) {
        if (active) setError(e instanceof Error ? e.message : "Ошибка загрузки");
      } finally {
        if (active) setLoading(false);
      }
    }

    load();
    return () => {
      active = false;
    };
  }, [productId]);

  function handleChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) {
    const { name, value, type } = e.target;
    const checked = type === "checkbox" ? (e.target as HTMLInputElement).checked : undefined;
    const newVal = type === "checkbox" ? checked : value;

    setForm((prev) => {
      const next = { ...prev, [name]: newVal } as ProductPayload;

      const bp = parseFloat(next.base_price);
      const total = parseInt(next.pieces_total);

      if (["base_price", "pieces_total", "variant1_pieces", "variant2_pieces"].includes(name)) {
        const v1 = parseInt(next.variant1_pieces);
        if (!isNaN(bp) && !isNaN(total) && total > 0 && !isNaN(v1) && v1 > 0) {
          next.variant1_price = ((bp * v1) / total).toFixed(2);
        }
        const v2 = parseInt(next.variant2_pieces);
        if (!isNaN(bp) && !isNaN(total) && total > 0 && !isNaN(v2) && v2 > 0) {
          next.variant2_price = ((bp * v2) / total).toFixed(2);
        }
      }

      return next;
    });
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSaving(true);

    try {
      const res = await fetch(`${API_BASE}/api/admin/products/${productId}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          base_price: parseFloat(form.base_price),
          pieces_total: form.pieces_total ? parseInt(form.pieces_total) : undefined,
          variant1_pieces: form.variant1_pieces ? parseInt(form.variant1_pieces) : undefined,
          variant1_price: form.variant1_price ? parseFloat(form.variant1_price) : undefined,
          variant2_pieces: form.variant2_pieces ? parseInt(form.variant2_pieces) : undefined,
          variant2_price: form.variant2_price ? parseFloat(form.variant2_price) : undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok || data?.ok === false) {
        setError(data?.error ?? "Ошибка сохранения товара");
      } else {
        router.push("/admin/products");
        router.refresh();
      }
    } catch {
      setError("Ошибка соединения");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <div className="card p-6 text-brand-text-muted">Загрузка товара...</div>;
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="card p-6">
        <h2 className="font-bold text-white mb-4">Основная информация</h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm text-brand-text-muted mb-1.5">Категория *</label>
            <select
              name="category_id"
              value={form.category_id}
              onChange={handleChange}
              className="input"
              required
            >
              {categories.map((c) => (
                <option key={c.id} value={c.id} className="bg-brand-gray-dark">
                  {c.name_ru}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-brand-text-muted mb-1.5">Название (RU) *</label>
              <input
                type="text"
                name="name_ru"
                value={form.name_ru}
                onChange={(e) => {
                  handleChange(e);
                  if (!form.slug) {
                    setForm((prev) => ({ ...prev, slug: generateSlug(e.target.value) }));
                  }
                }}
                className="input"
                required
              />
            </div>
            <div>
              <label className="block text-sm text-brand-text-muted mb-1.5">Slug *</label>
              <input
                type="text"
                name="slug"
                value={form.slug}
                onChange={handleChange}
                className="input font-mono text-sm"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm text-brand-text-muted mb-1.5">Номер позиции</label>
            <input
              type="text"
              name="image_url"
              value={form.image_url}
              onChange={handleChange}
              className="input"
              placeholder="# 123"
            />
          </div>

          <div>
            <label className="block text-sm text-brand-text-muted mb-1.5">Название (ET)</label>
            <input type="text" name="name_et" value={form.name_et} onChange={handleChange} className="input" />
          </div>

          <div>
            <label className="block text-sm text-brand-text-muted mb-1.5">Описание (RU)</label>
            <textarea
              name="description_ru"
              value={form.description_ru}
              onChange={handleChange}
              className="input resize-none"
              rows={2}
            />
          </div>
          <div>
            <label className="block text-sm text-brand-text-muted mb-1.5">Описание (ET)</label>
            <textarea
              name="description_et"
              value={form.description_et}
              onChange={handleChange}
              className="input resize-none"
              rows={2}
            />
          </div>
        </div>
      </div>

      <div className="card p-6">
        <h2 className="font-bold text-white mb-4">Цена и статус</h2>
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-sm text-brand-text-muted mb-1.5">Цена (€) *</label>
            <input
              type="number"
              name="base_price"
              value={form.base_price}
              onChange={handleChange}
              className="input"
              required
              min="0"
              step="0.01"
            />
          </div>
        </div>

        <div className="flex gap-6">
          <label className="flex items-center gap-2 text-sm text-white">
            <input
              type="checkbox"
              name="is_active"
              checked={form.is_active}
              onChange={handleChange}
            />
            Активен
          </label>
          <label className="flex items-center gap-2 text-sm text-white">
            <input
              type="checkbox"
              name="is_available"
              checked={form.is_available}
              onChange={handleChange}
            />
            В наличии
          </label>
        </div>
      </div>

      {error && (
        <div className="py-3 px-4 rounded-xl bg-brand-red/10 border border-brand-red/20 text-brand-red text-sm">
          {error}
        </div>
      )}

      {/* Set parameters */}
      <div className="card p-6">
        <h2 className="font-bold text-white mb-4">Параметры набора</h2>
        <div className="space-y-4">
          <div className="max-w-xs">
            <label className="block text-sm text-brand-text-muted mb-1.5">Количество кусочков (полный набор)</label>
            <input
              type="number"
              name="pieces_total"
              value={form.pieces_total}
              onChange={handleChange}
              className="input"
              min="1"
              step="1"
              placeholder="12"
            />
          </div>

          <p className="text-sm text-brand-text-muted">
            Дополнительные варианты — цена рассчитается автоматически по пропорции
          </p>

          {/* Variant 1 */}
          <div className="rounded-xl bg-brand-gray-mid/40 border border-white/5 p-4 space-y-3">
            <p className="text-sm font-semibold text-white">Вариант 1</p>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-brand-text-muted mb-1.5">Кол-во кусочков</label>
                <input
                  type="number"
                  name="variant1_pieces"
                  value={form.variant1_pieces}
                  onChange={handleChange}
                  className="input"
                  min="1"
                  step="1"
                  placeholder="8"
                />
              </div>
              <div>
                <label className="block text-sm text-brand-text-muted mb-1.5">Цена (€)</label>
                <input
                  type="number"
                  name="variant1_price"
                  value={form.variant1_price}
                  onChange={handleChange}
                  className="input"
                  min="0"
                  step="0.01"
                  placeholder="авто"
                />
              </div>
            </div>
            {form.variant1_pieces && form.pieces_total && (
              <p className="text-xs text-brand-text-muted">
                {form.variant1_pieces} из {form.pieces_total} шт
                {form.variant1_price ? ` · ${parseFloat(form.variant1_price).toFixed(2)} €` : ""}
              </p>
            )}
          </div>

          {/* Variant 2 */}
          <div className="rounded-xl bg-brand-gray-mid/40 border border-white/5 p-4 space-y-3">
            <p className="text-sm font-semibold text-white">Вариант 2</p>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-brand-text-muted mb-1.5">Кол-во кусочков</label>
                <input
                  type="number"
                  name="variant2_pieces"
                  value={form.variant2_pieces}
                  onChange={handleChange}
                  className="input"
                  min="1"
                  step="1"
                  placeholder="6"
                />
              </div>
              <div>
                <label className="block text-sm text-brand-text-muted mb-1.5">Цена (€)</label>
                <input
                  type="number"
                  name="variant2_price"
                  value={form.variant2_price}
                  onChange={handleChange}
                  className="input"
                  min="0"
                  step="0.01"
                  placeholder="авто"
                />
              </div>
            </div>
            {form.variant2_pieces && form.pieces_total && (
              <p className="text-xs text-brand-text-muted">
                {form.variant2_pieces} из {form.pieces_total} шт
                {form.variant2_price ? ` · ${parseFloat(form.variant2_price).toFixed(2)} €` : ""}
              </p>
            )}
          </div>
        </div>
      </div>

      <div className="flex gap-3">
        <button type="submit" disabled={saving} className="btn-primary py-3 px-8">
          {saving ? "Сохраняем..." : "Сохранить изменения"}
        </button>
        <a href="/admin/products" className="btn-secondary py-3 px-6">
          Отмена
        </a>
      </div>
    </form>
  );
}
