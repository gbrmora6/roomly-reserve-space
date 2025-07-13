-- Corrigir search_path mutável em todas as funções para segurança
-- Adicionar SET search_path TO 'public' em todas as funções que não têm

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
  FROM profiles 
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
    SELECT 1 FROM user_permissions up
    WHERE up.user_id = p_user_id
    AND up.resource_type = p_resource
    AND up.permission_type = p_permission
    AND up.branch_id = p_branch_id
    AND up.is_active = true
    AND (up.expires_at IS NULL OR up.expires_at > now())
  );
END;
$function$;

CREATE OR REPLACE FUNCTION public.add_to_cart(p_user_id uuid, p_item_type text, p_item_id uuid, p_quantity integer, p_metadata jsonb)
 RETURNS cart_items
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_price NUMERIC;
  v_cart_item cart_items;
  v_booking_id uuid;
  v_equipment_booking_id uuid;
  v_start_time timestamptz;
  v_end_time timestamptz;
  v_branch_id uuid;
BEGIN
  -- Verificar se é o próprio usuário
  IF p_user_id != auth.uid() THEN
    RAISE EXCEPTION 'Acesso negado: usuário não autorizado';
  END IF;

  -- Limpar itens expirados antes de adicionar novo
  PERFORM clean_expired_cart_items();

  -- Obter branch_id do usuário
  SELECT branch_id INTO v_branch_id
  FROM profiles
  WHERE id = auth.uid();

  -- Determinar preço baseado no tipo de item
  CASE p_item_type
    WHEN 'room' THEN
      SELECT price_per_hour INTO v_price 
      FROM rooms 
      WHERE id = p_item_id AND is_active = true;
    WHEN 'equipment' THEN
      SELECT price_per_hour INTO v_price 
      FROM equipment 
      WHERE id = p_item_id AND is_active = true;
    WHEN 'product' THEN
      SELECT price INTO v_price 
      FROM products 
      WHERE id = p_item_id AND is_active = true;
    ELSE
      RAISE EXCEPTION 'Tipo de item inválido: %', p_item_type;
  END CASE;

  -- Verificar se o item foi encontrado
  IF v_price IS NULL THEN
    RAISE EXCEPTION 'Item não encontrado ou inativo';
  END IF;

  -- Processar reservas para salas e equipamentos
  IF p_item_type IN ('room', 'equipment') AND p_metadata ? 'start_time' AND p_metadata ? 'end_time' THEN
    v_start_time := (p_metadata->>'start_time')::timestamptz;
    v_end_time := (p_metadata->>'end_time')::timestamptz;
    
    -- Validar horários
    IF v_start_time >= v_end_time THEN
      RAISE EXCEPTION 'Horário de início deve ser anterior ao horário de término';
    END IF;

    IF p_item_type = 'room' THEN
      -- Verificar disponibilidade da sala
      IF EXISTS (
        SELECT 1 FROM bookings
        WHERE room_id = p_item_id
        AND status NOT IN ('cancelled', 'cancelled_unpaid')
        AND (
          (start_time <= v_start_time AND end_time > v_start_time)
          OR (start_time < v_end_time AND end_time >= v_end_time)
          OR (start_time >= v_start_time AND end_time <= v_end_time)
        )
      ) THEN
        RAISE EXCEPTION 'Horário não disponível para esta sala';
      END IF;

      -- Criar reserva pendente
      INSERT INTO bookings(user_id, room_id, start_time, end_time, status, branch_id)
      VALUES (p_user_id, p_item_id, v_start_time, v_end_time, 'pending'::booking_status, v_branch_id)
      RETURNING id INTO v_booking_id;

      -- Calcular preço baseado na duração
      v_price := v_price * EXTRACT(EPOCH FROM (v_end_time - v_start_time)) / 3600;

    ELSIF p_item_type = 'equipment' THEN
      -- Verificar disponibilidade do equipamento
      IF EXISTS (
        SELECT 1 FROM booking_equipment be
        JOIN equipment e ON be.equipment_id = e.id
        WHERE be.equipment_id = p_item_id
        AND be.status NOT IN ('cancelled', 'cancelled_unpaid')
        AND (
          (be.start_time <= v_start_time AND be.end_time > v_start_time)
          OR (be.start_time < v_end_time AND be.end_time >= v_end_time)
          OR (be.start_time >= v_start_time AND be.end_time <= v_end_time)
        )
        AND (
          SELECT SUM(quantity) FROM booking_equipment
          WHERE equipment_id = p_item_id
          AND status NOT IN ('cancelled', 'cancelled_unpaid')
          AND (
            (start_time <= v_start_time AND end_time > v_start_time)
            OR (start_time < v_end_time AND end_time >= v_end_time)
            OR (start_time >= v_start_time AND end_time <= v_end_time)
          )
        ) + p_quantity > (SELECT quantity FROM equipment WHERE id = p_item_id)
      ) THEN
        RAISE EXCEPTION 'Quantidade não disponível para este equipamento no horário selecionado';
      END IF;

      -- Criar reserva de equipamento pendente
      INSERT INTO booking_equipment(user_id, equipment_id, start_time, end_time, quantity, status, branch_id)
      VALUES (p_user_id, p_item_id, v_start_time, v_end_time, p_quantity, 'pending'::booking_status, v_branch_id)
      RETURNING id INTO v_equipment_booking_id;

      -- Calcular preço baseado na duração e quantidade
      v_price := v_price * EXTRACT(EPOCH FROM (v_end_time - v_start_time)) / 3600 * p_quantity;
    END IF;
  END IF;

  -- Inserir item no carrinho
  INSERT INTO cart_items(
    user_id, item_type, item_id, quantity, price, metadata,
    reserved_booking_id, reserved_equipment_booking_id, expires_at, branch_id
  ) VALUES (
    p_user_id,
    p_item_type,
    p_item_id,
    p_quantity,
    v_price,
    COALESCE(p_metadata, '{}'::jsonb),
    v_booking_id,
    v_equipment_booking_id,
    CASE 
      WHEN p_item_type IN ('room', 'equipment') THEN now() + interval '15 minutes'
      ELSE NULL
    END,
    v_branch_id
  )
  RETURNING * INTO v_cart_item;

  RETURN v_cart_item;
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
    FROM profiles 
    WHERE id = current_user_id;
  END IF;
  
  -- Inserir evento de auditoria
  INSERT INTO security_audit (
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
    SELECT array_agg(key) INTO changed_fields
    FROM jsonb_each(old_data) o(key, value)
    WHERE o.value IS DISTINCT FROM (new_data->>key)::jsonb;
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
    SELECT price_per_hour INTO u_price FROM rooms WHERE id = NEW.room_id;
  ELSIF TG_TABLE_NAME = 'booking_equipment' THEN
    -- Preço por hora de equipamento, multiplicado pela quantidade
    SELECT price_per_hour INTO u_price FROM equipment WHERE id = NEW.equipment_id;
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

CREATE OR REPLACE FUNCTION public.sync_room_calendar()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Se a sala foi criada e não tem calendar_id, criar calendário
  IF TG_OP = 'INSERT' AND NEW.google_calendar_id IS NULL THEN
    -- Chama a edge function usando service role key
    PERFORM net.http_post(
      url := 'https://fgiidcdsvmqxdkclgety.supabase.co/functions/v1/google-calendar-manager',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZnaWlkY2Rzdm1xeGRrY2xnZXR5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0NTQ0Njc0OSwiZXhwIjoyMDYxMDIyNzQ5fQ.nJ_n7XMKdKlXy7Bd5qoxDOixKRlAMBv6ZD3Cp5A9wPs'
      ),
      body := jsonb_build_object(
        'action', 'create_calendar',
        'roomId', NEW.id,
        'roomName', NEW.name,
        'branchId', NEW.branch_id
      )
    );
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$function$;

CREATE OR REPLACE FUNCTION public.sync_booking_calendar()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  room_calendar_id TEXT;
BEGIN
  -- Buscar o calendar_id da sala
  SELECT google_calendar_id INTO room_calendar_id
  FROM rooms 
  WHERE id = COALESCE(NEW.room_id, OLD.room_id);
  
  -- Se a sala tem calendário, sincronizar
  IF room_calendar_id IS NOT NULL THEN
    IF TG_OP = 'INSERT' AND NEW.status = 'confirmed' THEN
      -- Criar evento no calendário
      PERFORM net.http_post(
        url := 'https://fgiidcdsvmqxdkclgety.supabase.co/functions/v1/google-calendar-manager',
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZnaWlkY2Rzdm1xeGRrY2xnZXR5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0NTQ0Njc0OSwiZXhwIjoyMDYxMDIyNzQ5fQ.nJ_n7XMKdKlXy7Bd5qoxDOixKRlAMBv6ZD3Cp5A9wPs'
        ),
        body := jsonb_build_object(
          'action', 'create_event',
          'bookingId', NEW.id
        )
      );
    ELSIF TG_OP = 'UPDATE' AND OLD.status != 'confirmed' AND NEW.status = 'confirmed' THEN
      -- Criar evento quando status muda para confirmed
      PERFORM net.http_post(
        url := 'https://fgiidcdsvmqxdkclgety.supabase.co/functions/v1/google-calendar-manager',
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZnaWlkY2Rzdm1xeGRrY2xnZXR5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0NTQ0Njc0OSwiZXhwIjoyMDYxMDIyNzQ5fQ.nJ_n7XMKdKlXy7Bd5qoxDOixKRlAMBv6ZD3Cp5A9wPs'
        ),
        body := jsonb_build_object(
          'action', 'create_event',
          'bookingId', NEW.id
        )
      );
    ELSIF TG_OP = 'UPDATE' AND OLD.status = 'confirmed' AND NEW.status IN ('cancelled', 'cancelled_unpaid') THEN
      -- Deletar evento quando reserva é cancelada
      PERFORM net.http_post(
        url := 'https://fgiidcdsvmqxdkclgety.supabase.co/functions/v1/google-calendar-manager',
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZnaWlkY2Rzdm1xeGRrY2xnZXR5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0NTQ0Njc0OSwiZXhwIjoyMDYxMDIyNzQ5fQ.nJ_n7XMKdKlXy7Bd5qoxDOixKRlAMBv6ZD3Cp5A9wPs'
        ),
        body := jsonb_build_object(
          'action', 'delete_event',
          'bookingId', OLD.id
        )
      );
    ELSIF TG_OP = 'UPDATE' AND NEW.status = 'confirmed' AND (OLD.start_time != NEW.start_time OR OLD.end_time != NEW.end_time) THEN
      -- Atualizar evento quando horários mudam
      PERFORM net.http_post(
        url := 'https://fgiidcdsvmqxdkclgety.supabase.co/functions/v1/google-calendar-manager',
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZnaWlkY2Rzdm1xeGRrY2xnZXR5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0NTQ0Njc0OSwiZXhwIjoyMDYxMDIyNzQ5fQ.nJ_n7XMKdKlXy7Bd5qoxDOixKRlAMBv6ZD3Cp5A9wPs'
        ),
        body := jsonb_build_object(
          'action', 'update_event',
          'bookingId', NEW.id
        )
      );
    END IF;
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$function$;

CREATE OR REPLACE FUNCTION public.clear_cart(p_user_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Verificar se é o próprio usuário
  IF p_user_id != auth.uid() THEN
    RETURN false;
  END IF;

  -- Cancelar todas as reservas de salas do carrinho
  UPDATE bookings
  SET status = 'cancelled_unpaid'::booking_status, updated_at = now()
  WHERE id IN (
    SELECT reserved_booking_id 
    FROM cart_items
    WHERE user_id = p_user_id 
    AND reserved_booking_id IS NOT NULL
  );

  -- Cancelar todas as reservas de equipamentos do carrinho
  UPDATE booking_equipment
  SET status = 'cancelled_unpaid'::booking_status, updated_at = now()
  WHERE id IN (
    SELECT reserved_equipment_booking_id 
    FROM cart_items
    WHERE user_id = p_user_id 
    AND reserved_equipment_booking_id IS NOT NULL
  );

  -- Remover todos os itens do carrinho do usuário
  DELETE FROM cart_items
  WHERE user_id = p_user_id;

  RETURN true;
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_cart(p_user_id uuid)
 RETURNS SETOF cart_items
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
    RETURN QUERY
    SELECT *
    FROM cart_items
    WHERE user_id = p_user_id
    ORDER BY created_at DESC;
END;
$function$;

CREATE OR REPLACE FUNCTION public.is_admin()
 RETURNS boolean
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM profiles
    WHERE id = auth.uid() AND role = 'admin'
  );
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
    FROM profiles
   WHERE id = auth.uid();

  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.remove_from_cart(p_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_booking_id uuid;
  v_equipment_booking_id uuid;
  v_user_id uuid;
BEGIN
  -- Buscar dados do item do carrinho e verificar se pertence ao usuário autenticado
  SELECT reserved_booking_id, reserved_equipment_booking_id, user_id 
  INTO v_booking_id, v_equipment_booking_id, v_user_id
  FROM cart_items 
  WHERE id = p_id;

  -- Se não encontrou o item, retorna false
  IF NOT FOUND THEN
    RAISE LOG 'Item do carrinho não encontrado: %', p_id;
    RETURN false;
  END IF;

  -- Verificar se é o próprio usuário ou admin
  IF v_user_id != auth.uid() AND NOT is_admin() THEN
    RAISE LOG 'Usuário % não autorizado a remover item %', auth.uid(), p_id;
    RETURN false;
  END IF;

  -- Cancelar reserva de sala se existir
  IF v_booking_id IS NOT NULL THEN
    UPDATE bookings 
    SET status = 'cancelled_unpaid'::booking_status, updated_at = now()
    WHERE id = v_booking_id;
    RAISE LOG 'Reserva de sala cancelada: %', v_booking_id;
  END IF;

  -- Cancelar reserva de equipamento se existir
  IF v_equipment_booking_id IS NOT NULL THEN
    UPDATE booking_equipment 
    SET status = 'cancelled_unpaid'::booking_status, updated_at = now()
    WHERE id = v_equipment_booking_id;
    RAISE LOG 'Reserva de equipamento cancelada: %', v_equipment_booking_id;
  END IF;

  -- Remover item do carrinho
  DELETE FROM cart_items 
  WHERE id = p_id;

  -- Verificar se foi removido
  IF NOT FOUND THEN
    RAISE LOG 'Falha ao remover item do carrinho: %', p_id;
    RETURN false;
  END IF;

  RAISE LOG 'Item removido do carrinho com sucesso: %', p_id;
  RETURN true;
END;
$function$;

CREATE OR REPLACE FUNCTION public.clean_expired_cart_items()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_count INTEGER;
  expired_booking_ids uuid[];
  expired_equipment_booking_ids uuid[];
BEGIN
  RAISE LOG 'Iniciando limpeza de itens expirados do carrinho';
  
  -- Primeiro, buscar IDs das reservas que serão afetadas, com tratamento seguro
  BEGIN
    SELECT array_agg(reserved_booking_id) INTO expired_booking_ids
    FROM cart_items
    WHERE expires_at < now() 
      AND reserved_booking_id IS NOT NULL;
  EXCEPTION WHEN OTHERS THEN
    RAISE LOG 'Erro ao buscar booking IDs expirados: %', SQLERRM;
    expired_booking_ids := NULL;
  END;
  
  BEGIN
    SELECT array_agg(reserved_equipment_booking_id) INTO expired_equipment_booking_ids  
    FROM cart_items
    WHERE expires_at < now() 
      AND reserved_equipment_booking_id IS NOT NULL;
  EXCEPTION WHEN OTHERS THEN
    RAISE LOG 'Erro ao buscar equipment booking IDs expirados: %', SQLERRM;
    expired_equipment_booking_ids := NULL;
  END;
  
  -- Remover itens expirados do carrinho PRIMEIRO
  BEGIN
    DELETE FROM cart_items
    WHERE expires_at < now();
    
    GET DIAGNOSTICS v_count = ROW_COUNT;
    RAISE LOG 'Cart items removidos: %', v_count;
  EXCEPTION WHEN OTHERS THEN
    RAISE LOG 'Erro ao remover cart items: %', SQLERRM;
  END;
  
  -- Depois cancelar as reservas de sala se ainda existirem
  IF expired_booking_ids IS NOT NULL AND array_length(expired_booking_ids, 1) > 0 THEN
    BEGIN
      UPDATE bookings
      SET status = 'cancelled_unpaid'::booking_status, updated_at = now()
      WHERE id = ANY(expired_booking_ids) AND status = 'pending';
      
      GET DIAGNOSTICS v_count = ROW_COUNT;
      RAISE LOG 'Bookings cancelados: %', v_count;
    EXCEPTION WHEN OTHERS THEN
      RAISE LOG 'Erro ao cancelar bookings: %', SQLERRM;
    END;
  END IF;

  -- Cancelar reservas de equipamento se ainda existirem  
  IF expired_equipment_booking_ids IS NOT NULL AND array_length(expired_equipment_booking_ids, 1) > 0 THEN
    BEGIN
      UPDATE booking_equipment
      SET status = 'cancelled_unpaid'::booking_status, updated_at = now()
      WHERE id = ANY(expired_equipment_booking_ids) AND status = 'pending';
      
      GET DIAGNOSTICS v_count = ROW_COUNT;
      RAISE LOG 'Equipment bookings cancelados: %', v_count;
    EXCEPTION WHEN OTHERS THEN
      RAISE LOG 'Erro ao cancelar equipment bookings: %', SQLERRM;
    END;
  END IF;
  
  RAISE LOG 'Limpeza concluída';
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_room_availability(p_room_id uuid, p_date date)
 RETURNS TABLE(hour text, is_available boolean, blocked_reason text)
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
DECLARE
  room_schedule RECORD;
  booking_record RECORD;
  cart_record RECORD;
  current_hour INTEGER;
  hour_time TIME;
  day_of_week INTEGER;
  weekday_name TEXT;
  end_hour INTEGER;
BEGIN
  -- Convert day of week number to name
  day_of_week := EXTRACT(DOW FROM p_date);
  weekday_name := CASE day_of_week
    WHEN 0 THEN 'sunday'
    WHEN 1 THEN 'monday' 
    WHEN 2 THEN 'tuesday'
    WHEN 3 THEN 'wednesday'
    WHEN 4 THEN 'thursday'
    WHEN 5 THEN 'friday'
    WHEN 6 THEN 'saturday'
  END;

  -- Get room schedule for the specific weekday
  SELECT rs.start_time, rs.end_time INTO room_schedule
  FROM room_schedules rs
  WHERE rs.room_id = p_room_id 
    AND rs.weekday = weekday_name::weekday;

  -- If no schedule found for this day, room is closed
  IF NOT FOUND THEN
    RETURN;
  END IF;

  -- Define start and end hours
  current_hour := EXTRACT(HOUR FROM room_schedule.start_time);
  end_hour := EXTRACT(HOUR FROM room_schedule.end_time);
  
  -- Generate available hours (INCLUSIVE do horário de fechamento)
  WHILE current_hour <= end_hour LOOP
    hour_time := (current_hour || ':00')::TIME;
    
    -- Check for confirmed booking at this hour
    SELECT b.id INTO booking_record
    FROM bookings b
    WHERE b.room_id = p_room_id
      AND DATE(b.start_time) = p_date
      AND b.status NOT IN ('cancelled', 'cancelled_unpaid')
      AND hour_time >= b.start_time::TIME
      AND hour_time < b.end_time::TIME
    LIMIT 1;
    
    IF FOUND THEN
      RETURN QUERY SELECT 
        (current_hour || ':00'), 
        FALSE, 
        'Reservado';
      current_hour := current_hour + 1;
      CONTINUE;
    END IF;
    
    -- Check for cart item (temporary reservation) at this hour
    SELECT ci.id INTO cart_record
    FROM cart_items ci
    JOIN bookings b ON ci.reserved_booking_id = b.id
    WHERE b.room_id = p_room_id
      AND DATE(b.start_time) = p_date
      AND b.status = 'pending'
      AND ci.expires_at > NOW()
      AND hour_time >= b.start_time::TIME
      AND hour_time < b.end_time::TIME
    LIMIT 1;
    
    IF FOUND THEN
      RETURN QUERY SELECT 
        (current_hour || ':00'), 
        FALSE, 
        'Temporariamente reservado';
      current_hour := current_hour + 1;
      CONTINUE;
    END IF;
    
    -- Hour is available
    RETURN QUERY SELECT 
      (current_hour || ':00'), 
      TRUE, 
      NULL::TEXT;
    
    current_hour := current_hour + 1;
  END LOOP;
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_equipment_availability(p_equipment_id uuid, p_date date, p_requested_quantity integer DEFAULT 1)
 RETURNS TABLE(hour text, is_available boolean, available_quantity integer, blocked_reason text)
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
DECLARE
  equipment_schedule RECORD;
  equipment_info RECORD;
  current_hour INTEGER;
  hour_time TIME;
  day_of_week INTEGER;
  weekday_name TEXT;
  total_quantity INTEGER;
  reserved_quantity INTEGER;
  cart_reserved_quantity INTEGER;
  end_hour INTEGER;
BEGIN
  -- Get equipment info
  SELECT e.quantity INTO equipment_info
  FROM equipment e
  WHERE e.id = p_equipment_id AND e.is_active = true;
  
  IF NOT FOUND THEN
    RETURN;
  END IF;
  
  total_quantity := equipment_info.quantity;

  -- Convert day of week number to name
  day_of_week := EXTRACT(DOW FROM p_date);
  weekday_name := CASE day_of_week
    WHEN 0 THEN 'sunday'
    WHEN 1 THEN 'monday' 
    WHEN 2 THEN 'tuesday'
    WHEN 3 THEN 'wednesday'
    WHEN 4 THEN 'thursday'
    WHEN 5 THEN 'friday'
    WHEN 6 THEN 'saturday'
  END;

  -- Get equipment schedule for the specific weekday
  SELECT es.start_time, es.end_time INTO equipment_schedule
  FROM equipment_schedules es
  WHERE es.equipment_id = p_equipment_id 
    AND es.weekday = weekday_name::weekday;

  -- If no schedule found for this day, equipment is closed
  IF NOT FOUND THEN
    RETURN;
  END IF;

  -- Define start and end hours
  current_hour := EXTRACT(HOUR FROM equipment_schedule.start_time);
  end_hour := EXTRACT(HOUR FROM equipment_schedule.end_time);
  
  -- Generate availability for each hour (INCLUSIVE do horário de fechamento)
  WHILE current_hour <= end_hour LOOP
    hour_time := (current_hour || ':00')::TIME;
    reserved_quantity := 0;
    cart_reserved_quantity := 0;
    
    -- Check reserved quantity from confirmed bookings
    SELECT COALESCE(SUM(be.quantity), 0) INTO reserved_quantity
    FROM booking_equipment be
    WHERE be.equipment_id = p_equipment_id
      AND DATE(be.start_time) = p_date
      AND be.status NOT IN ('cancelled', 'cancelled_unpaid')
      AND hour_time >= be.start_time::TIME
      AND hour_time < be.end_time::TIME;
    
    -- Check reserved quantity from cart items
    SELECT COALESCE(SUM(be.quantity), 0) INTO cart_reserved_quantity
    FROM cart_items ci
    JOIN booking_equipment be ON ci.reserved_equipment_booking_id = be.id
    WHERE be.equipment_id = p_equipment_id
      AND DATE(be.start_time) = p_date
      AND be.status = 'pending'
      AND ci.expires_at > NOW()
      AND hour_time >= be.start_time::TIME
      AND hour_time < be.end_time::TIME;
    
    reserved_quantity := reserved_quantity + cart_reserved_quantity;
    
    -- Calculate available quantity
    DECLARE
      available_qty INTEGER := total_quantity - reserved_quantity;
    BEGIN
      IF available_qty >= p_requested_quantity THEN
        -- Hour is available
        RETURN QUERY SELECT 
          (current_hour || ':00'), 
          TRUE, 
          available_qty,
          NULL::TEXT;
      ELSE
        -- Hour is unavailable
        RETURN QUERY SELECT 
          (current_hour || ':00'), 
          FALSE, 
          available_qty,
          CASE 
            WHEN available_qty = 0 THEN 'Totalmente reservado'
            ELSE 'Quantidade insuficiente disponível'
          END;
      END IF;
    END;
    
    current_hour := current_hour + 1;
  END LOOP;
END;
$function$;

CREATE OR REPLACE FUNCTION public.confirm_cart_payment(p_user_id uuid, p_order_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Confirmar salas da própria filial
  UPDATE bookings
  SET status = 'confirmed'::booking_status, updated_at = now()
  WHERE id IN (
    SELECT reserved_booking_id FROM cart_items
     WHERE user_id = p_user_id
       AND reserved_booking_id IS NOT NULL
       AND branch_id = current_setting('jwt.claims.branch_id', true)::uuid
  );

  -- Confirmar equipamentos da própria filial
  UPDATE booking_equipment
  SET status = 'confirmed'::booking_status, updated_at = now()
  WHERE id IN (
    SELECT reserved_equipment_booking_id FROM cart_items
     WHERE user_id = p_user_id
       AND reserved_equipment_booking_id IS NOT NULL
       AND branch_id = current_setting('jwt.claims.branch_id', true)::uuid
  );

  -- Limpar carrinho apenas da filial e usuário
  DELETE FROM cart_items
  WHERE user_id = p_user_id
    AND branch_id = current_setting('jwt.claims.branch_id', true)::uuid;

  RETURN true;
END;
$function$;

CREATE OR REPLACE FUNCTION public.update_cart(p_id uuid, p_quantity integer)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_item_type text;
  v_equipment_booking_id uuid;
BEGIN
  -- Verificar se o item existe e pertence ao usuário
  SELECT item_type, reserved_equipment_booking_id 
  INTO v_item_type, v_equipment_booking_id
  FROM cart_items 
  WHERE id = p_id AND user_id = auth.uid();

  -- Se não encontrou o item ou não é do usuário atual, retorna false
  IF NOT FOUND THEN
    RETURN false;
  END IF;

  -- Validar quantidade mínima
  IF p_quantity < 1 THEN
    RETURN false;
  END IF;

  -- Atualizar quantidade no carrinho
  UPDATE cart_items 
  SET quantity = p_quantity, 
      updated_at = now()
  WHERE id = p_id AND user_id = auth.uid();

  -- Se for equipamento, atualizar também a reserva
  IF v_item_type = 'equipment' AND v_equipment_booking_id IS NOT NULL THEN
    UPDATE booking_equipment 
    SET quantity = p_quantity, 
        updated_at = now()
    WHERE id = v_equipment_booking_id;
  END IF;

  RETURN true;
END;
$function$;

CREATE OR REPLACE FUNCTION public.validate_coupon(p_code text, p_user_id uuid, p_total_amount numeric, p_item_count integer, p_applicable_type text DEFAULT 'all'::text)
 RETURNS TABLE(is_valid boolean, coupon_id uuid, discount_amount numeric, error_message text)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_coupon coupons%ROWTYPE;
  v_usage_count INTEGER;
  v_user_usage_count INTEGER;
  v_current_day INTEGER;
  v_current_time TIME;
  v_discount NUMERIC;
BEGIN
  -- Buscar cupom
  SELECT * INTO v_coupon FROM coupons 
  WHERE code = p_code AND is_active = true;
  
  IF NOT FOUND THEN
    RETURN QUERY SELECT false, NULL::UUID, 0::NUMERIC, 'Cupom não encontrado ou inativo';
    RETURN;
  END IF;
  
  -- Verificar validade temporal
  IF v_coupon.valid_until < now() THEN
    RETURN QUERY SELECT false, NULL::UUID, 0::NUMERIC, 'Cupom expirado';
    RETURN;
  END IF;
  
  IF v_coupon.valid_from > now() THEN
    RETURN QUERY SELECT false, NULL::UUID, 0::NUMERIC, 'Cupom ainda não é válido';
    RETURN;
  END IF;
  
  -- Verificar dia da semana (0 = domingo, 1 = segunda, etc)
  v_current_day := EXTRACT(dow FROM now());
  IF NOT (v_current_day = ANY(v_coupon.valid_days)) THEN
    RETURN QUERY SELECT false, NULL::UUID, 0::NUMERIC, 'Cupom não é válido hoje';
    RETURN;
  END IF;
  
  -- Verificar horário
  IF v_coupon.valid_hours_start IS NOT NULL AND v_coupon.valid_hours_end IS NOT NULL THEN
    v_current_time := now()::TIME;
    IF v_current_time < v_coupon.valid_hours_start OR v_current_time > v_coupon.valid_hours_end THEN
      RETURN QUERY SELECT false, NULL::UUID, 0::NUMERIC, 'Cupom não é válido neste horário';
      RETURN;
    END IF;
  END IF;
  
  -- Verificar valor mínimo
  IF p_total_amount < v_coupon.minimum_amount THEN
    RETURN QUERY SELECT false, NULL::UUID, 0::NUMERIC, 'Valor mínimo não atingido';
    RETURN;
  END IF;
  
  -- Verificar quantidade mínima de itens
  IF p_item_count < v_coupon.minimum_items THEN
    RETURN QUERY SELECT false, NULL::UUID, 0::NUMERIC, 'Quantidade mínima de itens não atingida';
    RETURN;
  END IF;
  
  -- Verificar aplicabilidade
  IF v_coupon.applicable_to != 'all' AND v_coupon.applicable_to != p_applicable_type THEN
    RETURN QUERY SELECT false, NULL::UUID, 0::NUMERIC, 'Cupom não aplicável a este tipo de produto/serviço';
    RETURN;
  END IF;
  
  -- Verificar limite total de usos
  IF v_coupon.max_uses IS NOT NULL THEN
    SELECT COUNT(*) INTO v_usage_count FROM coupon_usage WHERE coupon_id = v_coupon.id;
    IF v_usage_count >= v_coupon.max_uses THEN
      RETURN QUERY SELECT false, NULL::UUID, 0::NUMERIC, 'Cupom esgotado';
      RETURN;
    END IF;
  END IF;
  
  -- Verificar limite de uso por usuário
  SELECT COUNT(*) INTO v_user_usage_count 
  FROM coupon_usage 
  WHERE coupon_id = v_coupon.id AND user_id = p_user_id;
  
  IF v_user_usage_count >= v_coupon.max_uses_per_user THEN
    RETURN QUERY SELECT false, NULL::UUID, 0::NUMERIC, 'Você já utilizou este cupom o número máximo de vezes';
    RETURN;
  END IF;
  
  -- Calcular desconto
  IF v_coupon.discount_type = 'fixed' THEN
    v_discount := LEAST(v_coupon.discount_value, p_total_amount);
  ELSE -- percentage
    v_discount := (p_total_amount * v_coupon.discount_value / 100);
  END IF;
  
  -- Retornar sucesso
  RETURN QUERY SELECT true, v_coupon.id, v_discount, NULL::TEXT;
END;
$function$;