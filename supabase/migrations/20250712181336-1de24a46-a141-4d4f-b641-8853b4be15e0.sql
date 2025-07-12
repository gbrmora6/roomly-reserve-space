-- Adicionar google_calendar_id para salas
ALTER TABLE public.rooms 
ADD COLUMN google_calendar_id TEXT NULL;

-- Adicionar índice para busca rápida
CREATE INDEX idx_rooms_google_calendar_id ON public.rooms(google_calendar_id);

-- Tabela para logs de sincronização
CREATE TABLE public.calendar_sync_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  room_id UUID REFERENCES public.rooms(id),
  action TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  google_event_id TEXT,
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  completed_at TIMESTAMP WITH TIME ZONE,
  branch_id UUID NOT NULL
);

-- Enable RLS
ALTER TABLE public.calendar_sync_log ENABLE ROW LEVEL SECURITY;

-- RLS policies para calendar_sync_log
CREATE POLICY "Admins can view calendar sync logs" 
ON public.calendar_sync_log 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM profiles p 
  WHERE p.id = auth.uid() 
  AND p.role = ANY(ARRAY['admin'::user_role, 'super_admin'::user_role])
  AND p.branch_id = calendar_sync_log.branch_id
));

CREATE POLICY "System can insert calendar sync logs" 
ON public.calendar_sync_log 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "System can update calendar sync logs" 
ON public.calendar_sync_log 
FOR UPDATE 
USING (true);