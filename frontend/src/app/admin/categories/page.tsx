import AdminSidebar from "@/components/ui/AdminSidebar";
import type { Metadata } from "next";
import AdminCategoriesManager from "./AdminCategoriesManager";

export const metadata: Metadata = { title: "Категории — Админка" };

export default async function AdminCategoriesPage() {
  return (
    <div className="flex min-h-screen">
      <AdminSidebar active="/admin/categories" />
      <main className="flex-1 p-8 overflow-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-black text-white">Категории</h1>
        </div>
        <AdminCategoriesManager />
      </main>
    </div>
  );
}
