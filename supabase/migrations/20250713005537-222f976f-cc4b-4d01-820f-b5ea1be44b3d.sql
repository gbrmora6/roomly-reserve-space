-- Remover triggers relacionados ao Google Calendar
DROP TRIGGER IF EXISTS trigger_sync_room_calendar ON public.rooms;
DROP TRIGGER IF EXISTS trigger_sync_booking_calendar ON public.bookings;

-- Remover funções relacionadas ao Google Calendar
DROP FUNCTION IF EXISTS public.sync_room_calendar();
DROP FUNCTION IF EXISTS public.sync_booking_calendar();

-- Remover índice do Google Calendar
DROP INDEX IF EXISTS idx_rooms_google_calendar_id;

-- Remover coluna google_calendar_id da tabela rooms
ALTER TABLE public.rooms 
DROP COLUMN IF EXISTS google_calendar_id;

-- Remover tabela calendar_sync_log completamente
DROP TABLE IF EXISTS public.calendar_sync_log;