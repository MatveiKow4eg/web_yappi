import { AppApi } from "@/lib/api-client";
import { cookies } from "next/headers";
import AdminSidebar from "@/components/ui/AdminSidebar";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Зоны доставки — Админка" };

export default async function AdminDeliveryZonesPage() {
  const token = cookies().get("admin_token")?.value;
  const zones = await AppApi.admin.deliveryZones.list(token).catch(() => []);

  return (
    <div className="flex min-h-screen">
      <AdminSidebar active="/admin/delivery-zones" />
      <main className="flex-1 p-8 overflow-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-black text-white">Зоны доставки</h1>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {zones.map((z: any) => (
            <div key={z.id} className="card p-5">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-white font-bold">{z.name}</h3>
                {z.is_active ? <span className="badge-green">Активна</span> : <span className="badge-gray">Отключена</span>}
              </div>
              <dl className="space-y-1.5 text-sm">
                <div className="flex justify-between">
                  <dt className="text-brand-text-muted">Стоимость доставки</dt>
                  <dd className="text-white font-bold">{parseFloat(z.delivery_fee.toString()).toFixed(2)} €</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-brand-text-muted">Мин. сумма заказа</dt>
                  <dd className="text-white">{parseFloat(z.min_order_amount.toString()).toFixed(2)} €</dd>
                </div>
                {z.free_delivery_from && (
                  <div className="flex justify-between">
                    <dt className="text-brand-text-muted">Бесплатно от</dt>
                    <dd className="text-green-400 font-bold">{parseFloat(z.free_delivery_from.toString()).toFixed(2)} €</dd>
                  </div>
                )}
              </dl>
            </div>
          ))}
          {zones.length === 0 && (
            <div className="col-span-3 card p-12 text-center text-brand-text-muted">
              Зоны доставки не настроены
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
