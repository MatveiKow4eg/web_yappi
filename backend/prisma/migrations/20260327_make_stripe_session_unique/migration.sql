-- Ensure one Stripe Checkout Session can belong to only one order
CREATE UNIQUE INDEX "Order_stripe_session_id_key" ON "Order"("stripe_session_id");
