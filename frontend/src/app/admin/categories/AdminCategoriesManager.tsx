"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";

type AdminCategory = {
  id: string;
  slug: string;
  name_ru: string;
  name_en: string;
  name_et: string;
  sort_order: number;
  is_active: boolean;
  _count?: {
    products: number;
  };
};

type CategoryForm = {
  slug: string;
  name_ru: string;
  name_en: string;
  name_et: string;
  sort_order: number;
  is_active: boolean;
};

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "";

function toSlug(value: string) {
  return value
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

async function parseApiResponse<T>(res: Response): Promise<T> {
  let data: any = null;
  try {
    data = await res.json();
  } catch {
    throw new Error(`HTTP ${res.status}`);
  }

  if (!res.ok || data?.ok === false) {
    throw new Error(data?.error || data?.message || `HTTP ${res.status}`);
  }

  return data.data as T;
}

export default function AdminCategoriesManager() {
  const [categories, setCategories] = useState<AdminCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [createForm, setCreateForm] = useState<CategoryForm>({
    slug: "",
    name_ru: "",
    name_en: "",
    name_et: "",
    sort_order: 0,
    is_active: true,
  });
  const [creating, setCreating] = useState(false);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<CategoryForm | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);

  const hasData = useMemo(() => categories.length > 0, [categories.length]);

  async function loadCategories() {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`${API_BASE}/api/admin/categories`, {
        method: "GET",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
      });
      const list = await parseApiResponse<AdminCategory[]>(res);
      setCategories(Array.isArray(list) ? list : []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Не удалось загрузить категории");
      setCategories([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadCategories();
  }, []);

  function startEdit(cat: AdminCategory) {
    setEditingId(cat.id);
    setEditForm({
      slug: cat.slug,
      name_ru: cat.name_ru,
      name_en: cat.name_en || "",
      name_et: cat.name_et || "",
      sort_order: cat.sort_order ?? 0,
      is_active: cat.is_active,
    });
    setError(null);
  }

  function cancelEdit() {
    setEditingId(null);
    setEditForm(null);
  }

  async function saveEdit(categoryId: string) {
    if (!editForm) return;

    setSavingId(categoryId);
    setError(null);

    try {
      const res = await fetch(`${API_BASE}/api/admin/categories/${categoryId}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...editForm,
          sort_order: Number(editForm.sort_order) || 0,
          slug: toSlug(editForm.slug),
        }),
      });
      await parseApiResponse(res);
      await loadCategories();
      cancelEdit();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Не удалось сохранить категорию");
    } finally {
      setSavingId(null);
    }
  }

  async function createCategory(e: FormEvent) {
    e.preventDefault();
    setCreating(true);
    setError(null);

    try {
      const payload = {
        ...createForm,
        slug: toSlug(createForm.slug || createForm.name_ru),
        sort_order: Number(createForm.sort_order) || 0,
      };

      const res = await fetch(`${API_BASE}/api/admin/categories`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      await parseApiResponse(res);

      setCreateForm({
        slug: "",
        name_ru: "",
        name_en: "",
        name_et: "",
        sort_order: 0,
        is_active: true,
      });

      await loadCategories();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Не удалось создать категорию");
    } finally {
      setCreating(false);
    }
  }

  return (
    <>
      <div className="card p-6 mb-6">
        <h2 className="font-bold text-white mb-4">Новая категория</h2>
        <form onSubmit={createCategory} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm text-brand-text-muted mb-1.5">Название (RU) *</label>
              <input
                className="input"
                value={createForm.name_ru}
                onChange={(e) => {
                  const value = e.target.value;
                  setCreateForm((prev) => ({
                    ...prev,
                    name_ru: value,
                    slug: prev.slug ? prev.slug : toSlug(value),
                  }));
                }}
                required
              />
            </div>
            <div>
              <label className="block text-sm text-brand-text-muted mb-1.5">Slug *</label>
              <input
                className="input font-mono text-sm"
                value={createForm.slug}
                onChange={(e) => setCreateForm((prev) => ({ ...prev, slug: toSlug(e.target.value) }))}
                required
              />
            </div>
            <div>
              <label className="block text-sm text-brand-text-muted mb-1.5">Название (ET)</label>
              <input
                className="input"
                value={createForm.name_et}
                onChange={(e) => setCreateForm((prev) => ({ ...prev, name_et: e.target.value }))}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-end">
            <div>
              <label className="block text-sm text-brand-text-muted mb-1.5">Порядок</label>
              <input
                type="number"
                className="input"
                value={createForm.sort_order}
                onChange={(e) => setCreateForm((prev) => ({ ...prev, sort_order: Number(e.target.value) || 0 }))}
              />
            </div>
            <label className="flex items-center gap-2 text-sm text-white">
              <input
                type="checkbox"
                checked={createForm.is_active}
                onChange={(e) => setCreateForm((prev) => ({ ...prev, is_active: e.target.checked }))}
              />
              Активна
            </label>
            <button type="submit" disabled={creating} className="btn-primary py-2.5 px-6 justify-self-start">
              {creating ? "Создаём..." : "Создать категорию"}
            </button>
          </div>
        </form>
      </div>

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
                <th className="px-4 py-3 text-left font-medium">Название (RU)</th>
                <th className="px-4 py-3 text-left font-medium">ET</th>
                <th className="px-4 py-3 text-left font-medium">Slug</th>
                <th className="px-4 py-3 text-center font-medium">Порядок</th>
                <th className="px-4 py-3 text-center font-medium">Товаров</th>
                <th className="px-4 py-3 text-center font-medium">Статус</th>
                <th className="px-4 py-3 text-right font-medium">Действия</th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-center text-brand-text-muted">
                    Загрузка категорий...
                  </td>
                </tr>
              )}

              {!loading && !hasData && (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-brand-text-muted">
                    Категорий нет. Создайте первую категорию выше.
                  </td>
                </tr>
              )}

              {!loading &&
                categories.map((cat) => {
                  const isEditing = editingId === cat.id && editForm;
                  const isSaving = savingId === cat.id;

                  return (
                    <tr
                      key={cat.id}
                      className="border-b border-white/5 hover:bg-brand-gray-mid/50 transition-colors"
                    >
                      <td className="px-4 py-3">
                        {isEditing ? (
                          <input
                            className="input h-9"
                            value={editForm.name_ru}
                            onChange={(e) => setEditForm((prev) => (prev ? { ...prev, name_ru: e.target.value } : prev))}
                          />
                        ) : (
                          <span className="text-white font-medium">{cat.name_ru}</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {isEditing ? (
                          <input
                            className="input h-9"
                            value={editForm.name_et}
                            onChange={(e) => setEditForm((prev) => (prev ? { ...prev, name_et: e.target.value } : prev))}
                          />
                        ) : (
                          <span className="text-brand-text-muted">{cat.name_et}</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {isEditing ? (
                          <input
                            className="input h-9 font-mono text-xs"
                            value={editForm.slug}
                            onChange={(e) => setEditForm((prev) => (prev ? { ...prev, slug: toSlug(e.target.value) } : prev))}
                          />
                        ) : (
                          <span className="text-brand-text-muted font-mono text-xs">{cat.slug}</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {isEditing ? (
                          <input
                            type="number"
                            className="input h-9 w-20 mx-auto text-center"
                            value={editForm.sort_order}
                            onChange={(e) => setEditForm((prev) => (prev ? { ...prev, sort_order: Number(e.target.value) || 0 } : prev))}
                          />
                        ) : (
                          <span className="text-brand-text-muted">{cat.sort_order}</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center text-white font-bold">{cat._count?.products ?? 0}</td>
                      <td className="px-4 py-3 text-center">
                        {isEditing ? (
                          <label className="inline-flex items-center gap-2 text-xs text-white">
                            <input
                              type="checkbox"
                              checked={editForm.is_active}
                              onChange={(e) =>
                                setEditForm((prev) => (prev ? { ...prev, is_active: e.target.checked } : prev))
                              }
                            />
                            Активна
                          </label>
                        ) : cat.is_active ? (
                          <span className="badge-green">Активна</span>
                        ) : (
                          <span className="badge-gray">Скрыта</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {isEditing ? (
                          <div className="flex items-center justify-end gap-2">
                            <button
                              type="button"
                              onClick={() => saveEdit(cat.id)}
                              disabled={isSaving}
                              className="btn-primary py-1.5 px-3 text-xs"
                            >
                              {isSaving ? "Сохранение..." : "Сохранить"}
                            </button>
                            <button
                              type="button"
                              onClick={cancelEdit}
                              className="btn-secondary py-1.5 px-3 text-xs"
                            >
                              Отмена
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => startEdit(cat)}
                            className="text-brand-text-muted hover:text-white text-xs transition-colors"
                          >
                            Редактировать
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
