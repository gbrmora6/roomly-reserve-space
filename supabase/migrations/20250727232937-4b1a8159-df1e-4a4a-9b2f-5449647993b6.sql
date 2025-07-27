-- Critical Security Fixes for Database Functions

-- 1. Fix all database functions to have proper search_path security
-- This prevents SQL injection through search_path manipulation

-- Fix log_security_event function
CREATE OR REPLACE FUNCTION public.log_security_event(p_event_type text, p_action text, p_details jsonb, p_severity text DEFAULT 'info'::text, p_resource_type text DEFAULT NULL::text, p_resource_id uuid DEFAULT NULL::uuid, p_risk_score integer DEFAULT 0)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  audit_id UUID;
  current_user_id UUID;
  current_user_email TEXT;
  current_user_role TEXT;
  current_branch_id UUID;
BEGIN
  -- Obter dados do usuário atual
  current_user_id := auth.uid();
  
  IF current_user_id IS NOT NULL THEN
    SELECT email, role, branch_id 
    INTO current_user_email, current_user_role, current_branch_id
    FROM public.profiles 
    WHERE id = current_user_id;
  END IF;
  
  -- Inserir evento de auditoria
  INSERT INTO public.security_audit (
    event_type,
    severity,
    user_id,
    user_email,
    user_role,
    resource_type,
    resource_id,
    action,
    details,
    branch_id,
    risk_score,
    requires_review
  ) VALUES (
    p_event_type,
    p_severity,
    current_user_id,
    current_user_email,
    current_user_role,
    p_resource_type,
    p_resource_id,
    p_action,
    p_details,
    current_branch_id,
    p_risk_score,
    p_risk_score >= 70 -- Require review for high-risk events
  ) RETURNING id INTO audit_id;
  
  RETURN audit_id;
END;
$function$;

-- Fix create_user_profile function
CREATE OR REPLACE FUNCTION public.create_user_profile(user_id uuid, user_email text, first_name text DEFAULT ''::text, last_name text DEFAULT ''::text, user_role text DEFAULT 'client'::text, user_branch_id text DEFAULT '64a43fed-587b-415c-aeac-0abfd7867566'::text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Verifica se o perfil já existe
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = user_id) THEN
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
      user_id,
      user_email,
      first_name,
      last_name,
      user_role::user_role,  -- Cast para o tipo enum
      user_branch_id::UUID,  -- Cast para UUID
      NOW(),
      NOW()
    );
  END IF;
END;
$function$;

-- Fix is_admin function with proper security
CREATE OR REPLACE FUNCTION public.is_admin()
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE id = auth.uid() AND role IN ('admin', 'super_admin')
  );
END;
$function$;

-- Fix has_permission function
CREATE OR REPLACE FUNCTION public.has_permission(p_user_id uuid, p_resource resource_type, p_permission permission_type, p_branch_id uuid DEFAULT NULL::uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  user_role TEXT;
  branch_id_to_check UUID;
BEGIN
  -- Obter role do usuário
  SELECT role, branch_id INTO user_role, branch_id_to_check
  FROM public.profiles 
  WHERE id = p_user_id;
  
  -- Super admin tem todas as permissões
  IF user_role = 'super_admin' THEN
    RETURN TRUE;
  END IF;
  
  -- Usar branch do usuário se não especificado
  IF p_branch_id IS NULL THEN
    p_branch_id := branch_id_to_check;
  END IF;
  
  -- Verificar permissão específica
  RETURN EXISTS (
    SELECT 1 FROM public.user_permissions up
    WHERE up.user_id = p_user_id
    AND up.resource_type = p_resource
    AND up.permission_type = p_permission
    AND up.branch_id = p_branch_id
    AND up.is_active = true
    AND (up.expires_at IS NULL OR up.expires_at > now())
  );
END;
$function$;

-- Fix track_changes function
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
    FROM public.profiles 
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
    SELECT array_agg(key) INTO changed_fields
    FROM jsonb_each(old_data) o(key, value)
    WHERE o.value::text IS DISTINCT FROM (new_data->>key);
  END IF;
  
  -- Inserir registro de alteração
  INSERT INTO public.change_history (
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
  PERFORM public.log_security_event(
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