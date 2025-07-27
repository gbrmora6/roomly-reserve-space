-- Corrigir emails null nos profiles sincronizando com auth.users
UPDATE profiles 
SET email = au.email 
FROM auth.users au 
WHERE profiles.id = au.id 
AND profiles.email IS NULL;

-- Criar função para validar valor mínimo de estorno
CREATE OR REPLACE FUNCTION validate_refund_amount(p_amount numeric)
RETURNS boolean
LANGUAGE plpgsql
AS $$
BEGIN
  -- Validar se o valor é maior que R$ 0.01 (1 centavo)
  RETURN p_amount >= 0.01;
END;
$$;