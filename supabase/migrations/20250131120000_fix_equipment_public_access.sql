-- Correção para permitir que usuários não logados vejam equipamentos
-- Remove política conflitante que restringia acesso apenas a usuários autenticados

-- Remove a política que impedia usuários não logados de ver equipamentos ativos
DROP POLICY IF EXISTS "select_equipment_active" ON equipment;

-- A política "Anyone can view equipment" já existe e permite acesso público
-- Verificar políticas existentes:
-- SELECT policyname, roles, cmd, qual FROM pg_policies WHERE tablename = 'equipment' AND cmd = 'SELECT';

-- Resultado esperado:
-- 1. "Anyone can view equipment" - roles: {public}, qual: true
-- 2. "select_equipment_admin" - roles: {public}, qual: (is_admin() AND ...)

-- Esta migração garante que usuários não logados possam visualizar equipamentos
-- mantendo as permissões administrativas intactas.