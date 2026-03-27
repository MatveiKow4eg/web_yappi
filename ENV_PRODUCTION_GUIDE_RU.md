# 📝 ENV CONFIGURATION FOR YAPPISUSHI.EE PRODUCTION

## backend/.env (Production)

```env
# ═══════════════════════════════════════════════════════════
# STRIPE PRODUCTION KEYS (НЕ ТЕСТОВЫЕ!)
# ═══════════════════════════════════════════════════════════
# 1. Перейдите на https://dashboard.stripe.com/apikeys
# 2. Toggle "Viewing test data" → OFF (переключится на Production)
# 3. Скопируйте "Secret key" → вставьте вместо YOUR_PRODUCTION_KEY_HERE
# 4. Скопируйте "Webhook Secret" → вставьте вместо YOUR_WEBHOOK_SECRET_HERE
# ⚠️  НИКОГДА не коммитьте реальные ключи в git!

STRIPE_SECRET_KEY=sk_live_YOUR_PRODUCTION_KEY_HERE
STRIPE_WEBHOOK_SECRET=whsec_YOUR_WEBHOOK_SECRET_HERE

# ═══════════════════════════════════════════════════════════
# DATABASE (PostgreSQL)
# ═══════════════════════════════════════════════════════════
# Формат: postgresql://username:password@host:port/database

# Если локально на сервере:
DATABASE_URL=postgresql://yappi_user:your_secure_password@localhost:5432/yappi_db

# Если используете Heroku PostgreSQL:
# DATABASE_URL=postgresql://user:password@ec2-XX-XX-XX-XX.compute-1.amazonaws.com:5432/dbname

# Если используете managed database (DigitalOcean, Render, и т.д.):
# DATABASE_URL=postgresql://user:password@db.example.com:5432/yappi_db

# ═══════════════════════════════════════════════════════════
# ENVIRONMENT & SERVER
# ═══════════════════════════════════════════════════════════
NODE_ENV=production
PORT=4000

# ═══════════════════════════════════════════════════════════
# APPLICATION URLs
# ═══════════════════════════════════════════════════════════
# BASE_URL используется для редиректов после платежа Stripe
BASE_URL=https://yappisushi.ee

# CORS будет автоматически разрешать:
# - https://yappisushi.ee
# - https://www.yappisushi.ee

# ═══════════════════════════════════════════════════════════
# AUTHENTICATION & SECURITY
# ═══════════════════════════════════════════════════════════
# Генерируйте сильный secret с помощью:
# Linux/Mac: openssl rand -hex 32
# Windows PowerShell: -join ((0..31) | ForEach-Object { '{0:X2}' -f (Get-Random -Maximum 256) })
# ⚠️  НИКОГДА не используйте default значения - генерируйте уникальные для каждого deploy!

ADMIN_JWT_SECRET=GENERATE_YOUR_OWN_SECRET_DO_NOT_USE_THIS_EXAMPLE

# ═══════════════════════════════════════════════════════════
# LOGGING (опционально)
# ═══════════════════════════════════════════════════════════
LOG_LEVEL=info
# LOG_DIR=/var/log/yappi-backend

# ═══════════════════════════════════════════════════════════
# OPTIONAL MONITORING
# ═══════════════════════════════════════════════════════════
# SENTRY_DSN=https://xxxxx@sentry.io/xxxxx
# DATADOG_API_KEY=xxxxx
```

---

## frontend/.env.production (Production)

```env
# ═══════════════════════════════════════════════════════════
# STRIPE PRODUCTION PUBLIC KEY
# ═══════════════════════════════════════════════════════════
# From https://dashboard.stripe.com/apikeys (Production mode ON)
# Скопируйте "Publishable key" → вставьте вместо YOUR_PRODUCTION_KEY_HERE

NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_YOUR_PRODUCTION_KEY_HERE

# ═══════════════════════════════════════════════════════════
# API CONFIGURATION
# ═══════════════════════════════════════════════════════════
# URL where frontend calls backend API

NEXT_PUBLIC_API_URL=https://api.yappisushi.ee

# ═══════════════════════════════════════════════════════════
# ENVIRONMENT DETECTION
# ═══════════════════════════════════════════════════════════
NEXT_PUBLIC_ENVIRONMENT=production
```

---

## 🔐 Как получить Stripe Production Keys

### Шаг 1: Перейти в Stripe Dashboard
1. Откройте https://dashboard.stripe.com
2. **Убедитесь что переключена на Production mode** (в левом углу должна быть надпись "Viewing live data")

### Шаг 2: Скопировать API Keys
1. Перейдите: Settings → API Keys
2. Скопируйте:
   - **Secret key** (sk_live_...) → в `STRIPE_SECRET_KEY`
   - **Publishable key** (pk_live_...) → в `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`

### Шаг 3: Создать Webhook Secret
1. Перейдите: Developers → Webhooks
2. Нажмите "Add endpoint"
3. Введите URL: `https://api.yappisushi.ee/api/stripe/webhook`
4. Выберите события:
   - checkout.session.completed
   - checkout.session.expired
5. Нажмите "Add endpoint"
6. В открывшемся эндпоинте скопируйте "Signing secret" → в `STRIPE_WEBHOOK_SECRET`

---

## 📋 Production Deployment Checklist

### .env Configuration
- [ ] `STRIPE_SECRET_KEY` установлен (sk_live_...)
- [ ] `STRIPE_WEBHOOK_SECRET` установлен (whsec_...)
- [ ] `DATABASE_URL` указывает на production БД
- [ ] `BASE_URL` = https://yappisushi.ee (не localhost)
- [ ] `NEXT_PUBLIC_API_URL` = https://api.yappisushi.ee
- [ ] `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` установлен (pk_live_...)
- [ ] `ADMIN_JWT_SECRET` - сильный пароль, не в git
- [ ] `NODE_ENV` = production

### Security
- [ ] `.env` файлы ИСКЛЮЧЕНЫ из git (.gitignore)
- [ ] Secret keys НИКОГДА не закоммитаны в репозиторий
- [ ] Все ключи уникальны для production (не copy-paste из примеров)
- [ ] HTTPS/SSL настроен на обоих доменах
- [ ] CORS ограничен только на yappisushi.ee

### Testing
- [ ] Webhook endpoint доступна через https://api.yappisushi.ee/api/stripe/webhook
- [ ] Тестовый платёж выполнен успешно
- [ ] Payment status обновляется через webhook
- [ ] Интеграция прошла все 10 тестовых сценариев

---

## 🚨 ВАЖНО: Никогда не коммитить реальные ключи!

**GitHub Secret Scanning заблокирует push if обнаружит Stripe ключи!**

```bash
# .gitignore должен содержать (ОБЯЗАТЕЛЬНО):
.env
.env.local
.env.*.local
.env.production

# Проверьте что .env файлы игнорируются:
git check-ignore backend/.env frontend/.env.production
# Должен вернуть путь к файлу (это значит он игнорируется)

# Если .env уже был в git - удалите из истории:
git rm --cached backend/.env
git rm --cached frontend/.env.production
git commit -m "Remove .env files from git"
```

**GitHub будет блокировать push с реальными Stripe ключами** - это нормально, это защита. Все примеры в этом файле содержат плейсхолдеры, которые GitHub не считает настоящими секретами.

---

## Как работать с .env безопасно

### На коммит машине (локально):
```bash
# 1. Создайте .env с тестовыми ключами для разработки
echo "STRIPE_SECRET_KEY=sk_test_xxxxx_development_only" > backend/.env

# 2. Убедитесь что в .gitignore есть .env
grep "^\.env$" .gitignore || echo ".env" >> .gitignore

# 3. Проверьте что .env не коммитится
git status
git add -A
# .env не должно быть в списке
```

### На production сервере (yappisushi.ee):
```bash
# 1. SSH на сервер
ssh user@yappisushi.ee

# 2. Создайте .env с РЕАЛЬНЫМИ production ключами
nano /var/www/yappi-backend/.env

# 3. Добавьте все переменные из примера выше с реальными значениями

# 4. Установите правильные permissions
chmod 600 /var/www/yappi-backend/.env
chmod 600 /var/www/yappi-frontend/.env.production

# 5. Перезапустите backend service
sudo systemctl restart yappi-backend
```

---

## Verify Production Setup

```bash
# На сервере, проверить что .env загрузился:
cd /var/www/yappi-backend
node -e "console.log('STRIPE_SECRET_KEY:', process.env.STRIPE_SECRET_KEY ? '✓ SET' : '✗ MISSING')"

# Должно вывести:
# STRIPE_SECRET_KEY: ✓ SET

# Проверить connection к БД:
npx prisma db execute --stdin < /dev/null

# Если работает - БД connected
```

