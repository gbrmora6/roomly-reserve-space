-- Criar tabela system_settings para armazenar configurações do sistema
CREATE TABLE IF NOT EXISTS public.system_settings (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  setting_key text UNIQUE NOT NULL,
  setting_value text NOT NULL,
  description text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Inserir configurações padrão de expiração do carrinho
INSERT INTO public.system_settings (setting_key, setting_value, description) VALUES
  ('cart_expiration_room', '"15 minutes"', 'Tempo de expiração para itens de sala no carrinho'),
  ('cart_expiration_equipment', '"15 minutes"', 'Tempo de expiração para itens de equipamento no carrinho')
ON CONFLICT (setting_key) DO NOTHING;

-- Habilitar RLS
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;

-- Política para permitir leitura para usuários autenticados
CREATE POLICY "Usuários autenticados podem ler configurações" ON public.system_settings
  FOR SELECT TO authenticated USING (true);

-- Política para permitir escrita apenas para administradores
CREATE POLICY "Apenas administradores podem modificar configurações" ON public.system_settings
  FOR ALL TO authenticated USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND role IN ('super_admin', 'admin')
    )
  );

-- Trigger para atualizar updated_at
CREATE OR REPLACE FUNCTION update_system_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_system_settings_updated_at_trigger
  BEFORE UPDATE ON public.system_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_system_settings_updated_at();

-- Comentário para confirmar que a migração foi aplicada
-- Tabela system_settings criada com configurações padrão de expiração