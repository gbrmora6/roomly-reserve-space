# Solução para o Problema do Perfil da Empresa

## Problema Identificado
O erro ao tentar salvar/atualizar os dados do perfil da empresa tem duas causas principais:

1. **Falta de constraint única**: A tabela `company_profile` não possui uma constraint única na coluna `branch_id`, causando o erro:
   ```
   "there is no unique or exclusion constraint matching the ON CONFLICT specification" (código 42P10)
   ```

2. **Falta de políticas RLS**: A tabela não possui políticas de Row Level Security configuradas adequadamente.

## Sintomas
- ✅ Os dados são carregados corretamente
- ❌ Não é possível salvar/atualizar os dados
- ❌ Erro de permissão no console do navegador

## Soluções Implementadas

### Correção Temporária no Código
O código foi atualizado para contornar o problema da constraint única:
- Em vez de usar `upsert()` com `onConflict`, agora verifica se existe um registro
- Se existe, faz `update()`; se não existe, faz `insert()`
- Isso permite que a funcionalidade funcione mesmo sem a constraint única

### Correção Definitiva no Banco de Dados

#### Passo 1: Acessar o Supabase Dashboard
1. Acesse [https://supabase.com/dashboard](https://supabase.com/dashboard)
2. Faça login na sua conta
3. Selecione o projeto `roomly-reserve-space`

### Passo 2: Aplicar as Correções RLS
1. No dashboard, vá para **SQL Editor** (ícone de código no menu lateral)
2. Clique em **New Query**
3. Copie e cole o conteúdo do arquivo `fix_company_profile_manual.sql`
4. Execute cada comando **um por vez** (não execute tudo de uma vez)

### Passo 3: Verificar se Funcionou
1. Após aplicar as correções, volte para a aplicação
2. Acesse a página "Perfil da Empresa"
3. Tente editar e salvar os dados
4. Verifique se aparece a mensagem de sucesso

## O que as Correções Fazem

### 1. Habilita Row Level Security (RLS)
```sql
ALTER TABLE public.company_profile ENABLE ROW LEVEL SECURITY;
```

### 2. Cria Política de Visualização
Permite que usuários vejam apenas o perfil da empresa da sua filial:
```sql
CREATE POLICY "Users can view company profile of their branch" ON public.company_profile
FOR SELECT USING (
  branch_id IN (
    SELECT p.branch_id 
    FROM public.profiles p 
    WHERE p.id = auth.uid()
  )
);
```

### 3. Cria Política de Edição
Permite que apenas administradores editem o perfil da empresa da sua filial:
```sql
CREATE POLICY "Admins can manage company profile of their branch" ON public.company_profile
FOR ALL USING (
  EXISTS (
    SELECT 1 
    FROM public.profiles p 
    WHERE p.id = auth.uid() 
    AND p.role IN ('admin', 'super_admin')
    AND (
      p.branch_id = company_profile.branch_id 
      OR p.role = 'super_admin'
    )
  )
);
```

## Logs para Depuração
O código foi atualizado para mostrar logs detalhados no console do navegador:
- Informações da sessão do usuário
- Dados sendo enviados para o Supabase
- Erros detalhados do Supabase

## Verificação Final
Após aplicar as correções:
1. Abra o console do navegador (F12)
2. Vá para a aba "Console"
3. Tente salvar o perfil da empresa
4. Verifique se não há mais erros de permissão

## Contato
Se o problema persistir após aplicar essas correções, verifique:
1. Se o usuário tem o role correto (`admin` ou `super_admin`)
2. Se o usuário tem um `branch_id` válido no perfil
3. Se todas as políticas RLS foram aplicadas corretamente