-- Criar função exec_sql para permitir execução de SQL dinâmico
CREATE OR REPLACE FUNCTION public.exec_sql(sql TEXT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Verificar se o usuário tem permissão de admin
  IF NOT EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = auth.uid() 
    AND role IN ('admin', 'super_admin')
  ) THEN
    RAISE EXCEPTION 'Acesso negado: apenas administradores podem executar SQL';
  END IF;
  
  -- Executar o SQL fornecido
  EXECUTE sql;
END;
$$;

-- Conceder permissões necessárias
GRANT EXECUTE ON FUNCTION public.exec_sql(TEXT) TO authenticated;

-- Comentário da função
COMMENT ON FUNCTION public.exec_sql(TEXT) IS 'Permite que administradores executem SQL dinâmico de forma segura';