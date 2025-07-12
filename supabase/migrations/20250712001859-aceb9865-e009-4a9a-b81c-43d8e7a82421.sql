-- Modificar a função set_branch_id para não sobrescrever se branch_id já estiver definido
CREATE OR REPLACE FUNCTION public.set_branch_id()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  -- Se branch_id já está definido (edge function), não sobrescrever
  IF NEW.branch_id IS NOT NULL THEN
    RETURN NEW;
  END IF;

  -- pega a filial do usuário logado
  SELECT branch_id INTO NEW.branch_id
    FROM public.profiles
   WHERE id = auth.uid();

  RETURN NEW;
END;
$$;