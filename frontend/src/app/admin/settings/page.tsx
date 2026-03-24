import { prisma } from "@/lib/prisma";
import AdminSidebar from "@/components/ui/AdminSidebar";
import AdminSettingsForm from "./AdminSettingsForm";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Настройки — Админка" };

export default async function AdminSettingsPage() {
  let settings = await prisma.restaurantSettings.findFirst();

  // If no settings exist yet, create default
  if (!settings) {
    settings = await prisma.restaurantSettings.create({
      data: { restaurant_name: "Yappi Sushi" },
    });
  }

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
