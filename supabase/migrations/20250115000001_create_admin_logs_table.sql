-- Criar tabela admin_logs para registrar ações dos administradores
CREATE TABLE IF NOT EXISTS public.admin_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  admin_id UUID REFERENCES auth.users(id),
  admin_email TEXT,
  action TEXT NOT NULL,
  details JSONB,
  branch_id UUID REFERENCES public.branches(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Criar índices para melhor performance
CREATE INDEX IF NOT EXISTS idx_admin_logs_admin_id ON public.admin_logs(admin_id);
CREATE INDEX IF NOT EXISTS idx_admin_logs_branch_id ON public.admin_logs(branch_id);
CREATE INDEX IF NOT EXISTS idx_admin_logs_action ON public.admin_logs(action);
CREATE INDEX IF NOT EXISTS idx_admin_logs_created_at ON public.admin_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_admin_logs_admin_email ON public.admin_logs(admin_email);

-- Habilitar RLS (Row Level Security)
ALTER TABLE public.admin_logs ENABLE ROW LEVEL SECURITY;

-- Política para permitir que administradores vejam logs da sua filial
CREATE POLICY "Admins can view logs from their branch" ON public.admin_logs
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
      AND (
        p.role = 'super_admin' OR
        (p.role = 'admin' AND p.branch_id = admin_logs.branch_id)
      )
    )
  );

-- Política para permitir que administradores insiram logs
CREATE POLICY "Admins can insert logs" ON public.admin_logs
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
      AND p.role IN ('admin', 'super_admin')
    )
  );

-- Comentários para documentação
COMMENT ON TABLE public.admin_logs IS 'Tabela para registrar todas as ações realizadas pelos administradores';
COMMENT ON COLUMN public.admin_logs.admin_id IS 'ID do usuário administrador que realizou a ação';
COMMENT ON COLUMN public.admin_logs.admin_email IS 'Email do administrador para facilitar identificação';
COMMENT ON COLUMN public.admin_logs.action IS 'Tipo de ação realizada (ex: create_room, update_equipment, delete_product)';
COMMENT ON COLUMN public.admin_logs.details IS 'Detalhes da ação em formato JSON';
COMMENT ON COLUMN public.admin_logs.branch_id IS 'ID da filial onde a ação foi realizada';
COMMENT ON COLUMN public.admin_logs.created_at IS 'Data e hora da ação';