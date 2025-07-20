-- Remover função existente e recriar do zero
DROP FUNCTION IF EXISTS public.get_room_availability(uuid, date);

-- Criar nova função get_room_availability sem limitações de horário
CREATE OR REPLACE FUNCTION public.get_room_availability(
    p_room_id uuid, 
    p_date date
)
RETURNS TABLE(
    hour text, 
    is_available boolean, 
    blocked_reason text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
    room_schedule RECORD;
    current_hour INTEGER;
    hour_time TIME;
    day_of_week INTEGER;
    weekday_name TEXT;
    start_hour INTEGER;
    end_hour INTEGER;
    booking_exists BOOLEAN;
    cart_exists BOOLEAN;
BEGIN
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

    -- Buscar horário de funcionamento da sala para o dia específico
    SELECT rs.start_time, rs.end_time INTO room_schedule
    FROM room_schedules rs
    WHERE rs.room_id = p_room_id 
        AND rs.weekday = weekday_name::weekday;

    -- Se não encontrar horário para este dia, sala está fechada
    IF NOT FOUND THEN
        RAISE LOG 'Nenhum horário encontrado para sala % no dia %', p_room_id, weekday_name;
        RETURN;
    END IF;

    -- Extrair horas de início e fim
    start_hour := EXTRACT(HOUR FROM room_schedule.start_time);
    end_hour := EXTRACT(HOUR FROM room_schedule.end_time);
    
    RAISE LOG 'Sala % funciona das %:00 às %:00 em %', p_room_id, start_hour, end_hour, weekday_name;

    -- Gerar disponibilidade para cada hora (INCLUSIVE do horário de fechamento)
    current_hour := start_hour;
    WHILE current_hour <= end_hour LOOP
        hour_time := (current_hour || ':00')::TIME;
        booking_exists := FALSE;
        cart_exists := FALSE;
        
        -- Verificar se há reserva confirmada neste horário
        SELECT EXISTS(
            SELECT 1 FROM bookings b
            WHERE b.room_id = p_room_id
                AND DATE(b.start_time) = p_date
                AND b.status NOT IN ('cancelled', 'cancelled_unpaid')
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
                AND b.status = 'pending'
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
    
    RAISE LOG 'Função get_room_availability concluída para sala % em %', p_room_id, p_date;
END;
$$;

-- Garantir que a função tenha as permissões corretas
GRANT EXECUTE ON FUNCTION public.get_room_availability(uuid, date) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_room_availability(uuid, date) TO anon;

-- Log para confirmar criação
DO $$
BEGIN
    RAISE NOTICE 'Nova função get_room_availability criada com sucesso!';
END $$;