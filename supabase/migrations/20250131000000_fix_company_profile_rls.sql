-- Habilitar RLS na tabela company_profile
ALTER TABLE public.company_profile ENABLE ROW LEVEL SECURITY;

-- Política para permitir que usuários vejam o perfil da empresa da sua filial
CREATE POLICY "Users can view company profile of their branch" ON public.company_profile
FOR SELECT USING (
  branch_id IN (
    SELECT p.branch_id 
    FROM public.profiles p 
    WHERE p.id = auth.uid()
  )
);

-- Política para permitir que admins atualizem o perfil da empresa da sua filial
CREATE POLICY "Admins can update company profile of their branch" ON public.company_profile
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid()
    AND p.role IN ('admin', 'super_admin')
    AND (p.branch_id = company_profile.branch_id OR p.role = 'super_admin')
  )
);

-- Política para permitir que admins insiram perfil da empresa
CREATE POLICY "Admins can insert company profile" ON public.company_profile
FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid()
    AND p.role IN ('admin', 'super_admin')
    AND (p.branch_id = branch_id OR p.role = 'super_admin')
  )
);

-- Comentário para documentação
COMMENT ON TABLE public.company_profile IS 'Tabela para armazenar informações da empresa/clínica por filial';