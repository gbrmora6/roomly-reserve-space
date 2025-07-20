-- Verificar e corrigir horários das salas de teste
-- Esta migração ajusta os horários de funcionamento das salas para permitir testes completos

-- Primeiro, vamos verificar se existe a sala 'teste 3'
DO $$
DECLARE
    room_id_var UUID;
    branch_id_var UUID;
BEGIN
    -- Buscar uma filial existente
    SELECT id INTO branch_id_var FROM branches LIMIT 1;
    
    -- Se não houver filiais, criar uma de teste
    IF branch_id_var IS NULL THEN
        INSERT INTO branches (name, city, address, phone, email)
        VALUES ('Filial Teste', 'São Paulo', 'Rua Teste, 123', '(11) 99999-9999', 'teste@teste.com')
        RETURNING id INTO branch_id_var;
    END IF;
    
    -- Verificar se a sala 'teste 3' existe
    SELECT id INTO room_id_var FROM rooms WHERE name ILIKE '%teste 3%' OR name ILIKE '%teste3%';
    
    -- Se não existir, criar a sala de teste
    IF room_id_var IS NULL THEN
        INSERT INTO rooms (
            name, 
            description, 
            price_per_hour, 
            capacity, 
            has_wifi, 
            has_ac, 
            has_projector, 
            has_whiteboard, 
            branch_id,
            is_active
        ) VALUES (
            'Sala Teste 3',
            'Sala de teste para verificação de horários',
            50.00,
            10,
            true,
            true,
            true,
            true,
            branch_id_var,
            true
        ) RETURNING id INTO room_id_var;
        
        RAISE NOTICE 'Sala teste 3 criada com ID: %', room_id_var;
    ELSE
        RAISE NOTICE 'Sala teste 3 encontrada com ID: %', room_id_var;
    END IF;
    
    -- Remover horários existentes da sala
    DELETE FROM room_schedules WHERE room_id = room_id_var;
    
    -- Inserir novos horários de funcionamento (6:00 às 23:00 para todos os dias)
    INSERT INTO room_schedules (room_id, weekday, start_time, end_time) VALUES
        (room_id_var, 'monday', '06:00:00', '23:00:00'),
        (room_id_var, 'tuesday', '06:00:00', '23:00:00'),
        (room_id_var, 'wednesday', '06:00:00', '23:00:00'),
        (room_id_var, 'thursday', '06:00:00', '23:00:00'),
        (room_id_var, 'friday', '06:00:00', '23:00:00'),
        (room_id_var, 'saturday', '08:00:00', '20:00:00'),
        (room_id_var, 'sunday', '08:00:00', '18:00:00');
    
    RAISE NOTICE 'Horários de funcionamento atualizados para a sala teste 3';
    
END $$;

-- Verificar se existem outras salas de teste e ajustar seus horários também
DO $$
DECLARE
    room_record RECORD;
BEGIN
    FOR room_record IN 
        SELECT id, name FROM rooms WHERE name ILIKE '%teste%' AND is_active = true
    LOOP
        -- Remover horários existentes
        DELETE FROM room_schedules WHERE room_id = room_record.id;
        
        -- Inserir horários amplos para testes
        INSERT INTO room_schedules (room_id, weekday, start_time, end_time) VALUES
            (room_record.id, 'monday', '06:00:00', '23:00:00'),
            (room_record.id, 'tuesday', '06:00:00', '23:00:00'),
            (room_record.id, 'wednesday', '06:00:00', '23:00:00'),
            (room_record.id, 'thursday', '06:00:00', '23:00:00'),
            (room_record.id, 'friday', '06:00:00', '23:00:00'),
            (room_record.id, 'saturday', '08:00:00', '20:00:00'),
            (room_record.id, 'sunday', '08:00:00', '18:00:00');
        
        RAISE NOTICE 'Horários atualizados para sala: % (ID: %)', room_record.name, room_record.id;
    END LOOP;
END $$;