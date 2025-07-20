-- Migração para adicionar campos de endereço à tabela branches e remover company_profile

-- 1. Adicionar campos de endereço à tabela branches
ALTER TABLE public.branches ADD COLUMN IF NOT EXISTS street TEXT;
ALTER TABLE public.branches ADD COLUMN IF NOT EXISTS number TEXT;
ALTER TABLE public.branches ADD COLUMN IF NOT EXISTS neighborhood TEXT;
ALTER TABLE public.branches ADD COLUMN IF NOT EXISTS complement TEXT;
ALTER TABLE public.branches ADD COLUMN IF NOT EXISTS zip_code TEXT;
ALTER TABLE public.branches ADD COLUMN IF NOT EXISTS state TEXT;
ALTER TABLE public.branches ADD COLUMN IF NOT EXISTS phone TEXT;

-- 2. Migrar dados existentes da company_profile para branches (se existirem)
DO $$
BEGIN
  -- Verificar se a tabela company_profile existe
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'company_profile' AND table_schema = 'public') THEN
    -- Migrar dados da company_profile para branches
    UPDATE public.branches 
    SET 
      street = cp.street,
      number = cp.number,
      neighborhood = cp.neighborhood
    FROM public.company_profile cp
    WHERE branches.id = cp.branch_id;
    
    -- Remover políticas RLS da company_profile
    DROP POLICY IF EXISTS "Users can view company profile of their branch" ON public.company_profile;
    DROP POLICY IF EXISTS "Admins can update company profile of their branch" ON public.company_profile;
    DROP POLICY IF EXISTS "Admins can insert company profile" ON public.company_profile;
    
    -- Remover a tabela company_profile
    DROP TABLE IF EXISTS public.company_profile CASCADE;
  END IF;
END $$;

-- 3. Criar políticas RLS para os novos campos na tabela branches
-- As políticas existentes da tabela branches já cobrem os novos campos

-- 4. Comentários para documentação
COMMENT ON COLUMN public.branches.street IS 'Endereço - Rua da filial';
COMMENT ON COLUMN public.branches.number IS 'Endereço - Número da filial';
COMMENT ON COLUMN public.branches.neighborhood IS 'Endereço - Bairro da filial';
COMMENT ON COLUMN public.branches.complement IS 'Endereço - Complemento da filial';
COMMENT ON COLUMN public.branches.zip_code IS 'Endereço - CEP da filial';
COMMENT ON COLUMN public.branches.state IS 'Endereço - Estado da filial';
COMMENT ON COLUMN public.branches.phone IS 'Telefone de contato da filial';

-- 5. Atualizar a função de auditoria para incluir os novos campos
-- (A função de auditoria existente já captura mudanças em todas as colunas)

COMMENT ON TABLE public.branches IS 'Tabela de filiais com informações completas incluindo endereço';