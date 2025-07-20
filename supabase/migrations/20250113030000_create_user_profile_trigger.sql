-- Função para criar automaticamente um perfil quando um usuário é criado
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
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
    COALESCE(NEW.raw_user_meta_data->>'branch_id', 'default-branch-id'),
    NOW(),
    NOW()
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger que executa a função quando um usuário é inserido na tabela auth.users
CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Comentário explicativo
COMMENT ON FUNCTION public.handle_new_user() IS 'Cria automaticamente um perfil na tabela profiles quando um novo usuário é registrado';
COMMENT ON TRIGGER on_auth_user_created ON auth.users IS 'Trigger que executa handle_new_user() após inserção de novo usuário';