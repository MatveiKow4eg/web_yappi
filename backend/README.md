# Yappi Sushi Backend

Fastify REST API — деплоится на Vultr, используется сайтом и Flutter-приложением.

## Локальный запуск

```bash
cd backend
npm install
npx prisma generate
npx prisma db push
npx prisma db seed   # если нужны тестовые данные
npm run dev          # → http://localhost:4000
```

## Переменные окружения (`.env`)

| Переменная | Описание |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string |
| `JWT_SECRET` | Секрет для JWT токенов (мин. 32 символа) |
| `PORT` | Порт (по умолчанию 4000) |
| `ALLOWED_ORIGINS` | Доменны через запятую (CORS) |
| `NODE_ENV` | `development` или `production` |

## Деплой на Vultr (Ubuntu)

```bash
# 1. Установить Node 20
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# 2. Установить PM2
sudo npm install -g pm2

# 3. Клонировать репо и собрать
git clone https://github.com/your/yappi-sushi.git
cd yappi-sushi/backend
npm install
npm run build

# 4. Настроить .env
cp .env.example .env
nano .env  # заполнить DATABASE_URL и JWT_SECRET

# 5. Накатить схему и seed
npx prisma generate
npx prisma db push
npx prisma db seed

# 6. Запустить через PM2
pm2 start dist/app.js --name yappi-backend
pm2 startup
pm2 save
```

## Nginx конфиг (api.yourdomain.com)

```nginx
server {
    listen 80;
    server_name api.yourdomain.com;

    location / {
        proxy_pass http://localhost:4000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_cache_bypass $http_upgrade;
    }
}
```

Затем: `sudo certbot --nginx -d api.yourdomain.com`

## API Endpoints

### Public
- `GET /health`
- `GET /api/categories`
- `GET /api/products?category=slug&search=q`
- `GET /api/products/:slug`
- `GET /api/banners`
- `POST /api/orders`
- `GET /api/orders/track/:token`
- `POST /api/promo-codes/validate`

### Admin (требует cookie `admin_token`)
- `POST /api/admin/auth/login`
- `POST /api/admin/auth/logout`
- `GET /api/admin/me`
- `GET/PATCH /api/admin/orders`
- `GET/PATCH /api/admin/orders/:id`
- `PATCH /api/admin/orders/:id/status`
- `GET/POST/PATCH/DELETE /api/admin/products`
- `GET/POST/PATCH /api/admin/categories`
- `GET/PATCH /api/admin/settings`
