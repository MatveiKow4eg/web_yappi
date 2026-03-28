import { AdminApi } from "@/lib/api-server";
import AdminSidebar from "@/components/ui/AdminSidebar";
import Link from "next/link";

const DAY_NAMES = ["Воскресенье", "Понедельник", "Вторник", "Среда", "Четверг", "Пятница", "Суббота"];

export default async function AdminDashboard() {
  const shifts = await AdminApi.shifts().catch(() => []);

  return (
    <div className="flex min-h-screen">
      <AdminSidebar active="/admin" />
      <main className="flex-1 p-8 overflow-auto">
        <h1 className="text-2xl font-black text-white mb-8">Смены</h1>

        {shifts.length === 0 ? (
          <div className="card p-8 text-center text-brand-text-muted">
            Заказов пока нет
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {shifts.map((shift) => {
              const d = new Date(shift.date + "T12:00:00Z");
              const dayName = DAY_NAMES[d.getUTCDay()];
              const dateLabel = d.toLocaleDateString("ru-RU", {
                day: "numeric",
                month: "long",
                timeZone: "UTC",
              });
              return (
                <Link
                  key={shift.date}
                  href={`/admin/orders?date=${shift.date}`}
                  className="card p-5 flex flex-col gap-1 hover:border-brand-red/50 border border-transparent transition-colors cursor-pointer"
                >
                  <p className="text-brand-text-muted text-xs">{dayName}</p>
                  <p className="text-white font-bold text-sm">{dateLabel}</p>
                  <p className="text-3xl font-black text-white mt-1">{shift.count}</p>
                  <p className="text-brand-text-muted text-xs">
                    {shift.total.toFixed(2)} €
                  </p>
                </Link>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
