Отлично, уже достаточно данных, чтобы собрать нормальный фундамент проекта и сразу строить его так, чтобы потом Flutter-приложение спокойно подключилось к тому же API.

Я бы тебе предложил не делать “сайт отдельно, приложение потом как-нибудь”, а сразу строить как:

frontend сайта
backend API
PostgreSQL база
admin panel
потом Flutter app на том же API

Это будет самый правильный путь.

Что у тебя по сути получается
Формат проекта
Одна точка
Самовывоз + доставка
Гостевой заказ без регистрации
Сайт + админка
в будущем Flutter-приложение
один общий backend/API
мультиязык: RU / EN / ET
онлайн-оплата + оплата на месте
статусы заказа
промокоды / акции / баннеры
кухонная роль отдельно
черно-красный стиль
Что я бы советовал по стеку

С учетом того, что ты будешь собирать через AI-агента и тебе нужен нормальный деплой:

Рекомендованный стек
Frontend сайта: Next.js 14/15
Admin panel: тоже внутри Next.js
Backend API: Next.js route handlers или отдельный Node backend
Database: PostgreSQL
ORM: Prisma
Auth для админки: simple login через email/password + roles
Файлы/картинки: S3-compatible storage или сначала просто storage/public
Payments: Stripe
Deploy frontend: Vercel
Deploy DB + backend если отдельный: Vultr
HTTPS: через Vercel на фронте, SSL на API-домене через Nginx + Let’s Encrypt
Что лучше: один Next.js или frontend + отдельный backend?

Для тебя я бы советовал:

Вариант A — лучший для старта

Next.js + PostgreSQL + Prisma + API routes

То есть:

сайт
админка
API
всё в одном проекте

Это удобно, потому что:

меньше кода и инфраструктуры
проще деплой
AI-агенту легче это собирать
потом Flutter сможет ходить в тот же API
Но

Если потом проект сильно вырастет, можно вынести backend отдельно.

Вариант B — более взрослая архитектура
frontend на Next.js
backend отдельно на NestJS / Express / Fastify
PostgreSQL отдельно

Это уже мощнее, но для старта тебе даст больше возни.

Мой совет

Начни с одного монорепо на Next.js + Prisma + Postgres.

Какие сущности должны быть в базе данных

Ниже даю уже почти готовую структуру, от которой можно плясать.

1. Categories

Категории меню.

Поля:

id
slug
name_ru
name_en
name_et
sort_order
is_active
created_at
updated_at

Примеры:

rolls
sets
sushi
drinks
sauces
2. Products

Товары.

Поля:

id
category_id
slug
name_ru
name_en
name_et
description_ru
description_en
description_et
image_url
base_price
old_price
is_active
is_hidden
is_available
is_combo
sku
sort_order
created_at
updated_at

Тут:

is_hidden — скрыт из меню
is_available — стоп-лист / временно нет
is_combo — это “комплект”
3. ProductVariants

Вариации товара.

Например:

8 шт
16 шт
большая порция
маленькая порция

Поля:

id
product_id
name_ru
name_en
name_et
price
is_default
is_active
sort_order

Если у товара нет вариаций — можно использовать base_price.
Если есть — выбор идет через variants.

4. ProductOptionGroups

Для палочек / соусов / васаби / имбиря.

Например группа:

Палочки
Васаби
Имбирь
Соевый соус

Поля:

id
name_ru
name_en
name_et
type (single, multiple, quantity)
is_required
sort_order
is_active
5. ProductOptionItems

Элементы внутри групп.

Пример:
Группа “Палочки”

1 комплект
2 комплекта
3 комплекта

Группа “Соевый соус”

1
2
3

Поля:

id
group_id
name_ru
name_en
name_et
price_delta
sort_order
is_active
6. ProductOptionGroupLinks

Потому что не у всех товаров одинаковые опции.

Поля:

id
product_id
option_group_id
7. PromoCodes

Промокоды.

Поля:

id
code
description
discount_type (percent, fixed)
discount_value
min_order_amount
max_discount_amount
usage_limit_total
usage_limit_per_phone
valid_from
valid_to
is_active
created_at
updated_at
8. PromoCodeUsages

Использование промокодов.

Поля:

id
promo_code_id
order_id
phone
discount_amount
used_at
9. Banners

Баннеры/акции на главной.

Поля:

id
title_ru
title_en
title_et
subtitle_ru
subtitle_en
subtitle_et
image_url
link_url
is_active
sort_order
starts_at
ends_at
10. DeliveryZones

Зоны доставки.

Поля:

id
name
delivery_fee
min_order_amount
free_delivery_from
is_active

Позже можно добавить:

polygon / geojson
postcode list
районы

Пока можно начать даже с простого:

зона 1
зона 2
зона 3
11. RestaurantSettings

Глобальные настройки.

Поля:

id
restaurant_name
phone
email
address_ru
address_en
address_et
pickup_enabled
delivery_enabled
stripe_enabled
cash_on_pickup_enabled
card_on_pickup_enabled
min_delivery_time_minutes
max_delivery_time_minutes
working_hours_json
social_links_json
updated_at
12. Orders

Основная таблица заказов.

Поля:

id
order_number
type (delivery, pickup)
status
payment_method (stripe, cash_on_pickup, card_on_pickup)
payment_status (pending, paid, failed, refunded, unpaid)
customer_name
customer_phone
address_line
apartment
entrance
floor
door_code
comment
subtotal_amount
delivery_fee
discount_amount
total_amount
currency
promo_code_id
delivery_zone_id
language_code
created_at
updated_at
confirmed_at
ready_at
sent_at
completed_at
cancelled_at
cancel_reason
13. OrderItems

Позиции заказа.

Поля:

id
order_id
product_id
product_variant_id
product_name_snapshot
variant_name_snapshot
unit_price
quantity
line_total

snapshot нужен, чтобы даже если потом товар поменяется, в заказе сохранилось как было на момент покупки.

14. OrderItemSelections

Выборы по палочкам/соусу/васаби и т.д.

Поля:

id
order_item_id
option_group_name_snapshot
option_item_name_snapshot
price_delta
quantity
15. AdminUsers

Пользователи админки.

Поля:

id
email
password_hash
full_name
role (admin, kitchen)
is_active
last_login_at
created_at
updated_at
16. AdminActionLogs

Логи действий админки.

Поля:

id
admin_user_id
action
entity_type
entity_id
payload_json
created_at

Это полезно, чтобы видеть кто поменял статус, цену, товар и т.д.

17. Devices / PushTokens

На будущее для Flutter.

Поля:

id
phone_or_user_key
platform
push_token
is_active
created_at
updated_at

Так как аккаунтов нет, можно будет потом придумать логику через устройство/номер телефона.

Статусы заказа

Ты уже дал хорошую основу. Я бы формализовал так:

Для всех заказов
new — только что создан
confirmed_preparing — подтвержден и готовится
ready — готов
sent — отправлен курьером
completed — завершен
cancelled — отменен
Логика
delivery
new
confirmed_preparing
sent
completed
cancelled
pickup
new
confirmed_preparing
ready
completed
cancelled

Это лучше, чем делать совсем разные статусы, потому что фронту и приложению проще.

Как должен работать заказ
Клиент
Открывает сайт
Выбирает язык
Смотрит меню
Добавляет товары
Выбирает:
палочки
соус
васаби
имбирь
Переходит в корзину
Выбирает:
доставка / самовывоз
Заполняет данные:
имя
телефон
адрес если доставка
подъезд
этаж
домофон
комментарий
Выбирает оплату:
Stripe
оплата на месте
Применяет промокод
Отправляет заказ
После создания
заказ попадает в админку/кухню
оператор меняет статус
сайт показывает текущий статус на странице заказа
Раз у тебя нет аккаунтов, как показывать статус заказа?

Вот тут важный момент.

Раз личного кабинета нет, я бы сделал так:

Вариант лучший

После заказа создается:

order_number
public_status_token

И клиенту показывается:

номер заказа
ссылка вида /track/XXXXXX-token

Тогда он может открыть страницу и посмотреть статус.

Это очень удобно даже без регистрации.

Роли в админке
admin

Полный доступ:

товары
категории
цены
скрытие товаров
баннеры
промокоды
зоны доставки
часы работы
аналитика
пользователи админки
заказы
kitchen

Ограниченный доступ:

список заказов
просмотр состава заказа
смена статусов
отметка готовности / отправки / отмены
комментарии по заказу

Кухне не нужен доступ к:

промокодам
баннерам
товарам
ролям
аналитике
глобальным настройкам
Какие страницы сайта нужны
Публичная часть
/ — главная
/menu — меню
/menu/[category]
/product/[slug] — карточка товара
/cart
/checkout
/track/[token] — отслеживание заказа
/promotions — акции, если захочешь отдельно
/contacts
/privacy
/terms
Админка
/admin/login
/admin
/admin/orders
/admin/orders/[id]
/admin/products
/admin/products/new
/admin/categories
/admin/promo-codes
/admin/banners
/admin/delivery-zones
/admin/settings
/admin/admin-users
/admin/analytics
Кухня

Можно отдельный роут:

/kitchen
/kitchen/orders/[id]

Или это может быть часть админки по role-based access.

API, который нужен

Сразу проектируй API так, чтобы и сайт, и Flutter ходили в одно место.

Public API
GET /api/categories
GET /api/products
GET /api/products/:slug
GET /api/banners
POST /api/cart/validate
POST /api/promo-codes/validate
POST /api/orders
GET /api/orders/track/:token
POST /api/payments/stripe/create-intent
POST /api/webhooks/stripe
Admin API
POST /api/admin/auth/login
POST /api/admin/auth/logout
GET /api/admin/me
GET /api/admin/orders
GET /api/admin/orders/:id
PATCH /api/admin/orders/:id/status
GET /api/admin/products
POST /api/admin/products
PATCH /api/admin/products/:id
DELETE /api/admin/products/:id
GET /api/admin/categories
POST /api/admin/categories
PATCH /api/admin/categories/:id
GET /api/admin/promo-codes
POST /api/admin/promo-codes
PATCH /api/admin/promo-codes/:id
GET /api/admin/banners
POST /api/admin/banners
PATCH /api/admin/banners/:id
GET /api/admin/delivery-zones
POST /api/admin/delivery-zones
PATCH /api/admin/delivery-zones/:id
GET /api/admin/settings
PATCH /api/admin/settings
GET /api/admin/analytics/overview
Как сделать мультиязык правильно

Не делай отдельные таблицы переводов на старте. Для MVP проще:

name_ru
name_en
name_et
description_ru
description_en
description_et

Это проще для AI-агента и быстрее в разработке.

Когда проект вырастет — можно будет вынести переводы отдельно.

По оплате

Ты хочешь:

Stripe
оплата на месте

Это хорошо.

Я бы делал так:
payment_method
stripe
cash_on_pickup
card_on_pickup

Если доставка и оплата на месте:

можно переименовать в более общее:
cash_on_delivery
card_on_delivery
cash_on_pickup
card_on_pickup

Либо сделать проще:

stripe
cash
card_on_site

Но для будущего лучше первый вариант.

payment_status
pending
paid
unpaid
failed
refunded
Про чеки

Тут важный нюанс:
если ты говоришь про фискальные чеки, это уже зависит от страны, кассовой логики и провайдера.
Если ты имеешь в виду просто order receipt / invoice-like summary, это легко.

На старте я бы делал:

PDF / HTML чек заказа
email-отправку можно добавить позже
полноценную кассовую интеграцию пока не трогать
Про деплой — как лучше у тебя

Ты написал:

сайт на Vercel
БД на Vultr
деплой через GitHub
HTTPS обязательно

Это нормальная схема.

Я бы сделал так
Vercel
фронт + Next.js app
Vultr
PostgreSQL
если понадобится отдельный backend/API
Nginx
SSL через Let’s Encrypt
Домен
yourdomain.com → Vercel
api.yourdomain.com → Vultr если API отдельно

Если API внутри Next.js — можно вообще сначала жить без отдельного API-домена.

Что бы я сделал именно в твоем случае
Самый разумный стартовый вариант

Next.js + Prisma + PostgreSQL
в одном репозитории.

Почему:
быстрее старт
проще через AI-агента
проще деплой
проще потом дорабатывать
Flutter потом подключишь к тому же API
Что важно не забыть в архитектуре
1. Snapshot данных заказа

Очень важно:
в заказе надо хранить не только product_id, но и:

название товара на момент заказа
цену на момент заказа
выбранные опции на момент заказа

Иначе потом цена изменится и старые заказы сломаются.

2. Public tracking token

Так как нет кабинета — обязателен.

3. Soft availability

Разделяй:

скрыт из меню
временно нет в наличии

Это две разные вещи.

4. Время работы ресторана

Нужно в settings:

часы по дням недели
открыт / закрыт
принимает ли заказы сейчас
5. Минимальная сумма доставки

Это тоже пригодится уже скоро.

6. Audit logs

Для админки очень полезно.

Roadmap разработки
Этап 1 — фундамент
создать Next.js проект
подключить PostgreSQL + Prisma
сделать базовую схему БД
настроить мультиязык
базовые сиды категорий
настроить admin auth
подготовить UI-kit в черно-красном стиле
Этап 2 — каталог
категории
список товаров
карточка товара
вариации
опции палочек/соуса/васаби/имбиря
скрытие товаров
стоп-лист
Этап 3 — корзина и checkout
корзина
guest checkout
доставка / самовывоз
адресные поля
промокоды
расчет totals
создание заказа
tracking page
Этап 4 — админка
логин
роли admin/kitchen
список заказов
смена статусов
CRUD товаров
CRUD категорий
промокоды
баннеры
настройки
Этап 5 — платежи
Stripe checkout/payment intent
webhook
payment status sync
Этап 6 — аналитика
количество заказов
выручка
популярные товары
отмены
Этап 7 — подготовка под Flutter
стабилизировать API
документировать responses
добавить tokens/device model
подготовить repeat order
сохранение адресов на будущее
Что еще стоит решить сейчас

Есть несколько решений, которые тебе лучше принять уже в начале:

1. Что делать с “пользователями” в админке?

Ты указал в админке “пользователи”, но аккаунтов клиентов нет.

Тут надо решить:

это будут только admin users
или
ты хочешь хранить базу клиентов по телефонам, которые заказывали

Я бы советовал:
сделать таблицу customers даже без регистрации.

Customers
id
name
phone
last_order_at
notes
created_at
updated_at

Это поможет:

видеть историю по телефону
потом сделать repeat order
потом проще перейти к приложению
2. Повтор заказа в будущем

Раз аккаунтов нет, повтор заказа в сайте пока неудобен.
Но для Flutter это пригодится.
Поэтому customers + orders = уже хорошая база.

3. Сохранение адресов

На сайте без аккаунта не обязательно.
Но в БД лучше уже предусмотреть:

customer_addresses

Пока не использовать, но структура пригодится.

Мой вывод по архитектуре

Для тебя я бы утверждал такой план:

Итоговая рекомендация
Next.js
TypeScript
PostgreSQL
Prisma
Vercel для сайта
Vultr для базы
Stripe
один API для сайта и Flutter
guest checkout
admin + kitchen roles
RU/EN/ET
черно-красный UI

Это очень нормальный, реальный стек под твой кейс.

Что я могу собрать тебе следующим сообщением

Я могу сразу дать тебе готовый стартовый pack для AI-агента, а именно:

точную структуру папок проекта
Prisma schema для этой системы
список API endpoints
описание ролей и прав
и пошаговый prompt для Gravity, чтобы он начал собирать проект правильно с нуля

Напиши: “собери стартовую архитектуру”, и я сразу разложу это в готовом виде под разработку.