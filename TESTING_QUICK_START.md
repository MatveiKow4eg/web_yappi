# 🧪 Local Testing Quick Start

## Step 1: Environment Setup (5 min)

### Install Dependencies
```bash
# Backend
cd backend
npm install

# Frontend  
cd ../frontend
npm install
```

### Configure .env Files

**`backend/.env`** (create if missing):
```env
# Stripe Test Keys (from https://dashboard.stripe.com/test/keys)
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# API Configuration
BASE_URL=http://localhost:3000
DATABASE_URL=postgresql://user:password@localhost:5432/yappi

# Admin JWT Secret
ADMIN_JWT_SECRET=your-secret-key-here
```

**`frontend/.env.local`** (create if missing):
```env
# Stripe Public Key
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...

# API URL
NEXT_PUBLIC_API_URL=http://localhost:4000
```

### Start Database
```bash
# If using PostgreSQL locally
psql -U postgres

# Create database if needed
CREATE DATABASE yappi;

# Then apply migrations
cd backend
npx prisma migrate deploy
npx prisma generate
```

---

## Step 2: Start Services (3 min)

### Terminal 1: Backend
```bash
cd backend
npm run dev
# Should see: ✓ Server listening on http://0.0.0.0:4000
```

### Terminal 2: Frontend
```bash
cd frontend
npm run dev
# Should see: ▲ Next.js App Router v14.x
# Ready at: http://localhost:3000
```

---

## Step 3: Verify Everything Works (2 min)

```bash
# In a 3rd terminal, check both services are up
curl http://localhost:4000/health  # Should return OK or similar
curl http://localhost:3000  # Should return HTML
```

---

## Step 4: Run Test Scenarios (30-45 min)

### Test 1: Stripe Success ✅
1. Open http://localhost:3000
2. Add items to cart
3. Go to checkout
4. Select **Stripe** payment
5. Fill form → Click "Оформить заказ"
6. On Stripe page: use test card **4242 4242 4242 4242**
7. Any future date + CVC (e.g., 12/26, 123)
8. Click "Pay"
9. Should redirect to `/track/[token]?paid=1`
10. **Verify:**
    - ✅ Cart cleared
    - ✅ Order visible with "✅ Оплачено"
    - ✅ Green banner about webhook processing

### Test 2: Stripe Cancel
1. Add items, go to checkout
2. Select Stripe, fill form
3. Click "Оформить заказ"
4. On Stripe: click "Cancel" or close
5. Should return to `/checkout?cancelled=1`
6. **Verify:**
    - ✅ Amber banner explaining cancel
    - ✅ Form still filled with values
    - ✅ Cart still has items

### Test 3: Duplicate Prevention (Stripe)
1. Fill checkout form, select Stripe
2. Open browser DevTools (F12) → Network tab
3. Click "Оформить заказ"
4. Immediately (before response) open an incognito tab
5. Paste the same order request
6. **Verify:**
    - ✅ Both return SAME order_number
    - ✅ Only ONE stripe_session_id in database

**Alternative (faster):**
```bash
# Terminal: rapid order creation
for i in {1..5}; do
  curl -X POST http://localhost:4000/api/orders \
    -H "Content-Type: application/json" \
    -d '{"type":"pickup","payment_method":"stripe",..."}'
  sleep 0.1
done
# Should get 5 responses all with same order_number
```

### Test 4: Cash Payment (Immediate)
1. Add items, go to checkout
2. Select **Cash on Pickup**, fill form
3. Click "Оформить заказ"
4. **Verify:**
    - ✅ No Stripe redirect (instant success)
    - ✅ Order visible with "⏳ Ожидание" (yellow badge)

### Test 5: Duplicate Prevention (Cash)
1. Rapid double-click: "Оформить заказ"
2. **Verify:**
    - ✅ Both requests return SAME order_number
    - ✅ Only ONE order in database

### Test 6: Zero-Amount Order Guard
1. Add 1 item (5 EUR), apply 10 EUR discount promo
2. Total becomes 0 or negative
3. Select Stripe, click "Оформить заказ"
4. **Verify:**
    - ✅ Error: "Онлайн-оплата недоступна..."
    - ✅ Can retry with cash/card

### Test 7: Promo Code Deduplication (Stripe)
1. Create order with Stripe + promo code
2. Complete payment
3. Wait ~3 seconds for webhook
4. Check database promo usage: `SELECT * FROM "PromoCodeUsage";`
5. **Verify:**
    - ✅ Exactly ONE entry (not created before webhook)

### Test 8: Track Page Payment Status
1. View pending cash order: should show "⏳ Ожидание" (yellow)
2. View paid Stripe order: should show "✅ Оплачено" (green)
3. **Verify:**
    - ✅ Both display payment status separately from order status
    - ✅ Correct badge colors

### Test Advanced: Webhook Manual Retry
1. Complete Stripe payment successfully
2. Open Stripe Dashboard → Developers → Webhooks
3. Find your endpoint → Select a test event
4. Scroll down → Click "Resend"
5. Check backend logs: webhook received again
6. **Verify:**
    - ✅ Order payment_status still "paid" (no duplicates)
    - ✅ PromoCodeUsage still count = 1

---

## Debugging

### Check Backend Logs
```bash
# Look for payment errors
grep -i "stripe\|payment\|webhook" backend.log
```

### View Database Orders
```bash
# Using psql
psql yappi
SELECT order_number, payment_status, stripe_session_id, checkout_fingerprint 
FROM "Order" 
ORDER BY created_at DESC LIMIT 5;
```

### Test Webhook Manually
```bash
# Get a real webhook payload from Stripe Dashboard, then:
curl -X POST http://localhost:4000/api/stripe/webhook \
  -H "Content-Type: application/json" \
  -H "stripe-signature: t=...,v1=..." \
  -d '{...webhook payload...}'
```

### Check TypeScript Errors
```bash
cd backend && npx tsc --noEmit
cd ../frontend && npx tsc --noEmit
```

---

## Common Test Issues

| Issue | Solution |
|-------|----------|
| Stripe test card rejected | Use only `4242 4242 4242 4242` for tests |
| "Database not connected" | Check PostgreSQL is running + DATABASE_URL |
| Webhook not firing | Check STRIPE_WEBHOOK_SECRET matches in Stripe dashboard |
| Order doesn't update to paid | Wait 3-5 seconds, then refresh (webhook processing) |
| Payment button disabled | Check that total_amount > 0 |
| Form not auto-filling after cancel | Clear browser localStorage if confused state |

---

## Test Sign-Off Checklist

- [ ] Stripe success payment works end-to-end
- [ ] Stripe cancel returns to checkout with form intact
- [ ] Duplicate orders prevented (fingerprinting works)
- [ ] Cash/card payment creates order immediately
- [ ] Zero-amount orders blocked for Stripe
- [ ] Promo code deferred to webhook (Stripe)
- [ ] Track page shows payment status correctly
- [ ] Webhook retry is idempotent (safe to resend)
- [ ] Backend TypeScript: `npx tsc --noEmit` clean
- [ ] Frontend TypeScript: `npx tsc --noEmit` clean
- [ ] No errors in backend console logs
- [ ] Database orders created as expected

---

## Ready for Production?

After passing all tests, you're ready to:

1. **Swap to production Stripe keys** in `.env`
2. **Apply migrations to production database**
3. **Deploy frontend to Vercel/production**
4. **Deploy backend to production server**
5. **Register webhook endpoint in Stripe dashboard** (production)
6. **Monitor logs for 24 hours**

---

**Estimated Test Time:** 45-60 minutes
**Difficulty:** Easy to Medium
**Success Rate:** >95% if env vars correct

Good luck! 🚀

