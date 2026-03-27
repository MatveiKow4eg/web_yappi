# 🚀 Production Обновление (git pull)

**Сервер:** yappisushi.ee  
**Домен:** https://yappisushi.ee (frontend), https://api.yappisushi.ee (backend)  
**Режим:** Production обновление через git pull (код уже развёрнут)

---

**Это руководство для ОБНОВЛЕНИЯ** существующего кода через `git pull`.  
Если нужно первоначальное развёртывание - смотрите `PRODUCTION_DEPLOYMENT_QUICKSTART_RU.md`

## 1️⃣ Подготовка на production сервере (5 мин)

### SSH на сервер
```bash
ssh user@yappisushi.ee
```

### Перейдите в директорию проекта
```bash
# Предполагаем код уже в одной из этих директорий:
cd /var/www/yappi-app
# или
cd /home/user/yappi-app
# или где-то ещё...
```

### Обновите код через git pull
```bash
# Убедитесь что находитесь в главной директории проекта
pwd

# Получите последнюю версию кода
git pull origin main
# (или main, develop, production - в зависимости от вашей ветки)

# Проверьте что изменения загружены
git log --oneline -5
```

---

## 2️⃣ Конфигурация окружения (10 мин)

### Бэкенд .env
```bash
# На сервере создайте backend/.env
cd backend
nano .env
```

Вставьте (заполните реальными production ключами из Stripe):
```env
NODE_ENV=production
PORT=4000
BASE_URL=https://yappisushi.ee
DATABASE_URL=postgresql://yappi_user:password@localhost:5432/yappi_db
STRIPE_SECRET_KEY=sk_live_XXXXXXXXXXXXXXXXXXXXX
STRIPE_WEBHOOK_SECRET=whsec_XXXXXXXXXXXXXXXXXXXXX
ADMIN_JWT_SECRET=openssl-rand-hex-32-here
```

Сохраните: `Ctrl+O → Enter → Ctrl+X`

### Фронтенд .env.production
```bash
# На сервере создайте frontend/.env.production
cd ../frontend
nano .env.production
```

Вставьте:
```env
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_XXXXXXXXXXXXXXXXXXXXX
NEXT_PUBLIC_API_URL=https://api.yappisushi.ee
NEXT_PUBLIC_ENVIRONMENT=production
```

Сохраните: `Ctrl+O → Enter → Ctrl+X`

---

## 3️⃣ Обновление зависимостей (5 мин)

```bash
# Бэкенд
cd backend

# Обновить зависимости (если добавлены новые)
npm install --production

# Пересобрать TypeScript (обычно из нового кода)
npm run build

# Обновить Prisma клиент (если изменения в schema)
npx prisma generate

# Вернуться в главную директорию
cd ../

# Фронтенд
cd frontend

# Обновить зависимости
npm install --production

# Пересобрать фронтенд
npm run build

# Вернуться
cd ../
```

### Если зависимости НЕ изменились
```bash
# Можете пропустить npm install и сразу:
cd backend && npm run build && npx prisma generate
cd ../frontend && npm run build
```

---

## 4️⃣ Миграции БД (2 мин)

```bash
# Если были изменения в Prisma schema, примените миграции
cd backend
npx prisma migrate deploy

# Проверьте статус
npx prisma migrate status

# Если миграций не было - это хорошо, просто продолжайте
```

---

## 5️⃣ SSL/HTTPS (пропустить если уже настроен)

Если SSL уже установлен Let's Encrypt на api.yappisushi.ee и yappisushi.ee - пропустите этот шаг.

Если нужно обновить сертификаты (они обычно auto-renew каждые 90 дней):
```bash
# Проверить статус сертификатов
sudo certbot certificates

# Обновить вручную (если не работает auto-renewal)
sudo certbot renew --force-renewal
```

---

## 6️⃣ Nginx настройки (пропустить если уже настроен)

### Создайте конфиг для API
```bash
sudo nano /etc/nginx/sites-available/yappi-api
```

Вставьте:
```nginx
server {
    listen 443 ssl http2;
    server_name api.yappisushi.ee;

    ssl_certificate /etc/letsencrypt/live/api.yappisushi.ee/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/api.yappisushi.ee/privkey.pem;

    client_max_body_size 10M;

    location / {
        proxy_pass http://localhost:4000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto https;
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # Webhook endpoint - preserve raw body
    location /api/stripe/webhook {
        proxy_pass http://localhost:4000;
        proxy_request_buffering off;
        proxy_set_header X-Forwarded-Proto https;
    }
}

server {
    listen 80;
    server_name api.yappisushi.ee;
    return 301 https://$server_name$request_uri;
}
```

### Создайте конфиг для фронтенда
```bash
sudo nano /etc/nginx/sites-available/yappi-frontend
```

Вставьте:
```nginx
server {
    listen 443 ssl http2;
    server_name yappisushi.ee www.yappisushi.ee;

    ssl_certificate /etc/letsencrypt/live/yappisushi.ee/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/yappisushi.ee/privkey.pem;

    location / {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto https;
    }
}

server {
    listen 80;
    server_name yappisushi.ee www.yappisushi.ee;
    return 301 https://$server_name$request_uri;
}
```

### Включите конфиги (если ещё не включены)
```bash
# Проверьте что конфиги уже в sites-enabled
ls -la /etc/nginx/sites-enabled/

# Если отсутствуют - создайте symlink'и:
sudo ln -s /etc/nginx/sites-available/yappi-api /etc/nginx/sites-enabled/ 2>/dev/null
sudo ln -s /etc/nginx/sites-available/yappi-frontend /etc/nginx/sites-enabled/ 2>/dev/null

# Протестируйте конфиг
sudo nginx -t
# Должно вывести: "test is successful"

# Перезагрузите если что-то изменилось
sudo systemctl reload nginx
```

---

## 7️⃣ Перезагрузка сервисов (2 мин)

Если сервисы уже настроены (yappi-backend.service и yappi-frontend.service):

```bash
# Перезагрузитесь daemon для применения новых .env
sudo systemctl daemon-reload

# Перезапустите сервисы
sudo systemctl restart yappi-backend yappi-frontend

# Проверьте статус
sudo systemctl status yappi-backend yappi-frontend

# Должны быть в статусе "active (running)"
```

### Если сервисы НЕ существуют
Если это первый раз deploying, создайте их согласно шагам ниже (см. раздел "Первоначальная настройка сервисов")

---

## 8️⃣ Stripe Webhook Endpoint (пропустить если уже добавлен)

Если webhook уже зарегистрирован в Stripe dashboard - пропустите.

Если нужно добавить:

1. Откройте https://dashboard.stripe.com (Production mode ON)
2. Перейдите: Developers → Webhooks
3. Нажмите "Add endpoint"
4. URL: `https://api.yappisushi.ee/api/stripe/webhook`
5. Выберите события:
   - `checkout.session.completed`
   - `checkout.session.expired`
6. Add endpoint
7. Скопируйте "Signing secret"
8. На сервере обновите backend/.env:
   ```bash
   cd /var/www/yappi-app/backend
   nano .env
   # Обновить STRIPE_WEBHOOK_SECRET=whsec_XXXXXXXXXXXXXXXXXXXXX
   ```
9. Перезапустите backend:
   ```bash
   sudo systemctl restart yappi-backend
   ```

---

## 9️⃣ Тестирование (15 мин)

### Проверьте что всё доступно
```bash
# Фронтенд
curl -I https://yappisushi.ee
# Должен вернуть 200 OK

# Бэкенд API
curl -I https://api.yappisushi.ee
# Должен вернуть 200 OK

# Webhook endpoint
curl -X POST https://api.yappisushi.ee/api/stripe/webhook \
  -H "Content-Type: application/json" \
  -d '{}'
# Должен вернуть 400 Bad Request (неверная подпись, это нормально)
```

### Первый Stripe платёж
1. Откройте https://yappisushi.ee
2. Добавьте товары
3. Checkout → Stripe
4. Используйте тестовую карту: 4242 4242 4242 4242
5. Дата: 12/26, CVC: 123
6. Завершите платёж

### Проверьте результат
```bash
# На сервере
psql yappi_db

SELECT order_number, payment_status, stripe_session_id 
FROM "Order" 
WHERE payment_method = 'stripe'
ORDER BY created_at DESC LIMIT 1;

# Должно быть: payment_status = 'paid'
```

---

## 🔟 Логирование и мониторинг

### Просмотр логов бэкенда
```bash
sudo journalctl -u yappi-backend -f
```

### Просмотр логов фронтенда
```bash
sudo journalctl -u yappi-frontend -f
```

### Проверка эффективности
```bash
# Использование CPU/память
top

# Дисковое пространство
df -h

# Логи БД
tail -20 /var/log/postgresql/postgresql.log
```

---

## 📋 Финальный чек-лист

- [ ] SSH доступ на сервер работает
- [ ] Dependencies установлены (backend и frontend)
- [ ] Миграции БД применены успешно
- [ ] SSL сертификаты установлены
- [ ] Nginx обратный прокси настроен
- [ ] Systemd сервисы запущены
- [ ] Webhook endpoint зарегистрирована в Stripe
- [ ] https://yappisushi.ee доступна
- [ ] https://api.yappisushi.ee доступна
- [ ] Первый Stripe платёж успешен
- [ ] Payment status обновился через webhook
- [ ] Логи показывают нормальную работу

---

## 🆘 Emergency commands

```bash
# Перезапустить бэкенд (если что-то сломалось)
sudo systemctl restart yappi-backend

# Прочитать заново .env (может потребоваться перезагрузка)
sudo systemctl daemon-reload
sudo systemctl restart yappi-backend

# Проверить что порты открыты
sudo netstat -tlnp | grep -E '3000|4000'

# Проверить что nginx работает
sudo systemctl status nginx

# Проверить CORS ошибки
sudo journalctl -u yappi-backend | grep -i cors

# Просмотреть все процессы Node
ps aux | grep node

# Остановить все Node процессы (осторожно!)
killall node

# Затем перезапустить сервисы
sudo systemctl restart yappi-backend yappi-frontend
```

---

**Статус:** ✅ Production обновлено черед git pull

**Время обновления:** ~10-15 минут  
**Сложность:** Легкая (просто git pull + rebuild + restart)

---

## 📝 Полное резюме процесса обновления

```bash
# 1. SSH на сервер
ssh user@yappisushi.ee

# 2. Перейти в папку проекта
cd /var/www/yappi-app

# 3. Получить новый код
git pull origin main

# 4. Обновить и пересобрать backend
cd backend
npm install --production
npm run build
npx prisma generate
npx prisma migrate deploy

# 5. Обновить и пересобрать frontend
cd ../frontend
npm install --production
npm run build

# 6. Перезагрузить сервисы
cd ..
sudo systemctl daemon-reload
sudo systemctl restart yappi-backend yappi-frontend

# 7. Проверить статус
sudo systemctl status yappi-backend yappi-frontend
```

## Первоначальная настройка сервисов

Если это ваш первый раз и сервисы ещё не созданы:

### Бэкенд сервис
```bash
sudo nano /etc/systemd/system/yappi-backend.service
```

Вставьте:
```ini
[Unit]
Description=Yappi Backend Service
After=network.target

[Service]
Type=simple
User=www-data
WorkingDirectory=/var/www/yappi-app/backend
Environment="NODE_ENV=production"
Environment="PATH=/usr/local/bin:/usr/bin:/bin"
ExecStart=/usr/bin/node dist/src/app.js
Restart=always
RestartSec=10
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
```

Сохраните: `Ctrl+O → Enter → Ctrl+X`

### Фронтенд сервис (если не используете Vercel)
```bash
sudo nano /etc/systemd/system/yappi-frontend.service
```

Вставьте:
```ini
[Unit]
Description=Yappi Frontend Service
After=network.target

[Service]
Type=simple
User=www-data
WorkingDirectory=/var/www/yappi-app/frontend
Environment="NODE_ENV=production"
ExecStart=/usr/bin/npm start
Restart=always
RestartSec=10
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
```

Сохраните: `Ctrl+O → Enter → Ctrl+X`

### Активируйте сервисы
```bash
sudo systemctl daemon-reload
sudo systemctl start yappi-backend yappi-frontend
sudo systemctl enable yappi-backend yappi-frontend

# Проверьте статус
sudo systemctl status yappi-backend yappi-frontend
```

