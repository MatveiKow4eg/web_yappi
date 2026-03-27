-- Redesign: replace half_half fixed 50/50 with flexible custom variant system
-- Up to 2 custom variants per product, price auto-calculated by piece count ratio

-- Rename existing price column to variant1_price
ALTER TABLE "Product" RENAME COLUMN "half_half_price" TO "variant1_price";

-- Remove old columns no longer used
ALTER TABLE "Product" DROP COLUMN IF EXISTS "allow_half_half";
ALTER TABLE "Product" DROP COLUMN IF EXISTS "half_half_old_price";
ALTER TABLE "Product" DROP COLUMN IF EXISTS "old_price";

-- Add new piece-count columns and second variant columns
ALTER TABLE "Product"
  ADD COLUMN IF NOT EXISTS "variant1_pieces" INTEGER,
  ADD COLUMN IF NOT EXISTS "variant2_pieces" INTEGER,
  ADD COLUMN IF NOT EXISTS "variant2_price" DECIMAL(10,2);
