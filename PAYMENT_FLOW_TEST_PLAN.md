# Payment Flow Test Plan

## Pre-Test Setup
- [ ] PostgreSQL running
- [ ] Backend running: `npm run dev` (http://localhost:4000)
- [ ] Frontend running: `npm run dev` (http://localhost:3000)
- [ ] `.env` files configured with Stripe test keys
- [ ] Stripe Test API keys in use (not production)
- [ ] Check database: migrations applied (`npx prisma migrate deploy`)

---

## Test Scenario 1: Stripe Checkout (Happy Path)
**Goal:** Complete successful Stripe payment

**Steps:**
1. Add items to cart
2. Go to checkout
3. Select "Stripe" payment method
4. Fill in order details
5. Click "Оформить заказ"
6. Should redirect to Stripe Checkout
7. Use Stripe test card: `4242 4242 4242 4242` (any future date, any CVC)
8. Complete payment on Stripe
9. Should redirect to `/track/[token]?paid=1`
10. Cart should be cleared (via `TrackClientState`)
11. Order should be visible with:
    - ✅ Order status: "Новый"
    - ✅ Payment status: "✅ Оплачено"

**Expected Backend Logs:**
- POST /api/orders (201 with stripe_checkout_url)
- Webhook: checkout.session.completed
- Order payment_status → "paid"
- PromoCodeUsage created (if promo was used)

---

## Test Scenario 2: Stripe Checkout → Cancel
**Goal:** User cancels payment, can recover checkout

**Steps:**
1. Add items to cart
2. Go to checkout, fill form
3. Select "Stripe" payment method
4. Click "Оформить заказ"
5. On Stripe page, click "Cancel" or close browser
6. Should return to `/checkout?cancelled=1`
7. ✅ Stripe notice banner should appear: "Оплата не завершена..."
8. ✅ Form should still be filled with previous values
9. ✅ Cart should NOT be cleared
10. Can retry checkout with same or updated values

**Expected DB State:**
- Order created with payment_status: "pending"
- No PromoCodeUsage created (for Stripe orders)
- stripe_session_id stored but with "expired" or "open" status

---

## Test Scenario 3: Duplicate Order Prevention (Stripe)
**Goal:** Prevent duplicate Stripe sessions from fast double-click

**Steps:**
1. Create new order with Stripe
2. On checkout page, rapidly click "Оформить заказ" twice
3. OR: In browser DevTools, re-submit the form request
4. ✅ Should return SAME order/session (not create new one)
5. ✅ User should be redirected to same checkout URL

**Verify:**
- Only ONE stripe_session_id in database for this fingerprint
- Order count: should be 1 (not 2)
- PromoCodeUsage count: should be 0 or 1 (depending on promo)

---

## Test Scenario 4: Cash on Pickup/Delivery
**Goal:** Verify non-Stripe orders work and are deduped

**Steps:**
1. Create order with payment method: "cash_on_pickup"
2. Fill details and submit
3. Should get order_number and tracking_token (no Stripe redirect)
4. Order status should be visible on track page
5. Payment status should be: "⏳ Ожидание" (still waiting for cash)

**Duplicate Test:**
1. Rapidly retry the same order creation request
2. ✅ Should return SAME order (not create new)
3. Check: `checkout_fingerprint` matches
4. Database: only ONE order with this fingerprint

---

## Test Scenario 5: Promo Code (Non-Stripe)
**Goal:** Promo deferred usage for Stripe, immediate for cash

**Setup:**
- Create a promo code in admin with:
  - discount: 5 EUR
  - usage_limit_per_phone: 2

**Non-Stripe Test:**
1. Order 1: Use promo "TEST1" with cash payment
2. ✅ PromoCodeUsage should be created immediately
3. Usage count should be 1
4. Order 2: Same phone, use promo again
5. ✅ Should succeed (2 times allowed)
6. Order 3: Same phone, try promo again
7. ✅ Should fail: "Вы уже использовали этот промокод"

**Stripe Test:**
1. Create Stripe order with promo "TEST1"
2. ✅ PromoCodeUsage should NOT be created yet
3. Complete Stripe payment
4. ✅ Webhook handler creates PromoCodeUsage
5. Verify: not created until webhook fires

---

## Test Scenario 6: Zero-Amount Order Guard
**Goal:** Prevent broken Stripe sessions from zero totals

**Steps:**
1. Add 1 item, apply aggressive promo (discount > price)
2. Total becomes 0 or negative
3. Select "Stripe" payment method
4. Click "Оформить заказ"
5. ✅ Should get error: "Онлайн-оплата недоступна для заказа"
6. ✅ Can still order with cash/card

---

## Test Scenario 7: Expired Stripe Session Recovery
**Goal:** Mark expired sessions as failed and allow new order

**Steps:**
1. Create Stripe order → note stripe_session_id
2. Wait ~30 minutes (or use Stripe dashboard to expire)
3. Try to submit identical order again
4. ✅ Should detect old session is expired
5. ✅ Should mark old order as payment_status: "failed"
6. ✅ Should create NEW order with NEW stripe_session_id
7. Both orders in database; old one failed, new one pending

---

## Test Scenario 8: Webhook Idempotency
**Goal:** Webhook handler safe for retries

**Setup:**
- Backend running with logging enabled

**Steps:**
1. Create Stripe order and complete payment
2. Manually trigger webhook retry from Stripe dashboard
   - Go to Stripe → Webhooks → select event → Resend
3. ✅ Order should still be paid (no duplicates)
4. ✅ PromoCodeUsage should still exist only once
5. ✅ No errors in logs

**Verify Logs:**
- First webhook: payment_status "pending" → "paid"
- Resend webhook: already "paid" → idempc (no change logs)

---

## Test Scenario 9: Track Page Payment Status
**Goal:** Verify payment_status displays correctly

**Steps:**
1. View pending cash order on track page
   - ✅ Should show: " Статус оплаты: ⏳ Ожидание" (amber badge)
2. View paid Stripe order on track page
   - ✅ Should show: "Статус оплаты: ✅ Оплачено" (green badge)
3. (If possible) Mark order as failed in admin
   - ✅ Should show: "Статус оплаты: ❌ Не оплачено" (red badge)

---

## Test Scenario 10: Delivery Zone Minimum Order
**Goal:** Verify minimum order amount enforced per zone

**Steps:**
1. Select delivery zone with min_order_amount: 20 EUR
2. Add items totaling only 15 EUR
3. Try to submit
4. ✅ Should fail: "Минимальная сумма заказа: 20 EUR"
5. Add more items to reach 20 EUR
6. ✅ Should succeed

---

## Test Scenario 11: Promo Minimum Order
**Goal:** Verify promo minimum order amount enforced

**Steps:**
1. Create promo with min_order_amount: 30 EUR
2. Order totaling 25 EUR, apply promo
3. ✅ Should fail: "Минимальная сумма для промокода: 30 EUR"
4. Order totaling 35 EUR, apply promo
5. ✅ Should succeed and discount applied

---

## Checklist: Before Deployment
- [ ] All 11 test scenarios completed and passed
- [ ] No TypeScript errors: `npx tsc --noEmit` in both backend and frontend
- [ ] Database migrations applied: `npx prisma migrate deploy`
- [ ] Stripe webhook signatures verified with actual Stripe events
- [ ] `.env` files have production Stripe keys ready (not committed)
- [ ] CORS settings correct for frontend → backend API calls
- [ ] Cart doesn't persist after Stripe success
- [ ] Draft persists after Stripe cancel
- [ ] Admin can view orders and payment status
- [ ] Backend logs show clean payment flow (no errors)
- [ ] Load test: rapid order submissions (curl loop) don't create duplicates

---

## Debug Commands

**Check pending orders:**
```bash
sqlite3 # if using SQLite, or psql if PostgreSQL
SELECT id, order_number, payment_method, payment_status, stripe_session_id 
FROM public."Order" 
WHERE payment_status = 'pending' 
ORDER BY created_at DESC LIMIT 10;
```

**Check promo usage:**
```bash
SELECT order_id, promo_code_id, phone, discount_amount 
FROM public."PromoCodeUsage" 
ORDER BY created_at DESC LIMIT 10;
```

**View order details:**
```bash
SELECT id, order_number, status, payment_status, checkout_fingerprint 
FROM public."Order" 
WHERE tracking_token = '[TOKEN]';
```

**Stripe webhook logs:**
- Stripe Dashboard → Developers → Webhooks → select endpoint → Events
- Look for checkout.session.completed and checkout.session.expired events

---

## Rollback Plan (If Issues Found)
1. Stop frontend and backend
2. Revert migrations: `npx prisma migrate resolve --rolled-back <migration_name>`
3. Revert code changes: `git checkout backend/src/routes/public/orders.ts` etc.
4. Restart services
5. Document issue in GitHub issues

---

**Test Status:** [ ] PENDING   [ ] IN PROGRESS   [ ] PASSED   [ ] FAILED

**Date Tested:** _______________

**Tester Name:** _______________

**Notes:** _______________________________________________________________

