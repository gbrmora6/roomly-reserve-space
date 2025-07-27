-- Critical Security Fixes

-- 1. Add missing RLS policies for messages table
CREATE POLICY "Users can view messages for their bookings" 
ON public.messages 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.bookings b 
    WHERE b.id = messages.booking_id 
    AND (b.user_id = auth.uid() OR EXISTS (
      SELECT 1 FROM public.profiles p 
      WHERE p.id = auth.uid() 
      AND p.role IN ('admin', 'super_admin') 
      AND p.branch_id = messages.branch_id
    ))
  )
);

CREATE POLICY "Users can create messages for their bookings" 
ON public.messages 
FOR INSERT 
WITH CHECK (
  sender_id = auth.uid() AND
  EXISTS (
    SELECT 1 FROM public.bookings b 
    WHERE b.id = messages.booking_id 
    AND (b.user_id = auth.uid() OR EXISTS (
      SELECT 1 FROM public.profiles p 
      WHERE p.id = auth.uid() 
      AND p.role IN ('admin', 'super_admin') 
      AND p.branch_id = messages.branch_id
    ))
  )
);

-- 2. Move extensions from public schema to dedicated schema (security best practice)
CREATE SCHEMA IF NOT EXISTS extensions;
-- Note: Extensions should be moved by admin in production

-- 3. Add security function to validate admin access without hardcoded emails
CREATE OR REPLACE FUNCTION public.is_admin_user()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() 
    AND role IN ('admin', 'super_admin')
  );
END;
$$;

-- 4. Add function to get user role securely
CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  RETURN (
    SELECT role::text FROM public.profiles 
    WHERE id = auth.uid()
  );
END;
$$;