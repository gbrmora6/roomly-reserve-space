-- Função auxiliar para verificar se usuário tem checkout ativo
CREATE OR REPLACE FUNCTION public.has_active_checkout(p_user_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM orders 
    WHERE user_id = p_user_id 
    AND created_at > now() - interval '60 minutes'
    AND status IN ('pending', 'processing', 'in_process')
  );
END;
$function$