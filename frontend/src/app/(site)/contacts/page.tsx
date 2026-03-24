import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Контакты — Yappi Sushi",
  description: "Адрес, телефон и время работы Yappi Sushi",
};

export default function ContactsPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-16">
      <h1 className="text-4xl font-black text-white mb-2">Контакты</h1>
      <p className="text-brand-text-muted mb-12">Мы всегда рады вашему визиту или звонку</p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Contact info */}
        <div className="space-y-4">
          {[
            {
              icon: "📍",
              label: "Адрес",
              value: "Таллин, ул. Примерная 1",
            },
            {
              icon: "📞",
              label: "Телефон",
              value: "+372 5000 0000",
              href: "tel:+37250000000",
            },
            {
              icon: "✉️",
              label: "Email",
              value: "info@yappi.ee",
              href: "mailto:info@yappi.ee",
            },
          ].map((item) => (
            <div key={item.label} className="card p-5 flex gap-4 items-start">
              <span className="text-2xl flex-shrink-0">{item.icon}</span>
              <div>
                <p className="text-brand-text-muted text-xs mb-0.5">{item.label}</p>
                {item.href ? (
                  <a href={item.href} className="text-white font-semibold hover:text-brand-red transition-colors">
                    {item.value}
                  </a>
                ) : (
                  <p className="text-white font-semibold">{item.value}</p>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Working hours */}
        <div className="card p-6">
          <h2 className="font-bold text-white mb-4">🕐 Часы работы</h2>
          <div className="space-y-2 text-sm">
            {[
              { day: "Понедельник", hours: "11:00 — 22:00" },
              { day: "Вторник", hours: "11:00 — 22:00" },
              { day: "Среда", hours: "11:00 — 22:00" },
              { day: "Четверг", hours: "11:00 — 22:00" },
              { day: "Пятница", hours: "11:00 — 23:00" },
              { day: "Суббота", hours: "12:00 — 23:00" },
              { day: "Воскресенье", hours: "12:00 — 22:00" },
            ].map(({ day, hours }) => (
              <div key={day} className="flex justify-between">
                <span className="text-brand-text-muted">{day}</span>
                <span className="text-white font-medium">{hours}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* CTA */}
      <div className="mt-10 text-center">
        <Link href="/menu" className="btn-primary text-base px-8 py-4">
          Перейти в меню
        </Link>
      </div>
    </div>
  );
}
