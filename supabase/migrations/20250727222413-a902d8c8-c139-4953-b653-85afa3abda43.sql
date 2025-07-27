-- Criar buckets de storage para fotos se não existirem
INSERT INTO storage.buckets (id, name, public)
VALUES 
  ('room-photos', 'room-photos', true),
  ('equipment-photos', 'equipment-photos', true),
  ('product-photos', 'product-photos', true)
ON CONFLICT (id) DO NOTHING;

-- Políticas para upload de fotos de salas
CREATE POLICY "Admins can upload room photos" 
ON storage.objects 
FOR INSERT 
WITH CHECK (
  bucket_id = 'room-photos' AND 
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = auth.uid() 
    AND role IN ('admin', 'super_admin')
  )
);

CREATE POLICY "Anyone can view room photos" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'room-photos');

CREATE POLICY "Admins can delete room photos" 
ON storage.objects 
FOR DELETE 
USING (
  bucket_id = 'room-photos' AND 
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = auth.uid() 
    AND role IN ('admin', 'super_admin')
  )
);

-- Políticas para upload de fotos de equipamentos
CREATE POLICY "Admins can upload equipment photos" 
ON storage.objects 
FOR INSERT 
WITH CHECK (
  bucket_id = 'equipment-photos' AND 
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = auth.uid() 
    AND role IN ('admin', 'super_admin')
  )
);

CREATE POLICY "Anyone can view equipment photos" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'equipment-photos');

CREATE POLICY "Admins can delete equipment photos" 
ON storage.objects 
FOR DELETE 
USING (
  bucket_id = 'equipment-photos' AND 
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = auth.uid() 
    AND role IN ('admin', 'super_admin')
  )
);

-- Políticas para upload de fotos de produtos
CREATE POLICY "Admins can upload product photos" 
ON storage.objects 
FOR INSERT 
WITH CHECK (
  bucket_id = 'product-photos' AND 
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = auth.uid() 
    AND role IN ('admin', 'super_admin')
  )
);

CREATE POLICY "Anyone can view product photos" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'product-photos');

CREATE POLICY "Admins can delete product photos" 
ON storage.objects 
FOR DELETE 
USING (
  bucket_id = 'product-photos' AND 
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = auth.uid() 
    AND role IN ('admin', 'super_admin')
  )
);