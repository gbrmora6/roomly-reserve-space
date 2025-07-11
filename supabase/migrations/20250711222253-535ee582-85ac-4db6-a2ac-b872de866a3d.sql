-- Adicionar campos específicos do Click2Pay na tabela orders
ALTER TABLE public.orders 
ADD COLUMN IF NOT EXISTS external_identifier TEXT,
ADD COLUMN IF NOT EXISTS click2pay_tid TEXT,
ADD COLUMN IF NOT EXISTS payment_method TEXT;