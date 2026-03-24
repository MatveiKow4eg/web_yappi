import Link from "next/link";

export default function Footer() {
  return (
    <footer className="bg-brand-gray-dark border-t border-white/5 mt-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
          {/* Brand */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <span className="text-brand-red font-black text-2xl">YS</span>
              <span className="font-bold text-white text-lg">Yappi Sushi</span>
            </div>
            <p className="text-brand-text-muted text-sm leading-relaxed">
              Свежие роллы и суши с доставкой по городу. Готовим с любовью.
            </p>
          </div>

          {/* Links */}
          <div>
            <h3 className="text-sm font-semibold text-white mb-4 uppercase tracking-wider">Меню</h3>
            <ul className="space-y-2">
              {["Роллы", "Суши", "Сеты", "Напитки"].map((item) => (
                <li key={item}>
                  <Link href="/menu" className="text-brand-text-muted hover:text-white text-sm transition-colors">
                    {item}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Info */}
          <div>
            <h3 className="text-sm font-semibold text-white mb-4 uppercase tracking-wider">Информация</h3>
            <ul className="space-y-2">
              {[
                { href: "/contacts", label: "Контакты" },
                { href: "/promotions", label: "Акции" },
                { href: "/privacy", label: "Политика конфиденциальности" },
                { href: "/terms", label: "Условия использования" },
              ].map((l) => (
                <li key={l.href}>
                  <Link href={l.href} className="text-brand-text-muted hover:text-white text-sm transition-colors">
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="divider mt-10 pt-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-brand-text-muted text-xs">
            © {new Date().getFullYear()} Yappi Sushi. Все права защищены.
          </p>
          <p className="text-brand-text-muted text-xs">
            Сделано с ❤️
          </p>
        </div>
      </div>
    </footer>
  );
}
