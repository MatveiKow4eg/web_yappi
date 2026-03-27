import { AppApi } from "@/lib/api-client";
import AdminSidebar from "@/components/ui/AdminSidebar";
import AdminSettingsForm from "./AdminSettingsForm";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Настройки — Админка" };

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
  cash_on_pickup_enabled: true,
  card_on_pickup_enabled: true,
  min_delivery_time_minutes: 30,
  max_delivery_time_minutes: 60,
};

export default async function AdminSettingsPage() {
  const settings = await AppApi.admin.settings.get().catch(() => fallbackSettings);

  return (
    <div className="flex min-h-screen">
      <AdminSidebar active="/admin/settings" />
      <main className="flex-1 p-8 overflow-auto max-w-3xl">
        <h1 className="text-2xl font-black text-white mb-6">Настройки ресторана</h1>
        <AdminSettingsForm settings={settings} />
      </main>
    </div>
  );
}
