# 🧪 Тестирование Payment Integration на yappisushi.ee

**Окружение:** Production сервер с реальным доменом yappisushi.ee

---

## Шаг 1: Предварительная настройка Production

### Убедитесь что все готово:
```bash
# SSH на сервер yappisushi.ee
ssh user@yappisushi.ee

# Проверьте что backend работает
curl https://api.yappisushi.ee/health

# Проверьте что frontend доступен
curl -I https://yappisushi.ee

# Проверьте миграции применены
cd /var/www/yappi-backend
npx prisma migrate status
```

### Переменные окружения установлены:
```bash
# backend/.env содержит:
# STRIPE_SECRET_KEY=sk_live_... (production, не test)
# STRIPE_WEBHOOK_SECRET=whsec_... (из Stripe endpoint)
# BASE_URL=https://yappisushi.ee

# frontend/.env.production содержит:
# NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_... (production)
# NEXT_PUBLIC_API_URL=https://api.yappisushi.ee
```

---

## Сценарий 1: Успешный платёж Stripe ✅

**Цель:** Завершить успешный платёж через Stripe

**Шаги:**
1. Откройте https://yappisushi.ee
2. Добавьте товары в корзину
3. Перейдите на страницу checkout
4. Выберите "Stripe" как способ оплаты
5. Заполните данные заказа
6. Нажмите "Оформить заказ"
7. Перенаправите на страницу Stripe checkout
8. Введите **тестовую карту:**
   - Номер: 4242 4242 4242 4242
   - Дата: 12/26 (или любая будущая)
   - CVC: 123
9. Нажмите "Pay"
10. Должны перенаправить обратно на `/track/[token]?paid=1`

**Проверка результатов:**
```bash
# SSH на сервер и проверьте БД
psql yappi_db

SELECT order_number, payment_status, payment_method, stripe_session_id
FROM "Order" 
WHERE payment_method = 'stripe' 
ORDER BY created_at DESC LIMIT 1;

# Должно быть:
# payment_status = 'paid'
# stripe_session_id = 'cs_...'
```

**Проверка на фронтенде:**
- ✅ Корзина очищена
- ✅ Заказ видна со статусом: "✅ Оплачено"
- ✅ Зелёный баннер объясняет что webhook обрабатывается

---

## Сценарий 2: Отмена платежа и восстановление

**Цель:** Пользователь отменяет платёж, может восстановить форму

**Шаги:**
1. Откройте https://yappisushi.ee
2. Добавьте товары в корзину
3. Перейдите на checkout, **заполните ВСЕ поля полностью**
4. Запомните что вы ввели (имя, адрес и т.д.)
5. Выберите Stripe, нажмите "Оформить заказ"
6. На странице Stripe checkout нажмите "← Return to yappisushi" или "Back"
7. Должны вернуться на `https://yappisushi.ee/checkout?cancelled=1`

**Проверка результатов:**
- ✅ Жёлтый баннер объясняет что вы отменили платёж
- ✅ Форма ВСЕ ещё заполнена (с вашими данными)
- ✅ Корзина ВСЕ ещё содержит товары
- ✅ Можните изменить данные и повторить оплату

```bash
# На сервере: заказ должен быть created но NOT paid
psql yappi_db
SELECT order_number, payment_status, status FROM "Order" 
WHERE payment_method = 'stripe' AND payment_status = 'pending'
ORDER BY created_at DESC LIMIT 1;

# Должно быть:
# payment_status = 'pending' (не был оплачен)
# status = 'new' (заказ создан но не подтверждён)
```

---

## Сценарий 3: Дублирование платежей (Stripe) - антидублирование

**Цель:** Убедиться что двойной клик не создаёт два заказа

**Шаги (способ 1 - быстрый клик):**
1. Откройте https://yappisushi.ee и добавьте товары
2. На checkout опустить вниз до кнопки "Оформить заказ"
3. Откройте DevTools (F12) → Network tab
4. Быстро **дважды кликните** "Оформить заказ"
5. В Network посмотрите requests

**Способ 2 - более надежный:**
```bash
# На вашем компьютере, в bash/PowerShell:
ORDER_DATA='{"type":"pickup","payment_method":"stripe","customer_name":"Test",
"customer_phone":"+372555","items":[{"product_id":"prod1","quantity":1}]}'

# Отправьте на сервер ДВА быстрых запроса
curl -X POST https://api.yappisushi.ee/api/orders \
  -H "Content-Type: application/json" \
  -d "$ORDER_DATA" &

curl -X POST https://api.yappisushi.ee/api/orders \
  -H "Content-Type: application/json" \
  -d "$ORDER_DATA" &

wait
```

**Проверка результатов:**
```bash
# SSH на сервер
psql yappi_db

# Оба запроса должны вернуть ОДИНАКОВЫЙ order_number
# Проверьте что создан только ОДИН заказ:
SELECT COUNT(*), order_number FROM "Order" 
WHERE payment_method = 'stripe' 
AND checkout_fingerprint = 'the-fingerprint'
GROUP BY order_number;

# Должно быть только 1 запись (не 2 дубликата)
```

---

## Сценарий 4: Наличная оплата (сразу, без Stripe)

**Цель:** Проверить что cash payment работает немедленно

**Шаги:**
1. Откройте https://yappisushi.ee, добавьте товары
2. Перейдите на checkout
3. Выберите "💰 Наличные на самовывоз" (или доставку)
4. Заполните данные
5. Нажмите "Оформить заказ"
6. **Должны остаться на той же странице с сообщением об успехе**
7. БЕЗ перенаправления на Stripe (мгновенно)

**Проверка результатов:**
```bash
psql yappi_db

SELECT order_number, payment_method, payment_status 
FROM "Order" 
WHERE payment_method = 'cash_on_pickup' 
ORDER BY created_at DESC LIMIT 1;

# Должно быть:
# payment_status = 'pending' (ждёт оплаты наличными)
# payment_method = 'cash_on_pickup'
```

**На фронтенде:**
- ✅ Статус оплаты: "⏳ Ожидание" (жёлтый значок)
- ✅ Корзина очищена
- ✅ Виден номер заказа для отслеживания

---

## Сценарий 5: Дублирование cash/card заказов

**Цель:** Быстрые повторы не создают дубликаты наличных заказов

**Шаги:**
1. Подготовьте the same order на checkout (cash payment)
2. Быстро нажмите "Оформить заказ" ДВА раза
3. Или используйте curl (как в Сценарии 3) с cash_on_pickup

**Проверка результатов:**
```bash
psql yappi_db

# Оба запроса должны вернуть ОДИНАКОВЫЙ order_number
# Проверьте что только ОДИН заказ создан:
SELECT COUNT(*), order_number FROM "Order" 
WHERE payment_method = 'cash_on_pickup' 
AND checkout_fingerprint = 'the-same-fingerprint'
GROUP BY order_number;

# Должно быть 1 запись (антидублирование работает)
```

---

## Сценарий 6: Нулевая сумма Stripe блокировка

**Цель:** Stripe отклоняет заказы с нулевой суммой

**Шаги:**
1. Откройте https://yappisushi.ee
2. Добавьте товар стоимостью 5 EUR
3. Примените скидку (промо-код) на 10 EUR (больше чем товар)
4. Итого становится = 0 или отрицательное
5. Выберите Stripe
6. Нажмите "Оформить заказ"

**Проверка результатов:**
- ✅ Получите ошибку: "Онлайн-оплата недоступна для заказа с нулевой суммой"
- ✅ Заказ НЕ создан
- ✅ Можете повторить с cash payment (это работает)

```bash
# На сервере: никакого заказа не должно быть создано
psql yappi_db
SELECT * FROM "Order" 
WHERE total_amount <= 0 AND payment_method = 'stripe'
LIMIT 1;

# Не должно вернуть результаты (заказ заблокирован)
```

---

## Сценарий 7: Webhook идемпотентность

**Цель:** Повторный webhook не дублирует платёж

**Шаги:**
1. Завершите успешный Stripe платёж (Сценарий 1)
2. Дождитесь что payment_status = 'paid'
3. На Stripe Dashboard → Developers → Webhooks:
   - Выберите ваш endpoint
   - Найдите `checkout.session.completed` event
   - Нажмите "Resend"
4. Webhook переотправится

**Проверка результатов:**
```bash
psql yappi_db

# payment_status должен остаться 'paid' (не дублировать)
SELECT order_number, payment_status, updated_at 
FROM "Order" 
WHERE stripe_session_id = 'cs_...'
ORDER BY updated_at DESC;

# Должно быть только ОДНО обновление на paid
# Дата updated_at не изменилась (webhook был идемпотентным)
```

---

## Сценарий 8: Отслеживание заказа - статус оплаты

**Цель:** Проверить что ui правильно показывает payment_status

**Шаги:**
1. Завершите несколько заказов разными методами:
   - Один с Stripe (paid)
   - Один с наличными (pending)
   - (Если можно) один marked as failed
2. Перейдите на страницу отслеживания каждого

**Проверка результатов на на фронтенде:**
```
Заказ Stripe (paid):
✅ Статус оплаты: ✅ Оплачено (зелёный значок)

Заказ наличные (pending):
✅ Статус оплаты: ⏳ Ожидание (жёлтый значок)

Заказ failed:
✅ Статус оплаты: ❌ Не оплачено (красный значок)
```

---

## Сценарий 9: Промо-кода - отложенная регистрация (Stripe)

**Цель:** Промо регистрируется только после webhook, не раньше

**Предварительно:**
- Создайте в админке промо-код "TEST50" с скидкой 5 EUR

**Шаги:**
1. На https://yappisushi.ee добавьте товары (общая сумма 20 EUR)
2. На checkout введите промо "TEST50"
3. Выберите Stripe, оформите заказ
4. Завершите платёж на Stripe
5. Дождитесь webhook (обычно 1-3 сек)

**Проверка результатов:**
```bash
psql yappi_db

# Проверить что PromoCodeUsage создан ТОЛЬКО ОДИН раз и ПОСЛЕ webhook
SELECT order_id, promo_code_id, phone, discount_amount, created_at
FROM "PromoCodeUsage"
WHERE phone = '+372555...'  # ваш номер
ORDER BY created_at DESC;

# Должна быть 1 запись
# Её created_at должно быть ПОСЛЕ того как payment_status = 'paid'
```

---

## Сценарий 10: Stripe Production Events Logs

**Цель:** Убедиться что Stripe прямо салит webhook события

**Шаги:**
1. Откройте https://yappisushi.ee, создайте Stripe платёж
2. Зайдите в Stripe Dashboard (production mode):
   - Developers → Webhooks → select your endpoint
   - Scroll to Events section

**Проверка результатов:**
- ✅ Видео `checkout.session.completed` events
- ✅ Статус каждого события: "✓ Accepted" (не Failed)
- ✅ Response code: 200 OK

```bash
# Или проверьте на сервере логи webhook:
tail -20 /var/log/yappi-backend/access.log | grep "POST /api/stripe/webhook"

# Должны видеть:
# POST /api/stripe/webhook HTTP/1.1" 200
```

---

## Debugging на Production

### Проверить что webhook endpoint доступна:
```bash
curl -v https://api.yappisushi.ee/api/stripe/webhook \
  -H "Content-Type: application/json" \
  -d '{}'

# Должен вернуть: 400 Bad Request (неверная подпись)
# Это нормально - значит endpoint открыта
```

### Проверить CORS:
```bash
curl -v https://api.yappisushi.ee/api/orders \
  -H "Origin: https://yappisushi.ee"

# Должен вернуть заголовок:
# Access-Control-Allow-Origin: https://yappisushi.ee
```

### Проверить SSL сертификат:
```bash
curl -v https://api.yappisushi.ee

# НЕ должно быть ошибок SSL
# Должен вернуть 200 OK
```

### Посмотреть логи бэкенда:
```bash
# SSH на сервер
ssh user@yappisushi.ee

# Реальные ошибки
sudo tail -100 /var/log/yappi-backend/error.log

# Все запросы
sudo tail -50 /var/log/yappi-backend/access.log
```

---

## Чек-лист завершения тестирования

- [ ] Сценарий 1: Stripe успех (payment_status = paid)
- [ ] Сценарий 2: Отмена и восстановление формы работают
- [ ] Сценарий 3: Дублирование Stripe предотвращено
- [ ] Сценарий 4: Наличные платежи создаются мгновенно
- [ ] Сценарий 5: Дублирование cash предотвращено
- [ ] Сценарий 6: Нулевая сумма блокирована для Stripe
- [ ] Сценарий 7: Webhook идемпотентен (повтор безопасен)
- [ ] Сценарий 8: UI показывает правильный payment_status
- [ ] Сценарий 9: Промо регистрируется после webhook
- [ ] Сценарий 10: Stripe logs показывают успешные events
- [ ] HTTPS работает для обоих доменов
- [ ] CORS правильно настроен
- [ ] Логи функционируют и показывают информацию
- [ ] Webhook endpoint доступна и готова

---

**Оценка времени тестирования:** 60-90 минут

**Статус:** ✅ Все готово. После завершения всех сценариев система готова к реальным платежам на yappisushi.ee

