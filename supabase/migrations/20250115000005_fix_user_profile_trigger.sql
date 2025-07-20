-- Corrigir função handle_new_user para lidar melhor com branch_id
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
DECLARE
  v_branch_id UUID;
BEGIN
  -- Verificar se o branch_id fornecido existe, caso contrário usar NULL
  v_branch_id := (NEW.raw_user_meta_data->>'branch_id')::UUID;
  
  -- Se branch_id foi fornecido, verificar se existe
  IF v_branch_id IS NOT NULL THEN
    -- Verificar se a branch existe
    IF NOT EXISTS (SELECT 1 FROM public.branches WHERE id = v_branch_id) THEN
      v_branch_id := NULL;
    END IF;
  END IF;
  
  INSERT INTO public.profiles (
    id,
    email,
    first_name,
    last_name,
    role,
    branch_id,
    created_at,
    updated_at
  )
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'first_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'last_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'role', 'client'),
    v_branch_id,
    NOW(),
    NOW()
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Comentário explicativo
COMMENT ON FUNCTION public.handle_new_user() IS 'Cria automaticamente um perfil na tabela profiles quando um novo usuário é registrado, validando branch_id';