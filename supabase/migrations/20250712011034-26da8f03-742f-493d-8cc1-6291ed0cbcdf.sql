-- Criar tabela payment_details para armazenar dados específicos de cada tipo de pagamento
CREATE TABLE public.payment_details (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  payment_method TEXT NOT NULL CHECK (payment_method IN ('pix', 'boleto', 'card')),
  
  -- Dados específicos do boleto
  boleto_url TEXT,
  boleto_barcode TEXT,
  boleto_due_date DATE,
  
  -- Dados específicos do PIX
  pix_code TEXT,
  pix_qr_code TEXT,
  pix_expiration TIMESTAMPTZ,
  
  -- Dados específicos do cartão
  card_transaction_id TEXT,
  card_authorization_code TEXT,
  
  -- Dados gerais
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Adicionar campos necessários na tabela orders
ALTER TABLE public.orders 
ADD COLUMN expires_at TIMESTAMPTZ,
ADD COLUMN payment_data JSONB DEFAULT '{}',
ADD COLUMN refund_status TEXT CHECK (refund_status IN ('pending', 'processing', 'completed', 'failed')),
ADD COLUMN refund_amount NUMERIC(10,2),
ADD COLUMN refund_date TIMESTAMPTZ;

-- Habilitar RLS na nova tabela
ALTER TABLE public.payment_details ENABLE ROW LEVEL SECURITY;

-- Criar políticas RLS para payment_details
CREATE POLICY "Users can view their own payment details" 
ON public.payment_details 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.orders 
    WHERE orders.id = payment_details.order_id 
    AND orders.user_id = auth.uid()
  )
);

CREATE POLICY "Admins can view all payment details" 
ON public.payment_details 
FOR SELECT 
USING (is_admin());

CREATE POLICY "System can insert payment details" 
ON public.payment_details 
FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.orders 
    WHERE orders.id = payment_details.order_id 
    AND orders.user_id = auth.uid()
  ) OR is_admin()
);

CREATE POLICY "System can update payment details" 
ON public.payment_details 
FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM public.orders 
    WHERE orders.id = payment_details.order_id 
    AND orders.user_id = auth.uid()
  ) OR is_admin()
);

-- Criar função para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION public.update_payment_details_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Criar trigger para atualizar updated_at
CREATE TRIGGER update_payment_details_updated_at
BEFORE UPDATE ON public.payment_details
FOR EACH ROW
EXECUTE FUNCTION public.update_payment_details_updated_at();

-- Criar índices para melhor performance
CREATE INDEX idx_payment_details_order_id ON public.payment_details(order_id);
CREATE INDEX idx_payment_details_payment_method ON public.payment_details(payment_method);
CREATE INDEX idx_orders_refund_status ON public.orders(refund_status) WHERE refund_status IS NOT NULL;