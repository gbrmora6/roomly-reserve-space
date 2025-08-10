-- Fix handle_new_user to avoid search_path/type resolution issues when casting to enum user_role
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public
AS $function$
DECLARE
  v_branch_id UUID;
  v_role TEXT;
BEGIN
  -- Try to read branch_id from user metadata and validate it
  v_branch_id := (NEW.raw_user_meta_data->>'branch_id')::UUID;
  IF v_branch_id IS NOT NULL THEN
    IF NOT EXISTS (SELECT 1 FROM public.branches WHERE id = v_branch_id) THEN
      v_branch_id := NULL;
    END IF;
  END IF;

  -- Fallback role is client
  v_role := COALESCE(NEW.raw_user_meta_data->>'role', 'client');

  -- Insert or update profile safely and cast role using fully-qualified enum
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
    v_role::public.user_role,
    v_branch_id,
    NOW(),
    NOW()
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    first_name = EXCLUDED.first_name,
    last_name = EXCLUDED.last_name,
    role = EXCLUDED.role,
    branch_id = EXCLUDED.branch_id,
    updated_at = NOW();

  RETURN NEW;
END;
$function$;

-- Also make sure create_user_profile uses fully qualified enum and public search_path
CREATE OR REPLACE FUNCTION public.create_user_profile(
  user_id uuid,
  user_email text,
  first_name text DEFAULT ''::text,
  last_name text DEFAULT ''::text,
  user_role text DEFAULT 'client'::text,
  user_branch_id text DEFAULT '64a43fed-587b-415c-aeac-0abfd7867566'::text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public
AS $function$
BEGIN
  -- Only insert if profile doesn't exist yet
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
      user_role::public.user_role,
      user_branch_id::UUID,
      NOW(),
      NOW()
    );
  END IF;
END;
$function$;