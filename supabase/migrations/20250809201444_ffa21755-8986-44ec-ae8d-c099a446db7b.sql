-- Melhorias no sistema de disponibilidade para salas e equipamentos

-- 1. Adicionar configurações de intervalo mínimo para salas
ALTER TABLE rooms ADD COLUMN IF NOT EXISTS minimum_interval_minutes INTEGER DEFAULT 60;
ALTER TABLE rooms ADD COLUMN IF NOT EXISTS advance_booking_hours INTEGER DEFAULT 1;

-- 2. Adicionar configurações de intervalo mínimo para equipamentos  
ALTER TABLE equipment ADD COLUMN IF NOT EXISTS minimum_interval_minutes INTEGER DEFAULT 60;
ALTER TABLE equipment ADD COLUMN IF NOT EXISTS advance_booking_hours INTEGER DEFAULT 1;

-- 3. Criar tabela para bloqueios manuais de salas
CREATE TABLE IF NOT EXISTS room_manual_blocks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ NOT NULL,
  reason TEXT,
  created_by UUID REFERENCES profiles(id),
  branch_id UUID NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 4. Criar tabela para bloqueios manuais de equipamentos
CREATE TABLE IF NOT EXISTS equipment_manual_blocks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  equipment_id UUID NOT NULL REFERENCES equipment(id) ON DELETE CASCADE,
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ NOT NULL,
  reason TEXT,
  created_by UUID REFERENCES profiles(id),
  branch_id UUID NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 5. Atualizar função get_room_availability para considerar bloqueios manuais e horários passados
CREATE OR REPLACE FUNCTION public.get_room_availability(p_room_id uuid, p_date date)
 RETURNS TABLE(hour text, is_available boolean, blocked_reason text)
 LANGUAGE plpgsql
AS $function$
DECLARE
    schedule_record RECORD;
    current_hour INTEGER;
    end_hour INTEGER;
    hour_time TIME;
    current_datetime TIMESTAMPTZ;
    hour_datetime TIMESTAMPTZ;
    booking_exists BOOLEAN;
    cart_exists BOOLEAN;
    manual_block_exists BOOLEAN;
    weekday_name TEXT;
    room_advance_hours INTEGER;
BEGIN
    -- Obter configurações da sala
    SELECT advance_booking_hours INTO room_advance_hours
    FROM rooms WHERE id = p_room_id;
    
    room_advance_hours := COALESCE(room_advance_hours, 1);
    current_datetime := now();
    
    -- Converter dia da semana para nome
    weekday_name := CASE EXTRACT(DOW FROM p_date)
        WHEN 0 THEN 'sunday'
        WHEN 1 THEN 'monday'
        WHEN 2 THEN 'tuesday'
        WHEN 3 THEN 'wednesday'
        WHEN 4 THEN 'thursday'
        WHEN 5 THEN 'friday'
        WHEN 6 THEN 'saturday'
    END;
    
    RAISE LOG 'Buscando disponibilidade para sala % em % (%)', p_room_id, p_date, weekday_name;
    
    -- Processar TODOS os horários de funcionamento da sala para o dia
    FOR schedule_record IN 
        SELECT rs.start_time, rs.end_time
        FROM room_schedules rs
        WHERE rs.room_id = p_room_id
          AND rs.weekday::TEXT = weekday_name
        ORDER BY rs.start_time
    LOOP
        current_hour := EXTRACT(HOUR FROM schedule_record.start_time);
        end_hour := EXTRACT(HOUR FROM schedule_record.end_time);
        
        RAISE LOG 'Processando período das %:00 às %:00', current_hour, end_hour;

        -- Gerar disponibilidade para cada hora do período
        WHILE current_hour < end_hour LOOP
            hour_time := (current_hour || ':00')::TIME;
            hour_datetime := (p_date || ' ' || hour_time)::TIMESTAMPTZ;
            
            booking_exists := FALSE;
            cart_exists := FALSE;
            manual_block_exists := FALSE;
            
            -- Verificar se o horário já passou (considerando antecedência mínima)
            IF hour_datetime <= (current_datetime + (room_advance_hours || ' hours')::INTERVAL) THEN
                RETURN QUERY SELECT 
                    (current_hour || ':00'), 
                    FALSE, 
                    'Horário já passou ou muito próximo';
                current_hour := current_hour + 1;
                CONTINUE;
            END IF;
            
            -- Verificar bloqueios manuais
            SELECT EXISTS(
                SELECT 1 FROM room_manual_blocks rmb
                WHERE rmb.room_id = p_room_id
                    AND hour_datetime >= rmb.start_time
                    AND hour_datetime < rmb.end_time
            ) INTO manual_block_exists;
            
            IF manual_block_exists THEN
                RETURN QUERY SELECT 
                    (current_hour || ':00'), 
                    FALSE, 
                    'Bloqueado manualmente';
                current_hour := current_hour + 1;
                CONTINUE;
            END IF;
            
            -- Verificar se há reserva confirmada neste horário
            SELECT EXISTS(
                SELECT 1 FROM bookings b
                WHERE b.room_id = p_room_id
                    AND DATE(b.start_time) = p_date
                    AND b.status NOT IN ('cancelled', 'recused')
                    AND hour_time >= b.start_time::TIME
                    AND hour_time < b.end_time::TIME
            ) INTO booking_exists;
            
            IF booking_exists THEN
                RETURN QUERY SELECT 
                    (current_hour || ':00'), 
                    FALSE, 
                    'Reservado';
                current_hour := current_hour + 1;
                CONTINUE;
            END IF;
            
            -- Verificar se há item no carrinho (reserva temporária) neste horário
            SELECT EXISTS(
                SELECT 1 FROM cart_items ci
                JOIN bookings b ON ci.reserved_booking_id = b.id
                WHERE b.room_id = p_room_id
                    AND DATE(b.start_time) = p_date
                    AND ci.expires_at > NOW()
                    AND hour_time >= b.start_time::TIME
                    AND hour_time < b.end_time::TIME
            ) INTO cart_exists;
            
            IF cart_exists THEN
                RETURN QUERY SELECT 
                    (current_hour || ':00'), 
                    FALSE, 
                    'Temporariamente reservado';
                current_hour := current_hour + 1;
                CONTINUE;
            END IF;
            
            -- Horário está disponível
            RETURN QUERY SELECT 
                (current_hour || ':00'), 
                TRUE, 
                NULL::TEXT;
            
            current_hour := current_hour + 1;
        END LOOP;
        
        -- Adicionar o horário de TÉRMINO como disponível para seleção
        hour_time := (end_hour || ':00')::TIME;
        hour_datetime := (p_date || ' ' || hour_time)::TIMESTAMPTZ;
        
        -- Verificar se o horário de término não conflita com outras reservas
        SELECT EXISTS(
            SELECT 1 FROM bookings b
            WHERE b.room_id = p_room_id
                AND DATE(b.start_time) = p_date
                AND b.status NOT IN ('cancelled', 'recused')
                AND hour_time = b.start_time::TIME
        ) INTO booking_exists;
        
        SELECT EXISTS(
            SELECT 1 FROM cart_items ci
            JOIN bookings b ON ci.reserved_booking_id = b.id
            WHERE b.room_id = p_room_id
                AND DATE(b.start_time) = p_date
                AND ci.expires_at > NOW()
                AND hour_time = b.start_time::TIME
        ) INTO cart_exists;
        
        SELECT EXISTS(
            SELECT 1 FROM room_manual_blocks rmb
            WHERE rmb.room_id = p_room_id
                AND hour_datetime >= rmb.start_time
                AND hour_datetime < rmb.end_time
        ) INTO manual_block_exists;
        
        IF NOT booking_exists AND NOT cart_exists AND NOT manual_block_exists THEN
            RETURN QUERY SELECT 
                (end_hour || ':00'), 
                TRUE, 
                'Horário de término';
        END IF;
        
    END LOOP;
    
    RAISE LOG 'Função get_room_availability concluída para sala % em %', p_room_id, p_date;
END;
$function$;

-- 6. Atualizar função get_equipment_availability para considerar bloqueios manuais e horários passados
CREATE OR REPLACE FUNCTION public.get_equipment_availability(p_equipment_id uuid, p_date date, p_requested_quantity integer DEFAULT 1)
 RETURNS TABLE(hour text, is_available boolean, available_quantity integer, blocked_reason text)
 LANGUAGE plpgsql
AS $function$
DECLARE
  equipment_schedule RECORD;
  equipment_info RECORD;
  current_hour INTEGER;
  hour_time TIME;
  hour_datetime TIMESTAMPTZ;
  current_datetime TIMESTAMPTZ;
  day_of_week INTEGER;
  weekday_name TEXT;
  total_quantity INTEGER;
  reserved_quantity INTEGER;
  end_hour INTEGER;
  equipment_advance_hours INTEGER;
  manual_block_exists BOOLEAN;
BEGIN
  -- Obter informações do equipamento
  SELECT e.quantity, e.advance_booking_hours INTO equipment_info
  FROM equipment e
  WHERE e.id = p_equipment_id AND e.is_active = true;
  
  IF NOT FOUND THEN
    RETURN;
  END IF;
  
  total_quantity := equipment_info.quantity;
  equipment_advance_hours := COALESCE(equipment_info.advance_booking_hours, 1);
  current_datetime := now();

  -- Converter número do dia da semana para nome
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

  -- Buscar horários de funcionamento do equipamento para o dia da semana específico
  FOR equipment_schedule IN
    SELECT es.start_time, es.end_time
    FROM equipment_schedules es
    WHERE es.equipment_id = p_equipment_id 
      AND es.weekday = weekday_name::weekday
    ORDER BY es.start_time
  LOOP
    -- Definir horário de início e fim
    current_hour := EXTRACT(HOUR FROM equipment_schedule.start_time);
    end_hour := EXTRACT(HOUR FROM equipment_schedule.end_time);
    
    -- Gerar horários disponíveis
    WHILE current_hour < end_hour LOOP
      hour_time := (current_hour || ':00')::TIME;
      hour_datetime := (p_date || ' ' || hour_time)::TIMESTAMPTZ;
      reserved_quantity := 0;
      manual_block_exists := FALSE;
      
      -- Verificar se o horário já passou (considerando antecedência mínima)
      IF hour_datetime <= (current_datetime + (equipment_advance_hours || ' hours')::INTERVAL) THEN
        RETURN QUERY SELECT 
          (current_hour || ':00'), 
          FALSE, 
          0,
          'Horário já passou ou muito próximo';
        current_hour := current_hour + 1;
        CONTINUE;
      END IF;
      
      -- Verificar bloqueios manuais
      SELECT EXISTS(
        SELECT 1 FROM equipment_manual_blocks emb
        WHERE emb.equipment_id = p_equipment_id
          AND hour_datetime >= emb.start_time
          AND hour_datetime < emb.end_time
      ) INTO manual_block_exists;
      
      IF manual_block_exists THEN
        RETURN QUERY SELECT 
          (current_hour || ':00'), 
          FALSE, 
          0,
          'Bloqueado manualmente';
        current_hour := current_hour + 1;
        CONTINUE;
      END IF;
      
      -- Verificar quantas unidades estão reservadas neste horário (paid e in_process)
      SELECT COALESCE(SUM(be.quantity), 0) INTO reserved_quantity
      FROM booking_equipment be
      WHERE be.equipment_id = p_equipment_id
        AND DATE(be.start_time) = p_date
        AND be.status IN ('paid', 'in_process')
        AND (
            (be.start_time::TIME <= hour_time AND be.end_time::TIME > hour_time)
            OR (be.start_time::TIME < (hour_time + '1 hour'::INTERVAL)::TIME AND be.end_time::TIME >= (hour_time + '1 hour'::INTERVAL)::TIME)
            OR (be.start_time::TIME >= hour_time AND be.end_time::TIME <= (hour_time + '1 hour'::INTERVAL)::TIME)
        );
      
      -- Calcular quantidade disponível
      DECLARE
        available_qty INTEGER := total_quantity - reserved_quantity;
      BEGIN
        IF available_qty >= p_requested_quantity THEN
          -- Horário disponível
          RETURN QUERY SELECT 
            (current_hour || ':00'), 
            TRUE, 
            available_qty,
            NULL::TEXT;
        ELSE
          -- Horário indisponível
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
  END LOOP;
END;
$function$;

-- 7. Criar RLS para as tabelas de bloqueios manuais
ALTER TABLE room_manual_blocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE equipment_manual_blocks ENABLE ROW LEVEL SECURITY;

-- Políticas para bloqueios manuais de salas
CREATE POLICY "Admins can manage room manual blocks" ON room_manual_blocks
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.id = auth.uid() 
    AND p.role IN ('admin', 'super_admin')
    AND (p.role = 'super_admin' OR p.branch_id = room_manual_blocks.branch_id)
  )
);

CREATE POLICY "Users can view room manual blocks" ON room_manual_blocks
FOR SELECT USING (true);

-- Políticas para bloqueios manuais de equipamentos  
CREATE POLICY "Admins can manage equipment manual blocks" ON equipment_manual_blocks
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.id = auth.uid() 
    AND p.role IN ('admin', 'super_admin')
    AND (p.role = 'super_admin' OR p.branch_id = equipment_manual_blocks.branch_id)
  )
);

CREATE POLICY "Users can view equipment manual blocks" ON equipment_manual_blocks
FOR SELECT USING (true);

-- 8. Criar triggers para atualizar updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_room_manual_blocks_updated_at 
    BEFORE UPDATE ON room_manual_blocks 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_equipment_manual_blocks_updated_at 
    BEFORE UPDATE ON equipment_manual_blocks 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();