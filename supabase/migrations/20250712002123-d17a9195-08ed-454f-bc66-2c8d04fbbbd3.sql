-- Criar buckets de storage para as fotos
INSERT INTO storage.buckets (id, name, public) VALUES 
  ('room-photos', 'room-photos', true),
  ('equipment-photos', 'equipment-photos', true),
  ('product-photos', 'product-photos', true),
  ('site-photos', 'site-photos', true);

-- Criar políticas de storage para permitir acesso público
CREATE POLICY "Public Access" ON storage.objects FOR SELECT USING (true);
CREATE POLICY "Authenticated users can upload" ON storage.objects FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can update" ON storage.objects FOR UPDATE USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can delete" ON storage.objects FOR DELETE USING (auth.role() = 'authenticated');