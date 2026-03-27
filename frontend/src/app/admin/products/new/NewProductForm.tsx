"use client";

import { useEffect, useState, FormEvent } from "react";
import { useRouter } from "next/navigation";

interface Category {
  id: string;
  name_ru: string;
}

interface Props {
  categories: Category[];
}

export default function NewProductForm({ categories }: Props) {
  const router = useRouter();
  const [categoryOptions, setCategoryOptions] = useState<Category[]>(categories);
  const [categoriesLoading, setCategoriesLoading] = useState(false);
  const [categoriesError, setCategoriesError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState({
    category_id: categories[0]?.id ?? "",
    slug: "",
    name_ru: "",
    name_en: "",
    name_et: "",
    description_ru: "",
    description_en: "",
    description_et: "",
    base_price: "",
    old_price: "",
    image_url: "",
    is_available: true,
    is_active: true,
    pieces_total: "",
    allow_half_half: false,
    half_half_price: "",
    half_half_old_price: "",
  });

  useEffect(() => {
    let active = true;

    async function loadCategories() {
      setCategoriesLoading(true);
      setCategoriesError(null);

      try {
        const apiBase = process.env.NEXT_PUBLIC_API_URL || "";
        const res = await fetch(`${apiBase}/api/admin/categories`, {
          method: "GET",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
        });

        const data = await res.json();
        if (!res.ok || data?.ok === false) {
          throw new Error(data?.error || "Не удалось загрузить категории");
        }

        if (!active) return;

        const list = Array.isArray(data?.data) ? data.data : [];
        setCategoryOptions(list);
        setForm((prev) => ({
          ...prev,
          category_id: prev.category_id || list[0]?.id || "",
        }));
      } catch (e) {
        if (!active) return;
        setCategoriesError(e instanceof Error ? e.message : "Не удалось загрузить категории");
      } finally {
        if (active) setCategoriesLoading(false);
      }
    }

    loadCategories();

    return () => {
      active = false;
    };
  }, []);

  function handleChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) {
    const { name, value, type } = e.target;
    const checked = type === "checkbox" ? (e.target as HTMLInputElement).checked : undefined;
    const newVal = type === "checkbox" ? checked : value;

    setForm((prev) => {
      const next = { ...prev, [name]: newVal };

      // Auto-calculate half_half prices when allow_half_half is toggled on
      if (name === "allow_half_half" && checked) {
        const bp = parseFloat(next.base_price);
        const op = parseFloat(next.old_price);
        if (!isNaN(bp)) next.half_half_price = (bp / 2).toFixed(2);
        if (!isNaN(op) && op > 0) next.half_half_old_price = (op / 2).toFixed(2);
      }
      // Recalculate when base_price changes and allow_half_half is on
      if (name === "base_price" && next.allow_half_half) {
        const bp = parseFloat(value);
        if (!isNaN(bp)) next.half_half_price = (bp / 2).toFixed(2);
      }
      // Recalculate when old_price changes and allow_half_half is on
      if (name === "old_price" && next.allow_half_half) {
        const op = parseFloat(value);
        next.half_half_old_price = !isNaN(op) && op > 0 ? (op / 2).toFixed(2) : "";
      }

      return next;
    });
  }

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

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || ""}/api/admin/products`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          base_price: parseFloat(form.base_price),
          old_price: form.old_price ? parseFloat(form.old_price) : undefined,
          pieces_total: form.pieces_total ? parseInt(form.pieces_total) : undefined,
          half_half_price: form.half_half_price ? parseFloat(form.half_half_price) : undefined,
          half_half_old_price: form.half_half_old_price ? parseFloat(form.half_half_old_price) : undefined,
        }),
      });

      const data = await res.json();
      if (!data.ok) {
        setError(data.error ?? "Ошибка создания товара");
      } else {
        router.push("/admin/products");
        router.refresh();
      }
    } catch {
      setError("Ошибка соединения");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Basic info */}
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
              disabled={categoriesLoading || categoryOptions.length === 0}
            >
              {categoryOptions.map((c) => (
                <option key={c.id} value={c.id} className="bg-brand-gray-dark">
                  {c.name_ru}
                </option>
              ))}
              {categoryOptions.length === 0 && (
                <option value="" className="bg-brand-gray-dark">
                  {categoriesLoading ? "Загрузка..." : "Нет категорий"}
                </option>
              )}
            </select>
            {categoriesError && (
              <p className="text-xs text-brand-red mt-2">{categoriesError}</p>
            )}
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
                placeholder="avtomaticheski"
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

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-brand-text-muted mb-1.5">Название (EN)</label>
              <input type="text" name="name_en" value={form.name_en} onChange={handleChange} className="input" />
            </div>
            <div>
              <label className="block text-sm text-brand-text-muted mb-1.5">Название (ET)</label>
              <input type="text" name="name_et" value={form.name_et} onChange={handleChange} className="input" />
            </div>
          </div>

          <div>
            <label className="block text-sm text-brand-text-muted mb-1.5">Описание (RU)</label>
            <textarea name="description_ru" value={form.description_ru} onChange={handleChange} className="input resize-none" rows={2} />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-brand-text-muted mb-1.5">Описание (EN)</label>
              <textarea name="description_en" value={form.description_en} onChange={handleChange} className="input resize-none" rows={2} />
            </div>
            <div>
              <label className="block text-sm text-brand-text-muted mb-1.5">Описание (ET)</label>
              <textarea name="description_et" value={form.description_et} onChange={handleChange} className="input resize-none" rows={2} />
            </div>
          </div>
        </div>
      </div>

      {/* Pricing */}
      <div className="card p-6">
        <h2 className="font-bold text-white mb-4">Цена</h2>
        <div className="grid grid-cols-2 gap-4">
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
              placeholder="9.90"
            />
          </div>
          <div>
            <label className="block text-sm text-brand-text-muted mb-1.5">Старая цена (€)</label>
            <input
              type="number"
              name="old_price"
              value={form.old_price}
              onChange={handleChange}
              className="input"
              min="0"
              step="0.01"
              placeholder="12.90"
            />
          </div>
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
            <label className="block text-sm text-brand-text-muted mb-1.5">Количество кусочков</label>
            <input
              type="number"
              name="pieces_total"
              value={form.pieces_total}
              onChange={handleChange}
              className="input"
              min="1"
              step="1"
              placeholder="24"
            />
          </div>

          <label className="flex items-center gap-3 cursor-pointer select-none">
            <div
              onClick={() =>
                setForm((prev) => {
                  const next = { ...prev, allow_half_half: !prev.allow_half_half };
                  if (next.allow_half_half) {
                    const bp = parseFloat(next.base_price);
                    const op = parseFloat(next.old_price);
                    if (!isNaN(bp)) next.half_half_price = (bp / 2).toFixed(2);
                    if (!isNaN(op) && op > 0) next.half_half_old_price = (op / 2).toFixed(2);
                  }
                  return next;
                })
              }
              className={`w-11 h-6 rounded-full transition-colors duration-200 relative ${
                form.allow_half_half ? "bg-brand-red" : "bg-brand-gray-mid"
              }`}
            >
              <span
                className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-white shadow transition-transform duration-200 ${
                  form.allow_half_half ? "translate-x-5" : "translate-x-0"
                }`}
              />
            </div>
            <span className="text-sm text-white">Доступен формат 50/50</span>
          </label>

          {form.allow_half_half && (
            <div className="space-y-4">
              {/* Warning if odd pieces */}
              {form.pieces_total && parseInt(form.pieces_total) % 2 !== 0 && (
                <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-yellow-500/10 border border-yellow-500/30 text-yellow-400 text-xs">
                  ⚠ Количество кусочков нечётное — проверьте корректность 50/50
                </div>
              )}

              {/* Info card */}
              <div className="rounded-xl bg-brand-gray-mid/50 border border-white/5 p-4 space-y-2 text-sm">
                <div className="flex justify-between text-white">
                  <span>Полный набор</span>
                  <span className="font-bold">
                    {form.pieces_total ? `${form.pieces_total} шт` : "— шт"} &nbsp;·&nbsp;{" "}
                    {form.base_price ? `${parseFloat(form.base_price).toFixed(2)} €` : "—"}
                  </span>
                </div>
                <div className="flex justify-between text-brand-text-muted">
                  <span>Половина 50/50</span>
                  <span>
                    {form.pieces_total
                      ? `${Math.floor(parseInt(form.pieces_total) / 2)} шт`
                      : "— шт"}{" "}
                    &nbsp;·&nbsp;{" "}
                    {form.half_half_price ? `${parseFloat(form.half_half_price).toFixed(2)} €` : "—"}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-brand-text-muted mb-1.5">
                    Цена 50/50 (€)
                  </label>
                  <input
                    type="number"
                    name="half_half_price"
                    value={form.half_half_price}
                    onChange={handleChange}
                    className="input"
                    min="0"
                    step="0.01"
                  />
                </div>
                <div>
                  <label className="block text-sm text-brand-text-muted mb-1.5">
                    Старая цена 50/50 (€)
                  </label>
                  <input
                    type="number"
                    name="half_half_old_price"
                    value={form.half_half_old_price}
                    onChange={handleChange}
                    className="input"
                    min="0"
                    step="0.01"
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="flex gap-3">
        <button type="submit" disabled={loading} className="btn-primary py-3 px-8">
          {loading ? "Создаём..." : "Создать товар"}
        </button>
        <a href="/admin/products" className="btn-secondary py-3 px-6">
          Отмена
        </a>
      </div>
    </form>
  );
}
