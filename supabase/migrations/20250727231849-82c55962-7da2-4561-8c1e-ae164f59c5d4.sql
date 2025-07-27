-- Fix RLS policies for ongoing 403 errors

-- Fix profiles table RLS policies
DROP POLICY IF EXISTS "Users can insert their own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON profiles;
DROP POLICY IF EXISTS "System can insert profiles" ON profiles;

-- Allow users to insert their own profile or system to insert
CREATE POLICY "Users can insert their own profile" ON profiles 
FOR INSERT 
WITH CHECK (
  auth.uid() = id OR 
  -- Allow system operations (for triggers)
  current_setting('role') = 'service_role' OR
  -- Allow admin operations
  EXISTS (
    SELECT 1 FROM profiles p 
    WHERE p.id = auth.uid() 
    AND p.role IN ('admin', 'super_admin')
  )
);

-- Allow users to update their own profile or admins to update any
CREATE POLICY "Users can update their own profile" ON profiles 
FOR UPDATE 
USING (
  auth.uid() = id OR 
  -- Allow system operations
  current_setting('role') = 'service_role' OR
  -- Allow admin operations
  EXISTS (
    SELECT 1 FROM profiles p 
    WHERE p.id = auth.uid() 
    AND p.role IN ('admin', 'super_admin')
  )
);

-- Allow system to create profiles during signup
CREATE POLICY "System can create profiles" ON profiles 
FOR INSERT 
WITH CHECK (
  -- Allow during user signup (when no auth.uid() exists yet)
  auth.uid() IS NULL OR
  auth.uid() = id OR
  current_setting('role') = 'service_role'
);

-- Fix room_schedules policies
DROP POLICY IF EXISTS "Admins can insert room schedules" ON room_schedules;
DROP POLICY IF EXISTS "System can insert room schedules" ON room_schedules;

CREATE POLICY "Admins can insert room schedules" ON room_schedules 
FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles p 
    WHERE p.id = auth.uid() 
    AND p.role IN ('admin', 'super_admin')
  ) OR
  current_setting('role') = 'service_role'
);

-- Fix admin_logs policies  
DROP POLICY IF EXISTS "Admins can insert logs for their branch" ON admin_logs;
DROP POLICY IF EXISTS "System can insert admin logs" ON admin_logs;

CREATE POLICY "Admins can insert logs for their branch" ON admin_logs 
FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles p 
    WHERE p.id = auth.uid() 
    AND p.role IN ('admin', 'super_admin')
    AND (p.role = 'super_admin' OR p.branch_id = admin_logs.branch_id)
  ) OR
  current_setting('role') = 'service_role'
);

-- Allow service role to do anything (for system operations)
CREATE POLICY "Service role can manage profiles" ON profiles 
FOR ALL 
USING (current_setting('role') = 'service_role')
WITH CHECK (current_setting('role') = 'service_role');

CREATE POLICY "Service role can manage room_schedules" ON room_schedules 
FOR ALL 
USING (current_setting('role') = 'service_role')
WITH CHECK (current_setting('role') = 'service_role');

CREATE POLICY "Service role can manage admin_logs" ON admin_logs 
FOR ALL 
USING (current_setting('role') = 'service_role')
WITH CHECK (current_setting('role') = 'service_role');