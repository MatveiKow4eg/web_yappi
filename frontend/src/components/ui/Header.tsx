"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useCart } from "@/lib/cart-context";

const nav = [
  { href: "/menu", label: "Меню" },
  { href: "/promotions", label: "Акции" },
  { href: "/contacts", label: "Контакты" },
];

export default function Header() {
  const [open, setOpen] = useState(false);
  const [isVisible, setIsVisible] = useState(true);
  const lastScrollY = useRef(0);
  const { totalItems } = useCart();

  useEffect(() => {
    function onScroll() {
      const currentScrollY = window.scrollY;

      // Keep header visible near the top and avoid flicker on tiny scroll changes.
      if (currentScrollY < 24) {
        setIsVisible(true);
        lastScrollY.current = currentScrollY;
        return;
      }

      const delta = currentScrollY - lastScrollY.current;
      if (Math.abs(delta) < 6) return;

      if (delta > 0) {
        setIsVisible(false);
      } else {
        setIsVisible(true);
      }

      lastScrollY.current = currentScrollY;
    }

    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header className={`sticky top-0 z-50 bg-brand-black transition-transform duration-300 ${isVisible || open ? "translate-y-0" : "-translate-y-full"}`}>
      <div className="max-w-7xl mx-auto">
        <div className="h-[72px] sm:h-[84px] px-4 sm:px-6 flex items-center justify-between gap-3">
            <Link href="/" className="flex items-center min-w-0 flex-shrink-0">
              <Image
                src="/images/sushi/logo.png"
                alt="Yappi Sushi"
                width={320}
                height={80}
                className="h-14 sm:h-[72px] w-auto object-contain"
                priority
              />
            </Link>

            <nav className="hidden lg:flex items-center gap-7">
              {nav.map((n) => (
                <Link
                  key={n.href}
                  href={n.href}
                  className="text-base font-semibold text-brand-text-muted hover:text-white transition-colors"
                >
                  {n.label}
                </Link>
              ))}
            </nav>

            <div className="flex items-center gap-2 sm:gap-3">
              <a
                href="tel:+37250000000"
                className="hidden xl:inline-flex items-center gap-2 px-2 py-1.5 text-sm font-medium text-white"
              >
                <span className="text-brand-red">•</span>
                +372 5000 0000
              </a>

              <Link
                href="/cart"
                className="relative inline-flex items-center gap-2 px-4 sm:px-5 py-2 rounded-md bg-brand-red hover:bg-brand-red-dark transition-colors text-sm font-semibold text-white"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"
                  />
                </svg>
                <span className="hidden sm:inline">Корзина</span>
                <span className="sm:hidden">Заказ</span>
                {totalItems > 0 && (
                  <span className="absolute -top-2 -right-1 min-w-5 h-5 px-1 rounded-full bg-white text-brand-red text-[11px] font-black flex items-center justify-center">
                    {totalItems > 9 ? "9+" : totalItems}
                  </span>
                )}
              </Link>

              <button
                onClick={() => setOpen(!open)}
                className="lg:hidden w-10 h-10 rounded-md bg-brand-gray-mid flex items-center justify-center hover:bg-brand-gray-light transition-colors"
                aria-label={open ? "Закрыть меню" : "Открыть меню"}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  {open ? (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  ) : (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7h16M4 12h16M4 17h16" />
                  )}
                </svg>
              </button>
            </div>
        </div>

        {open && (
          <div className="lg:hidden px-4 pb-4">
            <div className="bg-brand-black p-2">
                {nav.map((n) => (
                  <Link
                    key={n.href}
                    href={n.href}
                    onClick={() => setOpen(false)}
                    className="block px-3 py-2 text-sm font-medium text-brand-text-muted hover:text-white transition-colors"
                  >
                    {n.label}
                  </Link>
                ))}
                <a
                  href="tel:+37250000000"
                  className="block px-3 py-2 text-sm font-medium text-white"
                >
                  +372 5000 0000
                </a>
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
