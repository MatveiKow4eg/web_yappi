"use client";

import { useState, FormEvent } from "react";
import type { RestaurantSettings } from "@prisma/client";

interface Props {
  settings: RestaurantSettings;
}

export default function AdminSettingsForm({ settings }: Props) {
  const [form, setForm] = useState({
    restaurant_name: settings.restaurant_name,
    phone: settings.phone ?? "",
    email: settings.email ?? "",
    address_ru: settings.address_ru ?? "",
    address_en: settings.address_en ?? "",
    address_et: settings.address_et ?? "",
    pickup_enabled: settings.pickup_enabled,
    delivery_enabled: settings.delivery_enabled,
    stripe_enabled: settings.stripe_enabled,
    cash_on_pickup_enabled: settings.cash_on_pickup_enabled,
    card_on_pickup_enabled: settings.card_on_pickup_enabled,
    min_delivery_time_minutes: settings.min_delivery_time_minutes,
    max_delivery_time_minutes: settings.max_delivery_time_minutes,
  });

  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
      <Section title="Общая информация">
        <div className="space-y-4">
          <Field label="Название ресторана" name="restaurant_name" />
          <div className="grid grid-cols-2 gap-4">
            <Field label="Телефон" name="phone" placeholder="+372 5000 0000" />
            <Field label="Email" name="email" type="email" placeholder="info@yappi.ee" />
          </div>
          <Field label="Адрес (RU)" name="address_ru" />
          <div className="grid grid-cols-2 gap-4">
            <Field label="Адрес (EN)" name="address_en" />
            <Field label="Адрес (ET)" name="address_et" />
          </div>
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
          <Toggle label="Stripe (онлайн-оплата)" name="stripe_enabled" />
          <Toggle label="Оплата наличными при самовывозе" name="cash_on_pickup_enabled" />
          <Toggle label="Оплата картой при самовывозе" name="card_on_pickup_enabled" />
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
