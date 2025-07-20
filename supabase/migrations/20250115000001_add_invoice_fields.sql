-- Adicionar campos de nota fiscal nas tabelas de pedidos e reservas

-- Adicionar campo de nota fiscal na tabela orders
ALTER TABLE public.orders 
ADD COLUMN IF NOT EXISTS invoice_url TEXT,
ADD COLUMN IF NOT EXISTS invoice_uploaded_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS invoice_uploaded_by UUID REFERENCES public.profiles(id);

-- Adicionar campo de nota fiscal na tabela bookings
ALTER TABLE public.bookings 
ADD COLUMN IF NOT EXISTS invoice_url TEXT,
ADD COLUMN IF NOT EXISTS invoice_uploaded_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS invoice_uploaded_by UUID REFERENCES public.profiles(id);

-- Adicionar campo de nota fiscal na tabela booking_equipment
ALTER TABLE public.booking_equipment 
ADD COLUMN IF NOT EXISTS invoice_url TEXT,
ADD COLUMN IF NOT EXISTS invoice_uploaded_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS invoice_uploaded_by UUID REFERENCES public.profiles(id);

-- Comentários para documentação
COMMENT ON COLUMN public.orders.invoice_url IS 'URL do arquivo PDF da nota fiscal no storage';
COMMENT ON COLUMN public.orders.invoice_uploaded_at IS 'Data e hora do upload da nota fiscal';
COMMENT ON COLUMN public.orders.invoice_uploaded_by IS 'ID do admin que fez o upload da nota fiscal';

COMMENT ON COLUMN public.bookings.invoice_url IS 'URL do arquivo PDF da nota fiscal no storage';
COMMENT ON COLUMN public.bookings.invoice_uploaded_at IS 'Data e hora do upload da nota fiscal';
COMMENT ON COLUMN public.bookings.invoice_uploaded_by IS 'ID do admin que fez o upload da nota fiscal';

COMMENT ON COLUMN public.booking_equipment.invoice_url IS 'URL do arquivo PDF da nota fiscal no storage';
COMMENT ON COLUMN public.booking_equipment.invoice_uploaded_at IS 'Data e hora do upload da nota fiscal';
COMMENT ON COLUMN public.booking_equipment.invoice_uploaded_by IS 'ID do admin que fez o upload da nota fiscal';