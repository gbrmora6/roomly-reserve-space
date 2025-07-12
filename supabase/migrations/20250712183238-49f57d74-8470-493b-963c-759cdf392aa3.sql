-- Habilitar extensão pg_net para chamadas HTTP
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Remover triggers existentes
DROP TRIGGER IF EXISTS trigger_sync_room_calendar ON public.rooms;
DROP TRIGGER IF EXISTS trigger_sync_booking_calendar ON public.bookings;

-- Recriar função para sincronizar calendário de sala com service role
CREATE OR REPLACE FUNCTION public.sync_room_calendar()
RETURNS TRIGGER AS $$
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recriar função para sincronizar eventos de reserva com service role
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recriar triggers
CREATE TRIGGER trigger_sync_room_calendar
  AFTER INSERT ON public.rooms
  FOR EACH ROW
  EXECUTE FUNCTION sync_room_calendar();

CREATE TRIGGER trigger_sync_booking_calendar
  AFTER INSERT OR UPDATE ON public.bookings
  FOR EACH ROW
  EXECUTE FUNCTION sync_booking_calendar();