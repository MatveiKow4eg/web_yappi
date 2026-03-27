-- Production hotfix:
-- Some databases were created before Prisma enum types were applied.
-- The current Prisma schema expects PostgreSQL enums like public.PaymentMethod,
-- so queries fail with: type "public.PaymentMethod" does not exist.
--
-- This migration safely:
-- 1. Creates missing enum types if they are absent.
-- 2. Converts existing text/varchar columns to those enum types.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE t.typname = 'OptionGroupType' AND n.nspname = 'public'
  ) THEN
    CREATE TYPE "public"."OptionGroupType" AS ENUM ('single', 'multiple', 'quantity');
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE t.typname = 'DiscountType' AND n.nspname = 'public'
  ) THEN
    CREATE TYPE "public"."DiscountType" AS ENUM ('percent', 'fixed');
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE t.typname = 'OrderType' AND n.nspname = 'public'
  ) THEN
    CREATE TYPE "public"."OrderType" AS ENUM ('delivery', 'pickup');
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE t.typname = 'OrderStatus' AND n.nspname = 'public'
  ) THEN
    CREATE TYPE "public"."OrderStatus" AS ENUM ('new', 'confirmed_preparing', 'ready', 'sent', 'completed', 'cancelled');
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE t.typname = 'PaymentMethod' AND n.nspname = 'public'
  ) THEN
    CREATE TYPE "public"."PaymentMethod" AS ENUM ('stripe', 'cash_on_pickup', 'card_on_pickup', 'cash_on_delivery', 'card_on_delivery');
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE t.typname = 'PaymentStatus' AND n.nspname = 'public'
  ) THEN
    CREATE TYPE "public"."PaymentStatus" AS ENUM ('pending', 'paid', 'unpaid', 'failed', 'refunded');
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE t.typname = 'AdminRole' AND n.nspname = 'public'
  ) THEN
    CREATE TYPE "public"."AdminRole" AS ENUM ('admin', 'kitchen');
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'ProductOptionGroup'
      AND column_name = 'type'
      AND udt_name <> 'OptionGroupType'
  ) THEN
    ALTER TABLE "public"."ProductOptionGroup"
      ALTER COLUMN "type" DROP DEFAULT,
      ALTER COLUMN "type" TYPE "public"."OptionGroupType"
      USING ("type"::text::"public"."OptionGroupType"),
      ALTER COLUMN "type" SET DEFAULT 'single'::"public"."OptionGroupType";
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'PromoCode'
      AND column_name = 'discount_type'
      AND udt_name <> 'DiscountType'
  ) THEN
    ALTER TABLE "public"."PromoCode"
      ALTER COLUMN "discount_type" TYPE "public"."DiscountType"
      USING ("discount_type"::text::"public"."DiscountType");
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'Order'
      AND column_name = 'type'
      AND udt_name <> 'OrderType'
  ) THEN
    ALTER TABLE "public"."Order"
      ALTER COLUMN "type" TYPE "public"."OrderType"
      USING ("type"::text::"public"."OrderType");
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'Order'
      AND column_name = 'status'
      AND udt_name <> 'OrderStatus'
  ) THEN
    ALTER TABLE "public"."Order"
      ALTER COLUMN "status" DROP DEFAULT,
      ALTER COLUMN "status" TYPE "public"."OrderStatus"
      USING ("status"::text::"public"."OrderStatus"),
      ALTER COLUMN "status" SET DEFAULT 'new'::"public"."OrderStatus";
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'Order'
      AND column_name = 'payment_method'
      AND udt_name <> 'PaymentMethod'
  ) THEN
    ALTER TABLE "public"."Order"
      ALTER COLUMN "payment_method" TYPE "public"."PaymentMethod"
      USING ("payment_method"::text::"public"."PaymentMethod");
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'Order'
      AND column_name = 'payment_status'
      AND udt_name <> 'PaymentStatus'
  ) THEN
    ALTER TABLE "public"."Order"
      ALTER COLUMN "payment_status" DROP DEFAULT,
      ALTER COLUMN "payment_status" TYPE "public"."PaymentStatus"
      USING ("payment_status"::text::"public"."PaymentStatus"),
      ALTER COLUMN "payment_status" SET DEFAULT 'pending'::"public"."PaymentStatus";
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'AdminUser'
      AND column_name = 'role'
      AND udt_name <> 'AdminRole'
  ) THEN
    ALTER TABLE "public"."AdminUser"
      ALTER COLUMN "role" DROP DEFAULT,
      ALTER COLUMN "role" TYPE "public"."AdminRole"
      USING ("role"::text::"public"."AdminRole"),
      ALTER COLUMN "role" SET DEFAULT 'admin'::"public"."AdminRole";
  END IF;
END $$;