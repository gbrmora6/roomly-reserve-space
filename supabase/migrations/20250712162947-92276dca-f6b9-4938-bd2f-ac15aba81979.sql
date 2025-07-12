-- Remove Stripe integration columns from products table
ALTER TABLE public.products DROP COLUMN IF EXISTS stripe_product_id;
ALTER TABLE public.products DROP COLUMN IF EXISTS stripe_price_id;