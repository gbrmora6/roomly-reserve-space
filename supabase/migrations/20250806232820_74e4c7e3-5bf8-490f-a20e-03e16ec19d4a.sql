-- Add visibility columns to payment_settings table for frontend control
ALTER TABLE public.payment_settings ADD COLUMN IF NOT EXISTS pix_visible BOOLEAN DEFAULT true;
ALTER TABLE public.payment_settings ADD COLUMN IF NOT EXISTS boleto_visible BOOLEAN DEFAULT true;
ALTER TABLE public.payment_settings ADD COLUMN IF NOT EXISTS cartao_visible BOOLEAN DEFAULT true;
ALTER TABLE public.payment_settings ADD COLUMN IF NOT EXISTS dinheiro_visible BOOLEAN DEFAULT true;

-- Update existing rows to have default visibility values
UPDATE public.payment_settings 
SET pix_visible = true, boleto_visible = true, cartao_visible = true, dinheiro_visible = true
WHERE pix_visible IS NULL OR boleto_visible IS NULL OR cartao_visible IS NULL OR dinheiro_visible IS NULL;