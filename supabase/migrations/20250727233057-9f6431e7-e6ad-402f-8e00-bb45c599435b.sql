-- Fix remaining database security issues

-- Fix remaining functions that still don't have SET search_path
CREATE OR REPLACE FUNCTION public.update_system_settings_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
  NEW.updated_at = NOW();
  NEW.updated_by = auth.uid();
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.update_payment_settings_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.update_payment_details_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.calculate_price()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
DECLARE
  u_price NUMERIC;
  hours  NUMERIC;
BEGIN
  IF TG_TABLE_NAME = 'bookings' THEN
    -- Preço por hora de sala
    SELECT price_per_hour INTO u_price FROM public.rooms WHERE id = NEW.room_id;
  ELSIF TG_TABLE_NAME = 'booking_equipment' THEN
    -- Preço por hora de equipamento, multiplicado pela quantidade
    SELECT price_per_hour INTO u_price FROM public.equipment WHERE id = NEW.equipment_id;
    u_price := u_price * NEW.quantity;
  ELSE
    RAISE EXCEPTION 'calculate_price trigger chamado em tabela inesperada: %', TG_TABLE_NAME;
  END IF;

  -- Duração em horas (decimal)
  hours := EXTRACT(EPOCH FROM (NEW.end_time - NEW.start_time)) / 3600;

  -- Atribui total_price
  NEW.total_price := u_price * hours;

  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.set_branch_id()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
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
$function$;