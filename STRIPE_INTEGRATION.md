# Интеграция Stripe — анализ и план

---

## БЛОК 1 — Архитектура проекта

### Стек

| Часть    | Технология                              |
|----------|-----------------------------------------|
| Frontend | Next.js 14, App Router, TypeScript, Tailwind |
| Backend  | Fastify 4, TypeScript, отдельный Node.js процесс |
| Database | PostgreSQL + Prisma ORM                 |
| Auth     | JWT в httpOnly cookie (`admin_token`), верификация через `jose` |
| Cart     | React Context + `localStorage`          |

### Разделение сервисов

```
frontend/   → http://localhost:3000  (Next.js)
backend/    → http://localhost:4000  (Fastify REST API)
```

Это полноценное **разделение frontend/backend** — не монолит Next.js. Это важно для Stripe.

### Ключевые файлы

| Файл | Роль |
|------|------|
| `backend/prisma/schema.prisma` | Все модели БД |
| `backend/src/app.ts` | Fastify app, регистрация роутов, CORS |
| `backend/src/routes/public/orders.ts` | `POST /api/orders` — создание заказа |
| `backend/src/routes/admin/orders.ts` | Управление заказами из админки |
| `backend/src/lib/auth.ts` | JWT sign/verify |
| `backend/src/lib/session.ts` | Хелперы сессии для Fastify |
| `frontend/src/app/(site)/checkout/page.tsx` | Страница оформления заказа |
| `frontend/src/lib/cart-context.tsx` | Корзина (Context + localStorage) |
| `frontend/src/lib/api-client.ts` | HTTP-клиент для бэкенда |
| `frontend/src/middleware.ts` | Защита `/admin/*` на уровне Edge |

### Логика заказов

1. Пользователь заполняет `/checkout` → `POST /api/orders` на бэкенд
2. Бэкенд **сам** вытаскивает цены из БД, считает стоимость, проверяет промокод и доставку
3. Создаётся `Order` в БД → возвращается `tracking_token`
4. Фронт редиректит на `/track/{token}`

---

## БЛОК 2 — Что уже есть и что мешает интеграции Stripe

### ✅ Что уже готово (хорошая база)

**1. Цены считаются на сервере — не на фронтенде**
В `backend/src/routes/public/orders.ts` каждый товар загружается из БД по `product_id`,
его цена берётся из `product.base_price` / `variant.price`. Фронт передаёт только
`product_id`, `product_variant_id`, `quantity`, `selections` — без цен. Это правильно и безопасно.

**2. Схема БД уже содержит Stripe-ready поля**

```prisma
enum PaymentMethod  { stripe, cash_on_pickup, ... }
enum PaymentStatus  { pending, paid, unpaid, failed, refunded }

// В модели Order:
payment_method   PaymentMethod
payment_status   PaymentStatus @default(pending)
currency         String        @default("EUR")

// В RestaurantSettings:
stripe_enabled   Boolean       @default(false)
```

**3. Пакет `stripe` уже установлен во frontend**

```json
"stripe": "^14.21.0"
```

**4. `.env.example` уже содержит нужные переменные**

```
STRIPE_SECRET_KEY
STRIPE_WEBHOOK_SECRET
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
NEXT_PUBLIC_BASE_URL
```

**5. Вся серверная валидация уже реализована** — промокоды, зоны доставки, минимальная сумма — всё на бэкенде.

---

### ❌ Чего не хватает

**1. ⚠️ ВАЖНО: Stripe никогда не вызывается**
Checkout страница принимает `payment_method: "stripe"`, создаёт заказ как обычно
и просто редиректит на `/track/{token}` — без единого обращения к Stripe API. Деньги не списываются.

**2. Нет `stripe_session_id` в модели Order**
Без этого поля невозможно в webhook понять, к какому заказу относится событие
`checkout.session.completed`.

**3. Нет маршрута создания Stripe Checkout Session**
Не существует эндпоинта типа `POST /api/stripe/create-session`.

**4. Нет webhook-обработчика**
Не существует `POST /api/stripe/webhook`. Статус заказа никогда не станет `paid` автоматически.

**5. ⚠️ ВАЖНО: `STRIPE_SECRET_KEY` запланирован во фронтенде**
В `frontend/.env.example` есть `STRIPE_SECRET_KEY`. Это опасная конфигурация.
Secret key не должен быть в проекте фронтенда — только в бэкенде.
Никогда не использовать `NEXT_PUBLIC_STRIPE_SECRET_KEY`.

**6. Stripe не установлен в backend**
`backend/package.json` не содержит пакета `stripe`.
Вся логика сессий и webhook должна жить в бэкенде.

---

## БЛОК 3 — Безопасная схема подключения Stripe для этого проекта

### Выбранный вариант: **Stripe Checkout (hosted page)**

**Почему не Payment Element:**
- Payment Element требует рендерить форму карты на своей странице — нужен `@stripe/stripe-js`,
  `@stripe/react-stripe-js`, управление состоянием. Это 3–4 дополнительных компонента.
- В проекте нет сложных требований к кастомизации формы оплаты.
- Stripe Checkout — hosted page от Stripe — обрабатывает PCI compliance, 3DS,
  Apple Pay, Google Pay автоматически.
- Stripe Checkout идеально ложится на существующий flow: создал заказ → редиректнул → вернулся.

### Безопасная схема (4 шага)

```
Пользователь         Frontend              Backend (Fastify)          Stripe
     │                   │                       │                       │
     │  Submit формы      │                       │                       │
     │──────────────────▶│                       │                       │
     │                   │  POST /api/orders      │                       │
     │                   │  { items, type, ... } ──────────────────────▶ │
     │                   │                        │ Загружает цены из БД  │
     │                   │                        │ Считает total         │
     │                   │                        │ Создаёт Order(pending)│
     │                   │                        │                       │
     │                   │                        │ stripe.checkout.      │
     │                   │                        │ sessions.create(      │
     │                   │                        │   amount=total_amount,│
     │                   │                        │   metadata:{orderId}  │
     │                   │                        │ )────────────────────▶│
     │                   │◀── { stripe_url } ─────│◀── { session.url } ───│
     │◀── redirect ──────│                        │                       │
     │                   │                        │                       │
     │                   Пользователь платит на странице Stripe           │
     │                   │                        │                       │
     │                   │                        │◀── webhook ───────────│
     │                   │                        │  checkout.session.    │
     │                   │                        │  completed            │
     │                   │                        │  Verify signature ✅  │
     │                   │                        │  payment_status=paid  │
     │◀── redirect to /track?paid=1 ──────────────────────────────────── │
```

### Защита от подмены суммы

`amount_total` для Stripe Checkout Session создаётся **только на бэкенде** из
`order.total_amount`, который уже лежит в БД. Фронтенд не передаёт сумму — только
`product_id` + `quantity`. Подменить сумму с клиента невозможно.

### Где хранятся ключи

| Ключ | Где хранить | Почему |
|------|-------------|--------|
| `STRIPE_SECRET_KEY` | `backend/.env` только | Используется только сервером |
| `STRIPE_WEBHOOK_SECRET` | `backend/.env` только | Используется только в webhook handler |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | `frontend/.env.local` | Публичный ключ, безопасен на клиенте (при Checkout не нужен вообще) |

---

## БЛОК 4 — Конкретные файлы, маршруты и код

### Шаг 1: Добавить `stripe_session_id` в схему БД

**Файл:** `backend/prisma/schema.prisma`

```prisma
model Order {
  // ... все существующие поля ...
  stripe_session_id String?   // ← добавить это поле
```

После изменения — создать миграцию:

```bash
cd backend
npx prisma migrate dev --name add_stripe_session_id
```

---

### Шаг 2: Установить Stripe в backend

```bash
cd backend
npm install stripe
```

---

### Шаг 3: Добавить переменные окружения

**`backend/.env`** — добавить:

```env
STRIPE_SECRET_KEY="sk_test_..."
STRIPE_WEBHOOK_SECRET="whsec_..."
BASE_URL="http://localhost:3000"
```

**`frontend/.env.local`** — убрать `STRIPE_SECRET_KEY` и `STRIPE_WEBHOOK_SECRET`, оставить только:

```env
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY="pk_test_..."   # нужен только при Payment Element
NEXT_PUBLIC_BASE_URL="http://localhost:3000"
NEXT_PUBLIC_API_URL="http://localhost:4000"
```

---

### Шаг 4: Изменить `POST /api/orders` в backend

**Файл:** `backend/src/routes/public/orders.ts`

Добавить в начало файла:

```typescript
import Stripe from "stripe";
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: "2024-06-20" });
```

В конце обработчика, после `prisma.order.create(...)`, заменить `return reply.code(201).send(...)` на:

```typescript
// Если способ оплаты — stripe, создаём Checkout Session
if (body.payment_method === "stripe") {
  const baseUrl = process.env.BASE_URL ?? "http://localhost:3000";

  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    payment_method_types: ["card"],
    line_items: resolvedItems.map((item) => ({
      price_data: {
        currency: "eur",
        unit_amount: Math.round(item.unit_price * 100), // Stripe принимает центы
        product_data: { name: item.product_name_snapshot },
      },
      quantity: item.quantity,
    })),
    metadata: { orderId: order.id },
    success_url: `${baseUrl}/track/${order.tracking_token}?paid=1`,
    cancel_url:  `${baseUrl}/checkout?cancelled=1`,
  });

  // Сохранить stripe session id в заказе
  await prisma.order.update({
    where: { id: order.id },
    data: { stripe_session_id: session.id },
  });

  return reply.code(201).send({
    ok: true,
    data: {
      order_number: order.order_number,
      tracking_token: order.tracking_token,
      total_amount: totalAmount,
      stripe_checkout_url: session.url, // ← фронт делает redirect сюда
    },
  });
}

// Для остальных методов оплаты — прежнее поведение
return reply.code(201).send({
  ok: true,
  data: {
    order_number: order.order_number,
    tracking_token: order.tracking_token,
    total_amount: totalAmount,
  },
});
```

---

### Шаг 5: Создать webhook-обработчик

**Новый файл:** `backend/src/routes/public/stripe.ts`

```typescript
import { FastifyInstance } from "fastify";
import Stripe from "stripe";
import { prisma } from "../../lib/prisma";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: "2024-06-20" });

export default async function stripeRoutes(app: FastifyInstance) {
  app.post(
    "/stripe/webhook",
    { config: { rawBody: true } },
    async (req, reply) => {
      const sig = req.headers["stripe-signature"] as string;
      const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;

      let event: Stripe.Event;
      try {
        // ⚠️ Обязательно использовать rawBody для верификации подписи Stripe
        event = stripe.webhooks.constructEvent(
          (req as any).rawBody,
          sig,
          webhookSecret
        );
      } catch (err: any) {
        return reply.code(400).send({ error: `Webhook signature failed: ${err.message}` });
      }

      if (event.type === "checkout.session.completed") {
        const session = event.data.object as Stripe.Checkout.Session;
        const orderId = session.metadata?.orderId;

        if (orderId) {
          await prisma.order.update({
            where: { id: orderId },
            data: { payment_status: "paid" },
          });
        }
      }

      return reply.code(200).send({ received: true });
    }
  );
}
```

---

### Шаг 6: Настроить rawBody + зарегистрировать stripeRoutes в `app.ts`

**Файл:** `backend/src/app.ts`

Fastify по умолчанию не сохраняет raw body. Нужно добавить content-type parser
**до** регистрации других плагинов:

```typescript
import stripeRoutes from "./routes/public/stripe";

// В функции start(), ПЕРЕД app.register(fastifyCors, ...) :
app.addContentTypeParser(
  "application/json",
  { parseAs: "buffer" },
  (req, body, done) => {
    (req as any).rawBody = body;
    try {
      done(null, JSON.parse(body.toString()));
    } catch (err: any) {
      done(err);
    }
  }
);

// После регистрации publicOrdersRoutes добавить:
app.register(stripeRoutes, { prefix: "/api" });
```

---

### Шаг 7: Изменить checkout на фронтенде

**Файл:** `frontend/src/app/(site)/checkout/page.tsx`

В функции `handleSubmit`, в блоке `if (!data.ok) { ... } else { ... }`:

```typescript
if (!data.ok) {
  setError(data.error ?? "Ошибка при оформлении заказа");
} else {
  clearCart();
  // Если Stripe — редирект на Stripe Checkout hosted page
  if (data.data.stripe_checkout_url) {
    window.location.href = data.data.stripe_checkout_url;
  } else {
    router.push(`/track/${data.data.tracking_token}`);
  }
}
```

---

### Шаг 8 (дополнительно): Настроить Stripe CLI для локального тестирования webhook

```bash
stripe listen --forward-to http://localhost:4000/api/stripe/webhook
```

CLI выдаст `STRIPE_WEBHOOK_SECRET` для локальной разработки.

---

## Итоговый список изменений

| Файл | Действие |
|------|----------|
| `backend/prisma/schema.prisma` | Добавить `stripe_session_id String?` в модель `Order` |
| `backend/` | `npm install stripe` |
| `backend/.env` | Добавить `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `BASE_URL` |
| `backend/src/app.ts` | raw body parser + регистрация stripeRoutes |
| `backend/src/routes/public/orders.ts` | Создание Stripe Session при `payment_method=stripe` |
| `backend/src/routes/public/stripe.ts` | **Новый файл** — webhook handler |
| `frontend/.env.local` | Убрать `STRIPE_SECRET_KEY`, оставить только публичный ключ |
| `frontend/src/app/(site)/checkout/page.tsx` | Редирект на `stripe_checkout_url` |

---

## Дополнительно: известные проблемы вне Stripe

- **`delivery_zone_id` не передаётся из формы checkout** — поле выбора зоны доставки
  отсутствует в `checkout/page.tsx`, из-за чего `delivery_fee` всегда равен `0`.
  Это самостоятельный баг, который нужно исправить.
