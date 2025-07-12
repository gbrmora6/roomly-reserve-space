-- Verificar e ajustar policy para update de rooms
-- Primeiro, vamos dropar a policy existente e recriar
DROP POLICY IF EXISTS "update_rooms_admin" ON public.rooms;

-- Recrear a policy com verificação mais específica
CREATE POLICY "update_rooms_admin" 
ON public.rooms 
FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 
    FROM profiles p 
    WHERE p.id = auth.uid() 
    AND p.role IN ('admin', 'super_admin')
    AND (p.role = 'super_admin' OR p.branch_id = rooms.branch_id)
  )
);

-- Também verificar policy de select para garantir que funciona
DROP POLICY IF EXISTS "select_rooms_admin" ON public.rooms;
CREATE POLICY "select_rooms_admin"
ON public.rooms
FOR SELECT
USING (
  EXISTS (
    SELECT 1 
    FROM profiles p 
    WHERE p.id = auth.uid() 
    AND p.role IN ('admin', 'super_admin')
    AND (p.role = 'super_admin' OR p.branch_id = rooms.branch_id)
  )
);

-- Ajustar timezone padrão para o Brasil
SET timezone = 'America/Sao_Paulo';