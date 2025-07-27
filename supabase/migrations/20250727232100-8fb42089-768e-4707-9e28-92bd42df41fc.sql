-- Fix equipment_schedules RLS policies for 403 errors

-- Drop existing policies
DROP POLICY IF EXISTS "Admins can insert equipment schedules" ON equipment_schedules;
DROP POLICY IF EXISTS "System can insert equipment schedules" ON equipment_schedules;

-- Create proper insert policy for equipment_schedules
CREATE POLICY "Admins can insert equipment schedules" ON equipment_schedules 
FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles p 
    WHERE p.id = auth.uid() 
    AND p.role IN ('admin', 'super_admin')
  ) OR
  current_setting('role') = 'service_role'
);

-- Allow service role to manage equipment_schedules
CREATE POLICY "Service role can manage equipment_schedules" ON equipment_schedules 
FOR ALL 
USING (current_setting('role') = 'service_role')
WITH CHECK (current_setting('role') = 'service_role');