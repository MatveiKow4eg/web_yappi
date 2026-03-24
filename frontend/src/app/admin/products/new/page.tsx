import { AppApi } from "@/lib/api-client";
import { cookies } from "next/headers";
import AdminSidebar from "@/components/ui/AdminSidebar";
import NewProductForm from "./NewProductForm";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Новый товар — Админка" };

export default async function AdminNewProductPage() {
  const token = cookies().get("admin_token")?.value;
  const categories = await AppApi.admin.categories.list(token).catch(() => []);

  return (
    <div className="flex min-h-screen">
      <AdminSidebar active="/admin/products" />
      <main className="flex-1 p-8 overflow-auto max-w-3xl">
        <div className="flex items-center gap-3 mb-6">
          <a href="/admin/products" className="text-brand-text-muted hover:text-white transition-colors text-sm">
            ← Товары
          </a>
          <span className="text-brand-text-muted">/</span>
          <h1 className="text-2xl font-black text-white">Новый товар</h1>
        </div>
        <NewProductForm categories={categories} />
      </main>
    </div>
  );
}
