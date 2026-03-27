"use client";

import { useEffect, useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useCart } from "@/lib/cart-context";
import Link from "next/link";

type OrderType = "delivery" | "pickup";
type PaymentMethod =
  | "stripe"
  | "cash_on_pickup"
  | "card_on_pickup"
  | "cash_on_delivery"
  | "card_on_delivery";

const CHECKOUT_DRAFT_KEY = "yappi_checkout_draft";
const STRIPE_PUBLISHABLE_KEY = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;

export default function CheckoutPage() {
  const router = useRouter();
  const { items, subtotal, clearCart } = useCart();
  const stripeAvailable = Boolean(STRIPE_PUBLISHABLE_KEY);

  const [type, setType] = useState<OrderType>("delivery");
  const [payment, setPayment] = useState<PaymentMethod>("cash_on_delivery");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [apartment, setApartment] = useState("");
  const [entrance, setEntrance] = useState("");
  const [floor, setFloor] = useState("");
  const [doorCode, setDoorCode] = useState("");
  const [comment, setComment] = useState("");
  const [promoCode, setPromoCode] = useState("");
  const [promoLoading, setPromoLoading] = useState(false);
  const [promoError, setPromoError] = useState<string | null>(null);
  const [promoData, setPromoData] = useState<{
    discount_amount: number;
    description: string | null;
  } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [stripeNotice, setStripeNotice] = useState<string | null>(null);
  const [draftReady, setDraftReady] = useState(false);

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(CHECKOUT_DRAFT_KEY);
      if (!raw) {
        setDraftReady(true);
        return;
      }

      const draft = JSON.parse(raw) as {
        type?: OrderType;
        payment?: PaymentMethod;
        name?: string;
        phone?: string;
        address?: string;
        apartment?: string;
        entrance?: string;
        floor?: string;
        doorCode?: string;
        comment?: string;
        promoCode?: string;
      };

      if (draft.type) setType(draft.type);
      if (draft.payment) setPayment(draft.payment);
      if (draft.name) setName(draft.name);
      if (draft.phone) setPhone(draft.phone);
      if (draft.address) setAddress(draft.address);
      if (draft.apartment) setApartment(draft.apartment);
      if (draft.entrance) setEntrance(draft.entrance);
      if (draft.floor) setFloor(draft.floor);
      if (draft.doorCode) setDoorCode(draft.doorCode);
      if (draft.comment) setComment(draft.comment);
      if (draft.promoCode) setPromoCode(draft.promoCode);
    } catch {
      sessionStorage.removeItem(CHECKOUT_DRAFT_KEY);
    } finally {
      setDraftReady(true);
    }
  }, []);

  useEffect(() => {
    if (!draftReady) return;

    const draft = {
      type,
      payment,
      name,
      phone,
      address,
      apartment,
      entrance,
      floor,
      doorCode,
      comment,
      promoCode,
    };

    sessionStorage.setItem(CHECKOUT_DRAFT_KEY, JSON.stringify(draft));
  }, [
    address,
    apartment,
    comment,
    doorCode,
    draftReady,
    entrance,
    floor,
    name,
    payment,
    phone,
    promoCode,
    type,
  ]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);

    if (params.get("cancelled") === "1") {
      setStripeNotice("Онлайн-оплата была отменена. Корзина сохранена, вы можете изменить заказ и попробовать снова.");
      if (stripeAvailable) {
        setPayment("stripe");
      }
    } else {
      setStripeNotice(null);
    }
  }, [stripeAvailable]);

  useEffect(() => {
    if (!stripeAvailable && payment === "stripe") {
      setPayment(type === "delivery" ? "cash_on_delivery" : "cash_on_pickup");
    }
  }, [payment, stripeAvailable, type]);

  async function applyPromo() {
    if (!promoCode.trim()) return;
    setPromoLoading(true);
    setPromoError(null);
    setPromoData(null);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || ""}/api/promo-codes/validate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: promoCode, subtotal, phone }),
      });
      const data = await res.json();
      if (!data.ok) setPromoError(data.error ?? "Промокод недействителен");
      else setPromoData(data.data);
    } catch {
      setPromoError("Ошибка соединения");
    } finally {
      setPromoLoading(false);
    }
  }

  if (!draftReady) {
    return null;
  }

  if (items.length === 0) {
    return (
      <div className="max-w-xl mx-auto px-4 py-24 text-center">
        <div className="text-5xl mb-4">🛒</div>
        <h1 className="text-3xl font-black text-white mb-3">Корзина пуста</h1>
        <p className="text-brand-text-muted mb-6">
          Добавьте блюда из меню для оформления заказа
        </p>
        <Link href="/menu" className="btn-primary inline-flex">
          Перейти в меню
        </Link>
      </div>
    );
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (loading) return;

    if (type === "delivery" && !address.trim()) {
      setError("Укажите адрес доставки");
      return;
    }
    setError(null);
    setStripeNotice(null);
    setLoading(true);

    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || ""}/api/orders`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type,
          payment_method: payment,
          customer_name: name,
          customer_phone: phone,
          address_line: type === "delivery" ? address : undefined,
          apartment: apartment || undefined,
          entrance: entrance || undefined,
          floor: floor || undefined,
          door_code: doorCode || undefined,
          comment: comment || undefined,
          promo_code: promoCode || undefined,
          language_code: "ru",
          items: items.map((i) => ({
            product_id: i.product_id,
            product_variant_id: i.product_variant_id,
            quantity: i.quantity,
            selections: i.selections.map((s) => ({
              option_item_id: s.option_item_id,
              quantity: s.quantity,
            })),
          })),
        }),
      });

      const data = await res.json();
      if (!data.ok) {
        setError(data.error ?? "Ошибка при оформлении заказа");
      } else {
        if (payment === "stripe") {
          if (data.data.stripe_checkout_url) {
            // Keep cart and draft until Stripe actually confirms payment.
            // This lets the user return from cancel_url without losing the checkout state.
            window.location.href = data.data.stripe_checkout_url;
            return;
          }

          if (data.data.payment_status === "paid") {
            sessionStorage.removeItem(CHECKOUT_DRAFT_KEY);
            clearCart();
            router.push(`/track/${data.data.tracking_token}`);
            return;
          }

          setError("Интернет-платеж сейчас недоступен. Заказ не был отправлен в платежный сервис.");
        } else {
          clearCart();
          sessionStorage.removeItem(CHECKOUT_DRAFT_KEY);
          router.push(`/track/${data.data.tracking_token}`);
        }
      }
    } catch {
      setError("Ошибка соединения. Попробуйте снова.");
    } finally {
      setLoading(false);
    }
  }

  const paymentOptions =
    type === "delivery"
      ? [
          { value: "cash_on_delivery", label: "💵 Наличными курьеру" },
          { value: "card_on_delivery", label: "💳 Картой курьеру" },
          { value: "stripe", label: "🌐 Интернет-платеж" },
        ]
      : [
          { value: "cash_on_pickup", label: "💵 Наличными при получении" },
          { value: "card_on_pickup", label: "💳 Картой при получении" },
          { value: "stripe", label: "🌐 Интернет-платеж" },
        ];

  const visiblePaymentOptions = paymentOptions.filter(
    (option) => option.value !== "stripe" || stripeAvailable
  );

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-12">
      <h1 className="text-4xl font-black text-white mb-8">Оформление заказа</h1>

      {stripeNotice && (
        <div className="mb-6 rounded-2xl border border-amber-500/20 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
          {stripeNotice}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left: Form */}
          <div className="lg:col-span-2 space-y-6">
            {/* Delivery type */}
            <div className="card p-6">
              <h2 className="font-bold text-white mb-4">Способ получения</h2>
              <div className="grid grid-cols-2 gap-3">
                {(["delivery", "pickup"] as OrderType[]).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => {
                      setType(t);
                      setPayment(
                        t === "delivery" ? "cash_on_delivery" : "cash_on_pickup"
                      );
                    }}
                    className={`py-3 px-4 rounded-xl border text-sm font-semibold transition-all ${
                      type === t
                        ? "border-brand-red bg-brand-red/10 text-white"
                        : "border-white/10 bg-brand-gray-mid text-brand-text-muted hover:border-white/30"
                    }`}
                  >
                    {t === "delivery" ? "🚚 Доставка" : "🏪 Самовывоз"}
                  </button>
                ))}
              </div>
            </div>

            {/* Contacts */}
            <div className="card p-6">
              <h2 className="font-bold text-white mb-4">Контактные данные</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm text-brand-text-muted mb-1.5">
                    Имя *
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="input"
                    placeholder="Ваше имя"
                    required
                    minLength={2}
                  />
                </div>
                <div>
                  <label className="block text-sm text-brand-text-muted mb-1.5">
                    Телефон *
                  </label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="input"
                    placeholder="+372 5000 0000"
                    required
                    minLength={7}
                  />
                </div>
              </div>
            </div>

            {/* Delivery address */}
            {type === "delivery" && (
              <div className="card p-6">
                <h2 className="font-bold text-white mb-4">Адрес доставки</h2>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm text-brand-text-muted mb-1.5">
                      Улица и дом *
                    </label>
                    <input
                      type="text"
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      className="input"
                      placeholder="ул. Нарвское шоссе, 10"
                    />
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {[
                      { label: "Квартира", val: apartment, set: setApartment, ph: "45" },
                      { label: "Подъезд", val: entrance, set: setEntrance, ph: "2" },
                      { label: "Этаж", val: floor, set: setFloor, ph: "5" },
                      { label: "Домофон", val: doorCode, set: setDoorCode, ph: "1234" },
                    ].map(({ label, val, set, ph }) => (
                      <div key={label}>
                        <label className="block text-sm text-brand-text-muted mb-1.5">
                          {label}
                        </label>
                        <input
                          type="text"
                          value={val}
                          onChange={(e) => set(e.target.value)}
                          className="input"
                          placeholder={ph}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Payment */}
            <div className="card p-6">
              <h2 className="font-bold text-white mb-4">Способ оплаты</h2>
              <div className="space-y-2">
                {visiblePaymentOptions.map((opt) => (
                  <label
                    key={opt.value}
                    className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                      payment === opt.value
                        ? "border-brand-red bg-brand-red/10"
                        : "border-white/10 hover:border-white/20"
                    }`}
                  >
                    <input
                      type="radio"
                      name="payment"
                      value={opt.value}
                      checked={payment === opt.value}
                      onChange={() => setPayment(opt.value as PaymentMethod)}
                      className="sr-only"
                    />
                    <div
                      className={`w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                        payment === opt.value ? "border-brand-red" : "border-white/30"
                      }`}
                    >
                      {payment === opt.value && (
                        <div className="w-2 h-2 rounded-full bg-brand-red" />
                      )}
                    </div>
                    <span className="text-sm text-white">{opt.label}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Comment + promo */}
            <div className="card p-6">
              <h2 className="font-bold text-white mb-4">Дополнительно</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm text-brand-text-muted mb-1.5">Промокод</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={promoCode}
                      onChange={(e) => { setPromoCode(e.target.value.toUpperCase()); setPromoData(null); setPromoError(null); }}
                      className="input flex-1"
                      placeholder="WELCOME10"
                    />
                    <button
                      type="button"
                      onClick={applyPromo}
                      disabled={promoLoading || !promoCode.trim()}
                      className="btn-secondary px-4 text-sm flex-shrink-0"
                    >
                      {promoLoading ? "..." : "Применить"}
                    </button>
                  </div>
                  {promoError && <p className="text-brand-red text-xs mt-1.5">{promoError}</p>}
                  {promoData && (
                    <p className="text-green-400 text-xs mt-1.5">✓ {promoData.description ?? "Скидка"}: −{promoData.discount_amount.toFixed(2)} €</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm text-brand-text-muted mb-1.5">
                    Комментарий к заказу
                  </label>
                  <textarea
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    className="input resize-none"
                    rows={3}
                    placeholder="Аллергии, пожелания..."
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Right: Summary */}
          <div className="lg:col-span-1">
            <div className="card p-6 sticky top-4">
              <h2 className="font-bold text-white mb-4">Сводка заказа</h2>
              <div className="space-y-3 mb-4">
                {items.map((item) => (
                  <div key={item.key} className="flex justify-between text-sm">
                    <span className="text-brand-text-muted">
                      {item.name} × {item.quantity}
                    </span>
                    <span className="text-white">
                      {(item.unit_price * item.quantity).toFixed(2)} €
                    </span>
                  </div>
                ))}
              </div>

              <div className="pt-4 mt-4 border-t border-white/5 space-y-1.5 text-sm">
                <div className="flex justify-between text-brand-text-muted">
                  <span>Подытог</span>
                  <span>{subtotal.toFixed(2)} €</span>
                </div>
                {promoData && (
                  <div className="flex justify-between text-green-400">
                    <span>Скидка ({promoCode})</span>
                    <span>−{promoData.discount_amount.toFixed(2)} €</span>
                  </div>
                )}
                <div className="flex justify-between font-bold text-white pt-1 border-t border-white/5">
                  <span>Итого</span>
                  <span className="text-brand-red">
                    {(subtotal - (promoData?.discount_amount ?? 0)).toFixed(2)} €
                  </span>
                </div>
              </div>

              {error && (
                <div className="mt-4 py-3 px-4 rounded-xl bg-brand-red/10 border border-brand-red/20 text-brand-red text-sm">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="btn-primary w-full mt-4 py-3.5 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? "Оформляем..." : "Оформить заказ"}
              </button>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}
