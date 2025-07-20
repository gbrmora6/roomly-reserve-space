# Solução: Equipamentos não aparecendo para usuários não logados

## Problema Identificado

Os equipamentos não estavam sendo exibidos para usuários não logados na página `/equipment`.

## Causa Raiz

Existia uma política RLS conflitante na tabela `equipment` chamada `select_equipment_active` que restringia o acesso apenas a usuários autenticados (`{authenticated}`), mesmo havendo uma política `Anyone can view equipment` que deveria permitir acesso público.

### Políticas Conflitantes

1. **"Anyone can view equipment"** - Permitia acesso público (`roles: {public}`, `qual: true`)
2. **"select_equipment_active"** - Restringia apenas a usuários autenticados (`roles: {authenticated}`, `qual: is_active`)

Quando múltiplas políticas existem, o PostgreSQL aplica a lógica OR entre elas, mas a política mais restritiva pode prevalecer em alguns casos.

## Solução Aplicada

### 1. Remoção da Política Conflitante

```sql
DROP POLICY IF EXISTS "select_equipment_active" ON equipment;
```

### 2. Políticas Resultantes

Após a correção, restaram apenas as políticas necessárias:

- **"Anyone can view equipment"** - Permite acesso público para visualização
- **"select_equipment_admin"** - Permite administradores verem equipamentos de sua filial
- Outras políticas administrativas para INSERT, UPDATE, DELETE

## Verificação da Correção

### Testar Acesso Público

1. Abra o navegador em modo anônimo/privado
2. Acesse `http://localhost:8081/equipment`
3. Verifique se os equipamentos são exibidos

### Consulta SQL para Verificar Políticas

```sql
SELECT policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE tablename = 'equipment' AND cmd = 'SELECT';
```

## Arquivos Relacionados

- **Hook de dados**: `src/hooks/useFilteredEquipment.ts`
- **Página de equipamentos**: `src/pages/equipment/EquipmentList.tsx`
- **Migração aplicada**: `supabase/migrations/20250131120000_fix_equipment_public_access.sql`

## Impacto

✅ **Positivo**: Usuários não logados podem visualizar equipamentos
✅ **Segurança mantida**: Apenas visualização é permitida; reservas ainda requerem login
✅ **Administração preservada**: Políticas administrativas permanecem intactas

## Notas Importantes

- A política `Anyone can view equipment photos` já estava configurada corretamente
- O sistema de reservas continua exigindo autenticação
- Administradores mantêm todas as permissões de gerenciamento