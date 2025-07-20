-- Correção da função track_changes para resolver erro de conversão JSON
-- Problema: A função tentava converter UUIDs para JSONB causando erro "invalid input syntax for type json"
-- Solução: Comparar valores como texto em vez de tentar converter para JSONB

CREATE OR REPLACE FUNCTION public.track_changes()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  changed_fields TEXT[];
  current_user_id UUID;
  current_user_email TEXT;
  current_user_role TEXT;
  current_branch_id UUID;
  old_data JSONB;
  new_data JSONB;
BEGIN
  -- Obter dados do usuário atual
  current_user_id := auth.uid();
  
  IF current_user_id IS NOT NULL THEN
    SELECT email, role, branch_id 
    INTO current_user_email, current_user_role, current_branch_id
    FROM profiles 
    WHERE id = current_user_id;
  END IF;
  
  -- Preparar dados
  IF TG_OP = 'DELETE' THEN
    old_data := to_jsonb(OLD);
    new_data := NULL;
  ELSIF TG_OP = 'INSERT' THEN
    old_data := NULL;
    new_data := to_jsonb(NEW);
  ELSE -- UPDATE
    old_data := to_jsonb(OLD);
    new_data := to_jsonb(NEW);
    
    -- Identificar campos alterados
    -- CORREÇÃO: Comparar como texto em vez de tentar converter para JSONB
    -- Linha original problemática: WHERE o.value IS DISTINCT FROM (new_data->>key)::jsonb
    -- Nova linha corrigida: WHERE o.value::text IS DISTINCT FROM (new_data->>key)
    SELECT array_agg(key) INTO changed_fields
    FROM jsonb_each(old_data) o(key, value)
    WHERE o.value::text IS DISTINCT FROM (new_data->>key);
  END IF;
  
  -- Inserir registro de alteração
  INSERT INTO change_history (
    table_name,
    record_id,
    operation,
    old_data,
    new_data,
    changed_fields,
    user_id,
    user_email,
    user_role,
    branch_id
  ) VALUES (
    TG_TABLE_NAME,
    COALESCE(NEW.id, OLD.id),
    TG_OP,
    old_data,
    new_data,
    changed_fields,
    current_user_id,
    current_user_email,
    current_user_role,
    COALESCE(NEW.branch_id, OLD.branch_id, current_branch_id)
  );
  
  -- Log evento de segurança para operações sensíveis
  PERFORM log_security_event(
    'data_change',
    TG_OP || ' on ' || TG_TABLE_NAME,
    jsonb_build_object(
      'table', TG_TABLE_NAME,
      'record_id', COALESCE(NEW.id, OLD.id),
      'changed_fields', changed_fields
    ),
    CASE 
      WHEN TG_OP = 'DELETE' THEN 'warning'
      WHEN TG_TABLE_NAME IN ('profiles', 'user_permissions') THEN 'warning'
      ELSE 'info'
    END,
    TG_TABLE_NAME,
    COALESCE(NEW.id, OLD.id),
    CASE 
      WHEN TG_OP = 'DELETE' THEN 50
      WHEN TG_TABLE_NAME IN ('profiles', 'user_permissions') THEN 30
      ELSE 10
    END
  );
  
  RETURN COALESCE(NEW, OLD);
END;
$function$;