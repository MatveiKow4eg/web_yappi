"use client";

import Link from "next/link";
import { useCart } from "@/lib/cart-context";

export default function CartPage() {
  const { items, subtotal, totalItems, removeItem, updateQuantity, clearCart } = useCart();

  if (totalItems === 0) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-12">
        <h1 className="text-4xl font-black text-white mb-2">Корзина</h1>
        <p className="text-brand-text-muted mb-10">Ваши выбранные блюда</p>
        <div className="card p-16 text-center">
          <div className="text-6xl mb-4">🛒</div>
          <h2 className="text-xl font-bold text-white mb-2">Корзина пуста</h2>
          <p className="text-brand-text-muted mb-6">
            Добавьте блюда из меню, чтобы оформить заказ
          </p>
          <Link href="/menu" className="btn-primary inline-flex">
            Перейти в меню
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-12">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-4xl font-black text-white mb-1">Корзина</h1>
          <p className="text-brand-text-muted">{totalItems} позиций</p>
        </div>
        <button
          onClick={clearCart}
          className="text-sm text-brand-text-muted hover:text-brand-red transition-colors"
        >
          Очистить
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Items */}
        <div className="lg:col-span-2 space-y-3">
          {items.map((item) => (
            <div key={item.key} className="card p-4 flex gap-4">
              {/* Image */}
              <div className="w-20 h-20 rounded-xl bg-brand-gray-mid flex-shrink-0 overflow-hidden">
                {item.image_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={item.image_url}
                    alt={item.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-2xl">
                    🍱
                  </div>
                )}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <p className="text-white font-semibold text-sm leading-tight mb-0.5">
                  {item.name}
                </p>
                {item.variant_name && (
                  <p className="text-brand-text-muted text-xs mb-1">{item.variant_name}</p>
                )}
                {item.selections.map((s) => (
                  <p key={s.option_item_id} className="text-brand-text-muted text-xs">
                    {s.option_group_name}: {s.option_item_name}
                    {s.price_delta > 0 && (
                      <span className="text-brand-red ml-1">+{s.price_delta.toFixed(2)} €</span>
                    )}
                  </p>
                ))}
                <p className="text-brand-red font-bold mt-1">
                  {(item.unit_price * item.quantity).toFixed(2)} €
                </p>
              </div>

              {/* Qty controls */}
              <div className="flex flex-col items-end justify-between">
                <button
                  onClick={() => removeItem(item.key)}
                  className="text-brand-text-muted hover:text-brand-red transition-colors text-lg leading-none"
                  aria-label="Удалить"
                >
                  ×
                </button>
                <div className="flex items-center gap-2 mt-2">
                  <button
                    onClick={() => updateQuantity(item.key, item.quantity - 1)}
                    className="w-7 h-7 rounded-lg bg-brand-gray-mid hover:bg-brand-gray-light flex items-center justify-center text-white transition-colors"
                  >
                    −
                  </button>
                  <span className="text-white text-sm font-bold w-5 text-center">
                    {item.quantity}
                  </span>
                  <button
                    onClick={() => updateQuantity(item.key, item.quantity + 1)}
                    className="w-7 h-7 rounded-lg bg-brand-gray-mid hover:bg-brand-gray-light flex items-center justify-center text-white transition-colors"
                  >
                    +
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Summary */}
        <div className="lg:col-span-1">
          <div className="card p-6 sticky top-4">
            <h2 className="font-bold text-white mb-4">Итого</h2>

            <div className="space-y-2 text-sm mb-4">
              <div className="flex justify-between text-brand-text-muted">
                <span>Подытог</span>
                <span>{subtotal.toFixed(2)} €</span>
              </div>
              <div className="flex justify-between text-brand-text-muted">
                <span>Доставка</span>
                <span>Рассчитывается при оформлении</span>
              </div>
            </div>

            <div className="divider pt-4 mb-4">
              <div className="flex justify-between font-bold text-white mt-4">
                <span>Сумма</span>
                <span className="text-brand-red">{subtotal.toFixed(2)} €</span>
              </div>
            </div>

            <Link href="/checkout" className="btn-primary w-full text-center">
              Оформить заказ
            </Link>
            <Link
              href="/menu"
              className="block text-center text-sm text-brand-text-muted hover:text-white mt-3 transition-colors"
            >
              ← Продолжить покупки
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
