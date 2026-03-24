import AdminSidebar from "@/components/ui/AdminSidebar";
import Link from "next/link";
import type { Metadata } from "next";
import AdminProductsTable from "./AdminProductsTable";

export const metadata: Metadata = { title: "Товары — Админка" };

export default async function AdminProductsPage() {
  return (
    <div className="flex min-h-screen">
      <AdminSidebar active="/admin/products" />
      <main className="flex-1 p-8 overflow-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-black text-white">Товары</h1>
          <Link href="/admin/products/new" className="btn-primary text-sm px-4 py-2">
            + Добавить товар
          </Link>
        </div>
        <AdminProductsTable />
      </main>
    </div>
  );
}
