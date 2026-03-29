"use client";

import { useState, FormEvent, useEffect } from "react";
import type { RestaurantSettings } from "@prisma/client";

interface Props {
  settings: Partial<RestaurantSettings> | null;
}

const fallbackSettings = {
  restaurant_name: "Yappi Sushi",
  phone: "",
  email: "",
  address_ru: "",
  address_en: "",
  address_et: "",
  pickup_enabled: true,
  delivery_enabled: true,
  stripe_enabled: false,
  min_delivery_time_minutes: 30,
  max_delivery_time_minutes: 60,
};

export default function AdminSettingsForm({ settings }: Props) {
  const safeSettings = { ...fallbackSettings, ...(settings ?? {}) };

  const [form, setForm] = useState({
    restaurant_name: safeSettings.restaurant_name,
    phone: safeSettings.phone,
    email: safeSettings.email,
    address_ru: safeSettings.address_ru,
    address_en: safeSettings.address_en,
    address_et: safeSettings.address_et,
    pickup_enabled: safeSettings.pickup_enabled,
    delivery_enabled: safeSettings.delivery_enabled,
    stripe_enabled: safeSettings.stripe_enabled,
    min_delivery_time_minutes: safeSettings.min_delivery_time_minutes,
    max_delivery_time_minutes: safeSettings.max_delivery_time_minutes,
  });

  const [loading, setLoading] = useState(false);
  const [loadingInitial, setLoadingInitial] = useState(true);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function loadSettings() {
      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || ""}/api/admin/settings`, {
          method: "GET",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
        });

        const data = await res.json();
        if (!active) return;

        if (!res.ok || !data.ok || !data.data) {
          setError("Не удалось загрузить настройки. Проверьте авторизацию администратора.");
          return;
        }

        const serverSettings = { ...fallbackSettings, ...data.data };
        setForm({
          restaurant_name: serverSettings.restaurant_name,
          phone: serverSettings.phone ?? "",
          email: serverSettings.email ?? "",
          address_ru: serverSettings.address_ru ?? "",
          address_en: serverSettings.address_en ?? "",
          address_et: serverSettings.address_et ?? "",
          pickup_enabled: serverSettings.pickup_enabled,
          delivery_enabled: serverSettings.delivery_enabled,
          stripe_enabled: serverSettings.stripe_enabled,
          min_delivery_time_minutes: serverSettings.min_delivery_time_minutes,
          max_delivery_time_minutes: serverSettings.max_delivery_time_minutes,
        });
      } catch {
        if (!active) return;
        setError("Не удалось загрузить настройки. Проверьте соединение.");
      } finally {
        if (active) setLoadingInitial(false);
      }
    }

    loadSettings();

    return () => {
      active = false;
    };
  }, []);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const { name, value, type, checked } = e.target;
    setForm((prev) => ({ ...prev, [name]: type === "checkbox" ? checked : value }));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(false);
    setLoading(true);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || ""}/api/admin/settings`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          min_delivery_time_minutes: Number(form.min_delivery_time_minutes),
          max_delivery_time_minutes: Number(form.max_delivery_time_minutes),
        }),
      });
      const data = await res.json();
      if (!data.ok) setError(data.error ?? "Ошибка сохранения");
      else setSuccess(true);
    } catch {
      setError("Ошибка соединения");
    } finally {
      setLoading(false);
    }
  }

  const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
    <div className="card p-6 mb-4">
      <h2 className="font-bold text-white mb-4">{title}</h2>
      {children}
    </div>
  );

  const Field = ({ label, name, type = "text", placeholder = "" }: { label: string; name: keyof typeof form; type?: string; placeholder?: string }) => (
    <div>
      <label className="block text-sm text-brand-text-muted mb-1.5">{label}</label>
      <input
        type={type}
        name={name}
        value={String(form[name])}
        onChange={handleChange}
        className="input"
        placeholder={placeholder}
      />
    </div>
  );

  const Toggle = ({ label, name }: { label: string; name: keyof typeof form }) => (
    <label className="flex items-center gap-3 cursor-pointer">
      <div className={`relative w-10 h-6 rounded-full transition-colors ${form[name] ? "bg-brand-red" : "bg-brand-gray-light"}`}>
        <input type="checkbox" name={name} checked={Boolean(form[name])} onChange={handleChange} className="sr-only" />
        <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${form[name] ? "translate-x-5" : "translate-x-1"}`} />
      </div>
      <span className="text-sm text-white">{label}</span>
    </label>
  );

  return (
    <form onSubmit={handleSubmit}>
      {loadingInitial && (
        <div className="py-3 px-4 rounded-xl bg-brand-gray-mid border border-white/10 text-sm text-brand-text-muted mb-4">
          Загружаем текущие настройки...
        </div>
      )}

      <Section title="Общая информация">
        <div className="space-y-4">
          <Field label="Название ресторана" name="restaurant_name" />
          <div className="grid grid-cols-2 gap-4">
            <Field label="Телефон" name="phone" placeholder="+372 5000 0000" />
            <Field label="Email" name="email" type="email" placeholder="info@yappi.ee" />
          </div>
          <Field label="Адрес (RU)" name="address_ru" />
          <Field label="Адрес (ET)" name="address_et" />
        </div>
      </Section>

      <Section title="Режим работы">
        <div className="grid grid-cols-2 gap-4 mb-4">
          <Field label="Мин. время доставки (мин)" name="min_delivery_time_minutes" type="number" />
          <Field label="Макс. время доставки (мин)" name="max_delivery_time_minutes" type="number" />
        </div>
      </Section>

      <Section title="Доступные функции">
        <div className="space-y-3">
          <Toggle label="Доставка включена" name="delivery_enabled" />
          <Toggle label="Самовывоз включен" name="pickup_enabled" />
          <Toggle label="Интернет-платеж" name="stripe_enabled" />
        </div>
      </Section>

      {error && (
        <div className="py-3 px-4 rounded-xl bg-brand-red/10 border border-brand-red/20 text-brand-red text-sm mb-4">
          {error}
        </div>
      )}
      {success && (
        <div className="py-3 px-4 rounded-xl bg-green-900/20 border border-green-800/30 text-green-400 text-sm mb-4">
          Настройки сохранены ✓
        </div>
      )}

      <button type="submit" disabled={loading} className="btn-primary py-3 px-8">
        {loading ? "Сохраняем..." : "Сохранить изменения"}
      </button>
    </form>
  );
}
