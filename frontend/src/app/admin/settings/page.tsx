import { AppApi } from "@/lib/api-client";
import { cookies } from "next/headers";
import AdminSidebar from "@/components/ui/AdminSidebar";
import AdminSettingsForm from "./AdminSettingsForm";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Настройки — Админка" };

export default async function AdminSettingsPage() {
  const token = cookies().get("admin_token")?.value;
  let settings = await AppApi.admin.settings.get(token).catch(() => null);

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
