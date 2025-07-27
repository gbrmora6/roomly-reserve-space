-- Criar políticas RLS para admin_logs
DROP POLICY IF EXISTS "Admins can insert logs" ON public.admin_logs;
CREATE POLICY "Admins can insert logs" ON public.admin_logs
  FOR INSERT 
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() 
      AND role IN ('admin', 'super_admin')
    )
  );

DROP POLICY IF EXISTS "Admins can view logs" ON public.admin_logs;
CREATE POLICY "Admins can view logs" ON public.admin_logs
  FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() 
      AND role IN ('admin', 'super_admin')
    )
  );

-- Criar políticas RLS para room_schedules
DROP POLICY IF EXISTS "Admins can manage room schedules" ON public.room_schedules;
CREATE POLICY "Admins can manage room schedules" ON public.room_schedules
  FOR ALL 
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() 
      AND role IN ('admin', 'super_admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() 
      AND role IN ('admin', 'super_admin')
    )
  );

-- Criar políticas RLS para equipment_schedules  
DROP POLICY IF EXISTS "Admins can manage equipment schedules" ON public.equipment_schedules;
CREATE POLICY "Admins can manage equipment schedules" ON public.equipment_schedules
  FOR ALL 
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() 
      AND role IN ('admin', 'super_admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() 
      AND role IN ('admin', 'super_admin')
    )
  );

-- Políticas de Storage para room-photos
DROP POLICY IF EXISTS "Admins can upload room photos" ON storage.objects;
CREATE POLICY "Admins can upload room photos" ON storage.objects
  FOR INSERT 
  WITH CHECK (
    bucket_id = 'room-photos' AND
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() 
      AND role IN ('admin', 'super_admin')
    )
  );

DROP POLICY IF EXISTS "Admins can update room photos" ON storage.objects;
CREATE POLICY "Admins can update room photos" ON storage.objects
  FOR UPDATE 
  USING (
    bucket_id = 'room-photos' AND
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() 
      AND role IN ('admin', 'super_admin')
    )
  );

DROP POLICY IF EXISTS "Admins can delete room photos" ON storage.objects;
CREATE POLICY "Admins can delete room photos" ON storage.objects
  FOR DELETE 
  USING (
    bucket_id = 'room-photos' AND
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() 
      AND role IN ('admin', 'super_admin')
    )
  );

DROP POLICY IF EXISTS "Room photos are publicly viewable" ON storage.objects;
CREATE POLICY "Room photos are publicly viewable" ON storage.objects
  FOR SELECT 
  USING (bucket_id = 'room-photos');

-- Políticas de Storage para equipment-photos
DROP POLICY IF EXISTS "Admins can upload equipment photos" ON storage.objects;
CREATE POLICY "Admins can upload equipment photos" ON storage.objects
  FOR INSERT 
  WITH CHECK (
    bucket_id = 'equipment-photos' AND
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() 
      AND role IN ('admin', 'super_admin')
    )
  );

DROP POLICY IF EXISTS "Admins can update equipment photos" ON storage.objects;
CREATE POLICY "Admins can update equipment photos" ON storage.objects
  FOR UPDATE 
  USING (
    bucket_id = 'equipment-photos' AND
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() 
      AND role IN ('admin', 'super_admin')
    )
  );

DROP POLICY IF EXISTS "Admins can delete equipment photos" ON storage.objects;
CREATE POLICY "Admins can delete equipment photos" ON storage.objects
  FOR DELETE 
  USING (
    bucket_id = 'equipment-photos' AND
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() 
      AND role IN ('admin', 'super_admin')
    )
  );

DROP POLICY IF EXISTS "Equipment photos are publicly viewable" ON storage.objects;
CREATE POLICY "Equipment photos are publicly viewable" ON storage.objects
  FOR SELECT 
  USING (bucket_id = 'equipment-photos');

-- Políticas de Storage para product-photos
DROP POLICY IF EXISTS "Admins can upload product photos" ON storage.objects;
CREATE POLICY "Admins can upload product photos" ON storage.objects
  FOR INSERT 
  WITH CHECK (
    bucket_id = 'product-photos' AND
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() 
      AND role IN ('admin', 'super_admin')
    )
  );

DROP POLICY IF EXISTS "Admins can update product photos" ON storage.objects;
CREATE POLICY "Admins can update product photos" ON storage.objects
  FOR UPDATE 
  USING (
    bucket_id = 'product-photos' AND
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() 
      AND role IN ('admin', 'super_admin')
    )
  );

DROP POLICY IF EXISTS "Admins can delete product photos" ON storage.objects;
CREATE POLICY "Admins can delete product photos" ON storage.objects
  FOR DELETE 
  USING (
    bucket_id = 'product-photos' AND
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() 
      AND role IN ('admin', 'super_admin')
    )
  );

DROP POLICY IF EXISTS "Product photos are publicly viewable" ON storage.objects;
CREATE POLICY "Product photos are publicly viewable" ON storage.objects
  FOR SELECT 
  USING (bucket_id = 'product-photos');