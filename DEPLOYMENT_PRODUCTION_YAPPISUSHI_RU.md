# 🚀 Развёртывание Payment Integration на yappisushi.ee

**Статус:** Production окружение с реальным доменом

---

## Step 1: Конфигурация окружения (Production)

### backend/.env (Production)
```env
# Stripe Production Keys (не тестовые!)
STRIPE_SECRET_KEY=sk_live_...  # Получить из Stripe dashboard
STRIPE_WEBHOOK_SECRET=whsec_...  # После регистрации endpoint'а

# Production URLs
BASE_URL=https://yappisushi.ee
DATABASE_URL=postgresql://user:password@localhost:5432/yappi_db  # или Heroku Postgres URL

# Admin JWT 
ADMIN_JWT_SECRET=very-secure-random-string-here

# NodeJS
NODE_ENV=production
PORT=4000
```

### frontend/.env.production (Production)
```env
# Stripe Production Keys
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...

# Production API
NEXT_PUBLIC_API_URL=https://api.yappisushi.ee

# Production Features
NEXT_PUBLIC_ENVIRONMENT=production
```

---

## Step 2: Регистрация Stripe Webhook для Production

### На сервере yappisushi.ee:

1. **Убедитесь что бэкенд доступен снаружи:**
   ```bash
   curl https://api.yappisushi.ee/health
   # Должен вернуть OK или JSON ответ
   ```

2. **Зарегистрируйте webhook в Stripe Dashboard (Production):**
   - Перейдите: Stripe Dashboard → Developers → Webhooks
   - Click "Add Endpoint"
   - **URL:** `https://api.yappisushi.ee/api/stripe/webhook`
   - **Выберите события:**
     - `checkout.session.completed`
     - `checkout.session.expired`
   - Click "Add endpoint"
   - Скопируйте **Signing Secret** → сохраните в `STRIPE_WEBHOOK_SECRET`

3. **Тестируйте подпись webhook:**
   ```bash
   # Stripe пошлёт тестовый event
   # Проверьте бэкенд логи:
   tail -f /var/log/yappi-backend/error.log | grep webhook
   # Должны увидеть успешную проверку подписи
   ```

---

## Step 3: CORS для Production

### backend/src/app.ts
```typescript
// Добавить правильный origin для production
const corsOrigins = process.env.NODE_ENV === 'production'
  ? ['https://yappisushi.ee', 'https://www.yappisushi.ee']
  : ['http://localhost:3000']

app.register(cors, {
  origin: corsOrigins,
  credentials: true,
})
```

---

## Step 4: SSL/HTTPS обязателен

### Проверьте что оба домена используют HTTPS:

```bash
# Проверка фронтенда
curl -I https://yappisushi.ee
# Должен вернуть 200, и заголовок будет показывать HTTPS

# Проверка бэкенда API
curl -I https://api.yappisushi.ee
# Должен вернуть 200 с HTTPS
```

### Если используете Nginx reverse proxy:

```nginx
server {
    listen 443 ssl http2;
    server_name api.yappisushi.ee;

    ssl_certificate /etc/letsencrypt/live/api.yappisushi.ee/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/api.yappisushi.ee/privkey.pem;

    location / {
        proxy_pass http://localhost:4000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location /api/stripe/webhook {
        # Stripe требует raw body для проверки подписи
        proxy_pass http://localhost:4000;
        proxy_request_buffering off;
    }
}

# Редирект с http на https
server {
    listen 80;
    server_name api.yappisushi.ee;
    return 301 https://$server_name$request_uri;
}
```

---

## Step 5: Миграции БД на Production

```bash
# На сервере yappisushi.ee, в директории backend:
cd /var/www/yappi-backend

# Применить все миграции
npx prisma migrate deploy

# Проверить статус
npx prisma migrate status
```

---

## Step 6: Запуск сервисов на Production

### Backend (systemd service)
```bash
# /etc/systemd/system/yappi-backend.service
[Unit]
Description=Yappi Backend Service
After=network.target

[Service]
Type=simple
User=www-data
WorkingDirectory=/var/www/yappi-backend
Environment="NODE_ENV=production"
Environment="PATH=/usr/local/bin:/usr/bin:/bin"
ExecStart=/usr/bin/node /var/www/yappi-backend/dist/src/app.js
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

```bash
# Запустить
sudo systemctl start yappi-backend
sudo systemctl enable yappi-backend

# Проверить статус
sudo systemctl status yappi-backend
```

### Frontend (Next.js production build)
```bash
# На сервере, в директории frontend:
npm run build
npm start
# или используйте PM2:
pm2 start "npm start" --name "yappi-frontend"
```

---

## Step 7: Тестирование Payment Flow на Production

### Test 1: Stripe Success
```bash
# Посетите: https://yappisushi.ee
# 1. Добавьте товары в корзину
# 2. Перейдите на checkout
# 3. Выберите Stripe payment
# 4. Используйте тестовую карту: 4242 4242 4242 4242
# 5. Дата: 12/26, CVC: 123
# 6. Проверьте что payment_status = "paid"
```

### Test 2: Check Webhook Processing
```bash
# SSH на сервер и проверьте логи:
tail -f /var/log/yappi-backend/access.log | grep webhook
# Должны видеть POST запросы на /api/stripe/webhook

# Проверьте БД
psql yappi_db
SELECT order_number, payment_status, stripe_session_id 
FROM "Order" 
WHERE payment_method = 'stripe' 
ORDER BY created_at DESC LIMIT 5;
```

### Test 3: Duplicate Prevention
```bash
# Быстро сделайте два заказа на одинаковые товары
# Проверьте что order_number одинаковые (дубликат предотвращен)

# В БД:
SELECT order_number, checkout_fingerprint, COUNT(*) 
FROM "Order" 
GROUP BY order_number, checkout_fingerprint 
HAVING COUNT(*) > 1;
# Не должно вернуть resultы (нет дубликатов)
```

---

## Step 8: Мониторинг Production

### Логи
```bash
# Backend логи
sudo journalctl -u yappi-backend -f

# Ошибки платежей
grep "stripe\|payment\|webhook" /var/log/yappi-backend/error.log

# Access логи
tail -f /var/log/yappi-backend/access.log
```

### Stripe Dashboard Monitoring
1. Перейдите: Stripe Dashboard → Developers → Webhooks → Events
2. Проверьте что `checkout.session.completed` события приходят
3. Проверьте что нет `failed` или `error` статусов

### Database Backups
```bash
# Ежедневный backup БД
0 2 * * * pg_dump yappi_db > /backups/yappi_db_$(date +\%Y\%m\%d).sql

# Еженедельный backup на облако (AWS S3, DigitalOcean Spaces и т.д.)
0 3 * * 0 aws s3 cp /backups/yappi_db_*.sql s3://my-backup-bucket/
```

---

## Step 9: Production Security Checklist

- [ ] Stripe keys (sk_live_...) **НИКОГДА** не коммитить в git
- [ ] `.env` файлы исключены из git (.gitignore)
- [ ] HTTPS/SSL настроен на обоих доменах (api.yappisushi.ee и yappisushi.ee)
- [ ] CORS ограничен только на yappisushi.ee
- [ ] Database пароли сильные + используются переменные окружения
- [ ] Webhook endpoint защищен от DDoS (rate limiting)
- [ ] Все sensitive данные в переменных окружения, не в коде
- [ ] Production БД бэкапится регулярно
- [ ] Логирование настроено (error.log, access.log)
- [ ] Мониторинг alerts настроены (для Failed payments и webhook errors)

---

## Step 10: Deployment Pipeline

### При каждой версии:

```bash
# 1. Обновить код на сервере
cd /var/www/yappi-backend
git pull origin main

# 2. Install новые зависимости
npm install --production

# 3. Применить новые миграции (если есть)
npx prisma migrate deploy

# 4. Собрать TypeScript
npm run build

# 5. Перезапустить service
sudo systemctl restart yappi-backend

# 6. Проверить статус
sudo systemctl status yappi-backend

# 7. Тестовый платёж валидации
# На https://yappisushi.ee выполните быстрый test платёж
```

---

## Troubleshooting на Production

### Проблема: Webhook не приходит
```bash
# 1. Проверьте что API доступен:
curl -v https://api.yappisushi.ee/api/stripe/webhook \
  -H "Content-Type: application/json" \
  -d '{}'
# Должен вернуть 400 (bad signature) но БЕЗ connection refused

# 2. Проверьте Stripe endpoint status
# Stripe Dashboard → Webhooks → select endpoint → View logs
```

### Проблема: Payment status не обновляется
```bash
# 1. Проверьте webhook был получен:
tail -50 /var/log/yappi-backend/access.log | grep webhook

# 2. Проверьте order в БД:
psql yappi_db
SELECT * FROM "Order" WHERE order_number = 'YS-XXXXX';

# 3. Проверьте есть ли ошибка в payment_status update
# Посмотрите в error.log на момент платежа
```

### Проблема: CORS блокирует запросы
```bash
# Фронтенд console покажет:
# "Access to XMLHttpRequest blocked by CORS policy"

# Решение: убедитесь что в backend/src/app.ts
# origin включает https://yappisushi.ee

app.register(cors, {
  origin: ['https://yappisushi.ee', 'https://www.yappisushi.ee'],
})
```

---

## Финальный чек-лист перед "live"

- [ ] STRIPE_SECRET_KEY = sk_live_... (не test)
- [ ] STRIPE_WEBHOOK_SECRET = whsec_... (из Stripe production endpoint)
- [ ] BASE_URL = https://yappisushi.ee
- [ ] NEXT_PUBLIC_API_URL = https://api.yappisushi.ee
- [ ] HTTPS работает на обоих доменах
- [ ] CORS правильно настроен
- [ ] Миграции БД применены
- [ ] Webhook endpoint зарегистрирован в Stripe production
- [ ] Тестовый платёж успешен и payment_status обновляется
- [ ] Дубликаты предотвращены (быстрые клики вернули одинаковые order_number)
- [ ] Бэкапы настроены
- [ ] Мониторинг логов активирован

---

**Когда готово:** Система готова к приёму реальных платежей через Stripe на yappisushi.ee

**Поддержка:** При проблемах проверьте:
1. Stripe webhook logs (production events)
2. Backend error logs (/var/log/yappi-backend/error.log)
3. Database orders (psql запросы выше)
4. HTTPS certificates (ssl test на ssl-labs.com)

