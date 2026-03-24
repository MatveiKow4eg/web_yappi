import AdminSidebar from "@/components/ui/AdminSidebar";
import type { Metadata } from "next";
import EditProductForm from "./EditProductForm";

export const metadata: Metadata = { title: "Редактировать товар — Админка" };

interface Props {
  params: {
    id: string;
  };
}

export default function AdminEditProductPage({ params }: Props) {
  return (
    <div className="flex min-h-screen">
      <AdminSidebar active="/admin/products" />
      <main className="flex-1 p-8 overflow-auto max-w-3xl">
        <div className="flex items-center gap-3 mb-6">
          <a href="/admin/products" className="text-brand-text-muted hover:text-white transition-colors text-sm">
            ← Товары
          </a>
          <span className="text-brand-text-muted">/</span>
          <h1 className="text-2xl font-black text-white">Редактировать товар</h1>
        </div>

        <EditProductForm productId={params.id} />
      </main>
    </div>
  );
}
