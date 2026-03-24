"use client";

import { useState, FormEvent } from "react";
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
  });

  function handleChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) {
    const { name, value, type } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? (e.target as HTMLInputElement).checked : value,
    }));
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
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          base_price: parseFloat(form.base_price),
          old_price: form.old_price ? parseFloat(form.old_price) : undefined,
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
            <select name="category_id" value={form.category_id} onChange={handleChange} className="input">
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
