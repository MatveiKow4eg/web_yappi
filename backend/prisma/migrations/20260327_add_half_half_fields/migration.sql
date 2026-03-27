-- Add 50/50 set support fields to Product
ALTER TABLE "Product"
  ADD COLUMN IF NOT EXISTS "pieces_total" INTEGER,
  ADD COLUMN IF NOT EXISTS "allow_half_half" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "half_half_price" DECIMAL(10,2),
  ADD COLUMN IF NOT EXISTS "half_half_old_price" DECIMAL(10,2);
