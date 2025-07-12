-- Sistema de permissões granular
CREATE TYPE public.permission_type AS ENUM (
  'read', 'write', 'delete', 'admin', 'super_admin'
);

CREATE TYPE public.resource_type AS ENUM (
  'rooms', 'equipment', 'bookings', 'clients', 'products', 
  'financial', 'reports', 'users', 'branches', 'coupons',
  'inventory', 'notifications', 'logs', 'backups'
);

-- Tabela de permissões
CREATE TABLE public.user_permissions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  resource_type resource_type NOT NULL,
  permission_type permission_type NOT NULL,
  granted_by UUID REFERENCES profiles(id),
  granted_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  branch_id UUID NOT NULL REFERENCES branches(id),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  UNIQUE(user_id, resource_type, permission_type, branch_id)
);

-- Tabela de histórico de alterações detalhado
CREATE TABLE public.change_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  table_name TEXT NOT NULL,
  record_id UUID NOT NULL,
  operation TEXT NOT NULL, -- INSERT, UPDATE, DELETE
  old_data JSONB,
  new_data JSONB,
  changed_fields TEXT[],
  user_id UUID REFERENCES profiles(id),
  user_email TEXT,
  user_role TEXT,
  ip_address INET,
  user_agent TEXT,
  branch_id UUID NOT NULL REFERENCES branches(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Tabela de backups automáticos
CREATE TABLE public.system_backups (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  backup_type TEXT NOT NULL, -- 'scheduled', 'manual', 'pre_migration'
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'running', 'completed', 'failed'
  backup_size BIGINT,
  file_path TEXT,
  file_url TEXT,
  tables_included TEXT[],
  compression_type TEXT DEFAULT 'gzip',
  branch_id UUID REFERENCES branches(id),
  initiated_by UUID REFERENCES profiles(id),
  started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  completed_at TIMESTAMP WITH TIME ZONE,
  error_message TEXT,
  backup_metadata JSONB,
  retention_until TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (now() + interval '30 days'),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Tabela de auditoria completa
CREATE TABLE public.security_audit (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  event_type TEXT NOT NULL, -- 'login', 'logout', 'permission_change', 'data_access', 'system_change'
  severity TEXT NOT NULL DEFAULT 'info', -- 'info', 'warning', 'critical'
  user_id UUID REFERENCES profiles(id),
  user_email TEXT,
  user_role TEXT,
  target_user_id UUID REFERENCES profiles(id),
  resource_type TEXT,
  resource_id UUID,
  action TEXT NOT NULL,
  details JSONB NOT NULL,
  ip_address INET,
  user_agent TEXT,
  session_id TEXT,
  request_id TEXT,
  branch_id UUID REFERENCES branches(id),
  risk_score INTEGER DEFAULT 0, -- 0-100
  requires_review BOOLEAN DEFAULT false,
  reviewed_by UUID REFERENCES profiles(id),
  reviewed_at TIMESTAMP WITH TIME ZONE,
  review_notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- RLS para user_permissions
ALTER TABLE public.user_permissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage permissions" ON public.user_permissions
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM profiles p 
    WHERE p.id = auth.uid() 
    AND p.role IN ('admin', 'super_admin')
    AND p.branch_id = user_permissions.branch_id
  )
);

CREATE POLICY "Users can view their own permissions" ON public.user_permissions
FOR SELECT USING (user_id = auth.uid());

-- RLS para change_history
ALTER TABLE public.change_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view change history" ON public.change_history
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM profiles p 
    WHERE p.id = auth.uid() 
    AND p.role IN ('admin', 'super_admin')
    AND p.branch_id = change_history.branch_id
  )
);

-- RLS para system_backups
ALTER TABLE public.system_backups ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Super admins can manage backups" ON public.system_backups
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM profiles p 
    WHERE p.id = auth.uid() 
    AND p.role = 'super_admin'
  )
);

-- RLS para security_audit
ALTER TABLE public.security_audit ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view security audit" ON public.security_audit
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM profiles p 
    WHERE p.id = auth.uid() 
    AND p.role IN ('admin', 'super_admin')
    AND (p.branch_id = security_audit.branch_id OR security_audit.branch_id IS NULL)
  )
);

-- Função para verificar permissões
CREATE OR REPLACE FUNCTION public.has_permission(
  p_user_id UUID,
  p_resource resource_type,
  p_permission permission_type,
  p_branch_id UUID DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  user_role TEXT;
  branch_id_to_check UUID;
BEGIN
  -- Obter role do usuário
  SELECT role, branch_id INTO user_role, branch_id_to_check
  FROM profiles 
  WHERE id = p_user_id;
  
  -- Super admin tem todas as permissões
  IF user_role = 'super_admin' THEN
    RETURN TRUE;
  END IF;
  
  -- Usar branch do usuário se não especificado
  IF p_branch_id IS NULL THEN
    p_branch_id := branch_id_to_check;
  END IF;
  
  -- Verificar permissão específica
  RETURN EXISTS (
    SELECT 1 FROM user_permissions up
    WHERE up.user_id = p_user_id
    AND up.resource_type = p_resource
    AND up.permission_type = p_permission
    AND up.branch_id = p_branch_id
    AND up.is_active = true
    AND (up.expires_at IS NULL OR up.expires_at > now())
  );
END;
$$;

-- Função para log de auditoria de segurança
CREATE OR REPLACE FUNCTION public.log_security_event(
  p_event_type TEXT,
  p_action TEXT,
  p_details JSONB,
  p_severity TEXT DEFAULT 'info',
  p_resource_type TEXT DEFAULT NULL,
  p_resource_id UUID DEFAULT NULL,
  p_risk_score INTEGER DEFAULT 0
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  audit_id UUID;
  current_user_id UUID;
  current_user_email TEXT;
  current_user_role TEXT;
  current_branch_id UUID;
BEGIN
  -- Obter dados do usuário atual
  current_user_id := auth.uid();
  
  IF current_user_id IS NOT NULL THEN
    SELECT email, role, branch_id 
    INTO current_user_email, current_user_role, current_branch_id
    FROM profiles 
    WHERE id = current_user_id;
  END IF;
  
  -- Inserir evento de auditoria
  INSERT INTO security_audit (
    event_type,
    severity,
    user_id,
    user_email,
    user_role,
    resource_type,
    resource_id,
    action,
    details,
    branch_id,
    risk_score,
    requires_review
  ) VALUES (
    p_event_type,
    p_severity,
    current_user_id,
    current_user_email,
    current_user_role,
    p_resource_type,
    p_resource_id,
    p_action,
    p_details,
    current_branch_id,
    p_risk_score,
    p_risk_score >= 70 -- Require review for high-risk events
  ) RETURNING id INTO audit_id;
  
  RETURN audit_id;
END;
$$;

-- Trigger para registrar alterações
CREATE OR REPLACE FUNCTION public.track_changes()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  changed_fields TEXT[];
  current_user_id UUID;
  current_user_email TEXT;
  current_user_role TEXT;
  current_branch_id UUID;
  old_data JSONB;
  new_data JSONB;
BEGIN
  -- Obter dados do usuário atual
  current_user_id := auth.uid();
  
  IF current_user_id IS NOT NULL THEN
    SELECT email, role, branch_id 
    INTO current_user_email, current_user_role, current_branch_id
    FROM profiles 
    WHERE id = current_user_id;
  END IF;
  
  -- Preparar dados
  IF TG_OP = 'DELETE' THEN
    old_data := to_jsonb(OLD);
    new_data := NULL;
  ELSIF TG_OP = 'INSERT' THEN
    old_data := NULL;
    new_data := to_jsonb(NEW);
  ELSE -- UPDATE
    old_data := to_jsonb(OLD);
    new_data := to_jsonb(NEW);
    
    -- Identificar campos alterados
    SELECT array_agg(key) INTO changed_fields
    FROM jsonb_each(old_data) o(key, value)
    WHERE o.value IS DISTINCT FROM (new_data->>key)::jsonb;
  END IF;
  
  -- Inserir registro de alteração
  INSERT INTO change_history (
    table_name,
    record_id,
    operation,
    old_data,
    new_data,
    changed_fields,
    user_id,
    user_email,
    user_role,
    branch_id
  ) VALUES (
    TG_TABLE_NAME,
    COALESCE(NEW.id, OLD.id),
    TG_OP,
    old_data,
    new_data,
    changed_fields,
    current_user_id,
    current_user_email,
    current_user_role,
    COALESCE(NEW.branch_id, OLD.branch_id, current_branch_id)
  );
  
  -- Log evento de segurança para operações sensíveis
  PERFORM log_security_event(
    'data_change',
    TG_OP || ' on ' || TG_TABLE_NAME,
    jsonb_build_object(
      'table', TG_TABLE_NAME,
      'record_id', COALESCE(NEW.id, OLD.id),
      'changed_fields', changed_fields
    ),
    CASE 
      WHEN TG_OP = 'DELETE' THEN 'warning'
      WHEN TG_TABLE_NAME IN ('profiles', 'user_permissions') THEN 'warning'
      ELSE 'info'
    END,
    TG_TABLE_NAME,
    COALESCE(NEW.id, OLD.id),
    CASE 
      WHEN TG_OP = 'DELETE' THEN 50
      WHEN TG_TABLE_NAME IN ('profiles', 'user_permissions') THEN 30
      ELSE 10
    END
  );
  
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Aplicar triggers em tabelas importantes
CREATE TRIGGER track_profiles_changes
  AFTER INSERT OR UPDATE OR DELETE ON profiles
  FOR EACH ROW EXECUTE FUNCTION track_changes();

CREATE TRIGGER track_bookings_changes
  AFTER INSERT OR UPDATE OR DELETE ON bookings
  FOR EACH ROW EXECUTE FUNCTION track_changes();

CREATE TRIGGER track_rooms_changes
  AFTER INSERT OR UPDATE OR DELETE ON rooms
  FOR EACH ROW EXECUTE FUNCTION track_changes();

CREATE TRIGGER track_equipment_changes
  AFTER INSERT OR UPDATE OR DELETE ON equipment
  FOR EACH ROW EXECUTE FUNCTION track_changes();

CREATE TRIGGER track_orders_changes
  AFTER INSERT OR UPDATE OR DELETE ON orders
  FOR EACH ROW EXECUTE FUNCTION track_changes();

-- Índices para performance
CREATE INDEX idx_user_permissions_user_resource ON user_permissions(user_id, resource_type, permission_type);
CREATE INDEX idx_change_history_table_record ON change_history(table_name, record_id);
CREATE INDEX idx_change_history_user_created ON change_history(user_id, created_at);
CREATE INDEX idx_security_audit_user_created ON security_audit(user_id, created_at);
CREATE INDEX idx_security_audit_severity_created ON security_audit(severity, created_at);
CREATE INDEX idx_security_audit_requires_review ON security_audit(requires_review) WHERE requires_review = true;