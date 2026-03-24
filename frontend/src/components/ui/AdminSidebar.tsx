import Link from "next/link";
import { cookies } from "next/headers";
import { verifyAdminToken } from "@/lib/auth";

async function getSession() {
  const cookieStore = cookies();
  const token = cookieStore.get("admin_token")?.value;
  if (!token) return null;
  return verifyAdminToken(token);
}

const navItems = [
  { href: "/admin", label: "Dashboard", icon: "📊" },
  { href: "/admin/orders", label: "Заказы", icon: "📦" },
  { href: "/admin/products", label: "Товары", icon: "🍱" },
  { href: "/admin/categories", label: "Категории", icon: "📂" },
  { href: "/admin/promo-codes", label: "Промокоды", icon: "🎁" },
  { href: "/admin/banners", label: "Баннеры", icon: "🖼️" },
  { href: "/admin/delivery-zones", label: "Доставка", icon: "🚚" },
  { href: "/admin/settings", label: "Настройки", icon: "⚙️" },
];

export default async function AdminSidebar({ active }: { active?: string }) {
  const session = await getSession();

  return (
    <aside className="w-56 bg-brand-gray-dark border-r border-white/5 flex flex-col py-6 px-4 shrink-0">
      <div className="flex items-center gap-2 mb-8">
        <span className="text-brand-red font-black text-xl">YS</span>
        <span className="text-white font-bold text-sm">Админка</span>
      </div>

      <nav className="flex flex-col gap-1">
        {navItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors ${
              active === item.href
                ? "bg-brand-red/10 text-white border border-brand-red/20"
                : "text-brand-text-muted hover:text-white hover:bg-brand-gray-mid"
            }`}
          >
            <span>{item.icon}</span>
            {item.label}
          </Link>
        ))}
      </nav>

      <div className="mt-auto pt-6 border-t border-white/5">
        <p className="text-xs text-brand-text-muted mb-2">{session?.email}</p>
        <form action="/api/admin/auth/logout" method="POST">
          <button className="text-xs text-brand-text-muted hover:text-brand-red transition-colors">
            Выйти
          </button>
        </form>
      </div>
    </aside>
  );
}
