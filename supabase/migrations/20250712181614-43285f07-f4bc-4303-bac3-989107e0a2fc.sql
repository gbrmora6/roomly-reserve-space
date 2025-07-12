-- Função para sincronizar calendário de sala
CREATE OR REPLACE FUNCTION public.sync_room_calendar()
RETURNS TRIGGER AS $$
BEGIN
  -- Se a sala foi criada e não tem calendar_id, criar calendário
  IF TG_OP = 'INSERT' AND NEW.google_calendar_id IS NULL THEN
    -- Chama a edge function de forma assíncrona para criar o calendário
    PERFORM net.http_post(
      url := 'https://fgiidcdsvmqxdkclgety.supabase.co/functions/v1/google-calendar-manager',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || current_setting('request.jwt.claims', true)::json->>'anon'
      ),
      body := jsonb_build_object(
        'action', 'create_calendar',
        'roomId', NEW.id
      )
    );
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função para sincronizar eventos de reserva
CREATE OR REPLACE FUNCTION public.sync_booking_calendar()
RETURNS TRIGGER AS $$
DECLARE
  room_calendar_id TEXT;
BEGIN
  -- Buscar o calendar_id da sala
  SELECT google_calendar_id INTO room_calendar_id
  FROM public.rooms 
  WHERE id = COALESCE(NEW.room_id, OLD.room_id);
  
  -- Se a sala tem calendário, sincronizar
  IF room_calendar_id IS NOT NULL THEN
    IF TG_OP = 'INSERT' AND NEW.status = 'confirmed' THEN
      -- Criar evento no calendário
      PERFORM net.http_post(
        url := 'https://fgiidcdsvmqxdkclgety.supabase.co/functions/v1/google-calendar-manager',
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer ' || current_setting('request.jwt.claims', true)::json->>'anon'
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
          'Authorization', 'Bearer ' || current_setting('request.jwt.claims', true)::json->>'anon'
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
          'Authorization', 'Bearer ' || current_setting('request.jwt.claims', true)::json->>'anon'
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
          'Authorization', 'Bearer ' || current_setting('request.jwt.claims', true)::json->>'anon'
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Triggers para sincronização automática
CREATE TRIGGER trigger_sync_room_calendar
  AFTER INSERT ON public.rooms
  FOR EACH ROW
  EXECUTE FUNCTION sync_room_calendar();

CREATE TRIGGER trigger_sync_booking_calendar
  AFTER INSERT OR UPDATE ON public.bookings
  FOR EACH ROW
  EXECUTE FUNCTION sync_booking_calendar();