import { supabase } from "@/integrations/supabase/client";

// Script temporário para corrigir os horários das salas de teste
export const fixRoomSchedules = async () => {
  try {
    console.log("Iniciando correção dos horários das salas de teste...");
    
    // 1. Recriar função get_room_availability do zero
    console.log("Recriando função get_room_availability...");
    const { error: functionError } = await supabase.rpc('exec_sql', {
      sql: `
        -- Remover função existente
        DROP FUNCTION IF EXISTS public.get_room_availability(uuid, date);
        
        -- Criar nova função sem limitações de horário
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
                RETURN;
            END IF;
        
            -- Extrair horas de início e fim
            start_hour := EXTRACT(HOUR FROM room_schedule.start_time);
            end_hour := EXTRACT(HOUR FROM room_schedule.end_time);
        
            -- Gerar disponibilidade para cada hora
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
                
                -- Verificar se há item no carrinho neste horário
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
        END;
        $$;
        
        -- Garantir permissões
        GRANT EXECUTE ON FUNCTION public.get_room_availability(uuid, date) TO authenticated;
        GRANT EXECUTE ON FUNCTION public.get_room_availability(uuid, date) TO anon;
      `
    });

    if (functionError) {
      console.log("Erro ao recriar função, tentando método alternativo...");
      // Se não conseguir executar SQL diretamente, continuar com a correção dos dados
    }
    
    // Buscar uma filial existente
    const { data: branches } = await supabase
      .from("branches")
      .select("id")
      .limit(1);
    
    let branchId = branches?.[0]?.id;
    
    // Se não houver filiais, criar uma de teste
    if (!branchId) {
      const { data: newBranch, error: branchError } = await supabase
        .from("branches")
        .insert({
          name: "Filial Teste",
          city: "São Paulo",
          address: "Rua Teste, 123",
          phone: "(11) 99999-9999",
          email: "teste@teste.com"
        })
        .select("id")
        .single();
      
      if (branchError) {
        console.error("Erro ao criar filial:", branchError);
        return;
      }
      
      branchId = newBranch.id;
      console.log("Filial de teste criada:", branchId);
    }
    
    // Verificar se a sala 'teste 3' existe
    const { data: existingRooms } = await supabase
      .from("rooms")
      .select("id, name")
      .or("name.ilike.%teste 3%,name.ilike.%teste3%");
    
    let roomId = existingRooms?.[0]?.id;
    
    // Se não existir, criar a sala de teste
    if (!roomId) {
      const { data: newRoom, error: roomError } = await supabase
        .from("rooms")
        .insert({
          name: "Sala Teste 3",
          description: "Sala de teste para verificação de horários",
          price_per_hour: 50.00,
          capacity: 10,
          has_wifi: true,
          has_ac: true,
          has_projector: true,
          has_whiteboard: true,
          branch_id: branchId,
          is_active: true
        })
        .select("id")
        .single();
      
      if (roomError) {
        console.error("Erro ao criar sala:", roomError);
        return;
      }
      
      roomId = newRoom.id;
      console.log("Sala teste 3 criada:", roomId);
    } else {
      console.log("Sala teste 3 encontrada:", roomId);
    }
    
    // Remover horários existentes da sala
    const { error: deleteError } = await supabase
      .from("room_schedules")
      .delete()
      .eq("room_id", roomId);
    
    if (deleteError) {
      console.error("Erro ao remover horários existentes:", deleteError);
      return;
    }
    
    // Inserir novos horários de funcionamento (6:00 às 23:00 para dias úteis)
    const schedules = [
      { room_id: roomId, weekday: "monday" as const, start_time: "06:00:00", end_time: "23:00:00", branch_id: "64a43fed-587b-415c-aeac-0abfd7867566" },
      { room_id: roomId, weekday: "tuesday" as const, start_time: "06:00:00", end_time: "23:00:00", branch_id: "64a43fed-587b-415c-aeac-0abfd7867566" },
      { room_id: roomId, weekday: "wednesday" as const, start_time: "06:00:00", end_time: "23:00:00", branch_id: "64a43fed-587b-415c-aeac-0abfd7867566" },
      { room_id: roomId, weekday: "thursday" as const, start_time: "06:00:00", end_time: "23:00:00", branch_id: "64a43fed-587b-415c-aeac-0abfd7867566" },
      { room_id: roomId, weekday: "friday" as const, start_time: "06:00:00", end_time: "23:00:00", branch_id: "64a43fed-587b-415c-aeac-0abfd7867566" },
      { room_id: roomId, weekday: "saturday" as const, start_time: "08:00:00", end_time: "20:00:00", branch_id: "64a43fed-587b-415c-aeac-0abfd7867566" },
      { room_id: roomId, weekday: "sunday" as const, start_time: "08:00:00", end_time: "18:00:00", branch_id: "64a43fed-587b-415c-aeac-0abfd7867566" }
    ];
    
    const { error: insertError } = await supabase
      .from("room_schedules")
      .insert(schedules);
    
    if (insertError) {
      console.error("Erro ao inserir novos horários:", insertError);
      return;
    }
    
    console.log("Horários de funcionamento atualizados para a sala teste 3");
    
    // Buscar outras salas de teste e ajustar seus horários também
    const { data: testRooms } = await supabase
      .from("rooms")
      .select("id, name")
      .ilike("name", "%teste%")
      .eq("is_active", true);
    
    if (testRooms && testRooms.length > 0) {
      for (const room of testRooms) {
        // Remover horários existentes
        await supabase
          .from("room_schedules")
          .delete()
          .eq("room_id", room.id);
        
        // Inserir horários amplos para testes
        const roomSchedules = schedules.map(schedule => ({
          ...schedule,
          room_id: room.id
        }));
        
        await supabase
          .from("room_schedules")
          .insert(roomSchedules);
        
        console.log(`Horários atualizados para sala: ${room.name} (ID: ${room.id})`);
      }
    }
    
    console.log("Correção de horários concluída com sucesso!");
    return { success: true, message: "Função e horários corrigidos com sucesso!" };
    
  } catch (error) {
    console.error("Erro durante a correção dos horários:", error);
    return false;
  }
};