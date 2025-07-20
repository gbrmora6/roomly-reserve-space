-- Atualizar enum booking_status para seguir padrão da integração Click2Pay
-- Remover enum existente e recriar com novos valores

-- Primeiro, alterar todas as colunas que usam o enum para text temporariamente
ALTER TABLE public.bookings ALTER COLUMN status TYPE text;
ALTER TABLE public.booking_equipment ALTER COLUMN status TYPE text;

-- Dropar o enum existente
DROP TYPE IF EXISTS public.booking_status;

-- Criar novo enum com os status da Click2Pay
CREATE TYPE public.booking_status AS ENUM (
  'in_process',
  'paid', 
  'partial_refunded',
  'cancelled',
  'pre_authorized',
  'recused'
);

-- Converter valores existentes para os novos status
-- pending -> in_process
-- confirmed -> paid
-- cancelled -> cancelled (mantém)
-- paid -> paid (mantém)
-- cancelled_unpaid -> cancelled

UPDATE public.bookings 
SET status = CASE 
  WHEN status = 'pending' THEN 'in_process'
  WHEN status = 'confirmed' THEN 'paid'
  WHEN status = 'cancelled' THEN 'cancelled'
  WHEN status = 'paid' THEN 'paid'
  WHEN status = 'cancelled_unpaid' THEN 'cancelled'
  ELSE 'in_process'
END;

UPDATE public.booking_equipment 
SET status = CASE 
  WHEN status = 'pending' THEN 'in_process'
  WHEN status = 'confirmed' THEN 'paid'
  WHEN status = 'cancelled' THEN 'cancelled'
  WHEN status = 'paid' THEN 'paid'
  WHEN status = 'cancelled_unpaid' THEN 'cancelled'
  ELSE 'in_process'
END;

-- Converter colunas de volta para o novo enum
ALTER TABLE public.bookings ALTER COLUMN status TYPE public.booking_status USING status::public.booking_status;
ALTER TABLE public.booking_equipment ALTER COLUMN status TYPE public.booking_status USING status::public.booking_status;

-- Atualizar valores padrão se necessário
ALTER TABLE public.bookings ALTER COLUMN status SET DEFAULT 'in_process';
ALTER TABLE public.booking_equipment ALTER COLUMN status SET DEFAULT 'in_process';

-- Comentário para documentação
COMMENT ON TYPE public.booking_status IS 'Status de reservas seguindo padrão da integração Click2Pay: in_process (em processamento), paid (pago), partial_refunded (parcialmente devolvido), cancelled (cancelado), pre_authorized (pré-autorizado), recused (recusado)';