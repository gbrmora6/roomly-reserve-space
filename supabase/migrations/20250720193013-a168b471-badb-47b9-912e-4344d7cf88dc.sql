-- Create user permissions enums if they don't exist
DO $$ BEGIN
    CREATE TYPE resource_type AS ENUM ('rooms', 'equipment', 'products', 'users', 'settings');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE permission_type AS ENUM ('read', 'write', 'delete', 'admin');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create user_permissions table if it doesn't exist
CREATE TABLE IF NOT EXISTS user_permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    resource_type resource_type NOT NULL,
    permission_type permission_type NOT NULL,
    branch_id UUID NOT NULL,
    granted_by UUID,
    granted_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE,
    is_active BOOLEAN NOT NULL DEFAULT true,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Create security_audit table if it doesn't exist
CREATE TABLE IF NOT EXISTS security_audit (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_type TEXT NOT NULL,
    severity TEXT NOT NULL DEFAULT 'info',
    user_id UUID,
    user_email TEXT,
    user_role TEXT,
    target_user_id UUID,
    resource_type TEXT,
    resource_id UUID,
    action TEXT NOT NULL,
    details JSONB NOT NULL,
    ip_address INET,
    user_agent TEXT,
    session_id TEXT,
    request_id TEXT,
    branch_id UUID,
    risk_score INTEGER DEFAULT 0,
    requires_review BOOLEAN DEFAULT false,
    reviewed_by UUID,
    reviewed_at TIMESTAMP WITH TIME ZONE,
    review_notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Create equipment_schedules table if it doesn't exist
CREATE TABLE IF NOT EXISTS equipment_schedules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    equipment_id UUID NOT NULL,
    weekday weekday NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    branch_id UUID NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on user_permissions
ALTER TABLE user_permissions ENABLE ROW LEVEL SECURITY;

-- Enable RLS on security_audit
ALTER TABLE security_audit ENABLE ROW LEVEL SECURITY;

-- Enable RLS on equipment_schedules
ALTER TABLE equipment_schedules ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for user_permissions
DROP POLICY IF EXISTS "Admins can manage permissions" ON user_permissions;
CREATE POLICY "Admins can manage permissions" 
ON user_permissions FOR ALL 
USING (
    EXISTS (
        SELECT 1 FROM profiles p 
        WHERE p.id = auth.uid() 
        AND p.role IN ('admin', 'super_admin') 
        AND p.branch_id = user_permissions.branch_id
    )
);

DROP POLICY IF EXISTS "Users can view their own permissions" ON user_permissions;
CREATE POLICY "Users can view their own permissions" 
ON user_permissions FOR SELECT 
USING (user_id = auth.uid());

-- Create RLS policies for security_audit
DROP POLICY IF EXISTS "Admins can view security audit" ON security_audit;
CREATE POLICY "Admins can view security audit" 
ON security_audit FOR SELECT 
USING (
    EXISTS (
        SELECT 1 FROM profiles p 
        WHERE p.id = auth.uid() 
        AND p.role IN ('admin', 'super_admin') 
        AND (p.branch_id = security_audit.branch_id OR security_audit.branch_id IS NULL)
    )
);

-- Create RLS policies for equipment_schedules
DROP POLICY IF EXISTS "Anyone can view equipment schedules" ON equipment_schedules;
CREATE POLICY "Anyone can view equipment schedules" 
ON equipment_schedules FOR SELECT 
USING (true);

DROP POLICY IF EXISTS "Admins can manage equipment schedules" ON equipment_schedules;
CREATE POLICY "Admins can manage equipment schedules" 
ON equipment_schedules FOR ALL 
USING (
    EXISTS (
        SELECT 1 FROM profiles p 
        WHERE p.id = auth.uid() 
        AND p.role IN ('admin', 'super_admin') 
        AND p.branch_id = equipment_schedules.branch_id
    )
);

-- Add updated_at triggers
DROP TRIGGER IF EXISTS update_user_permissions_updated_at ON user_permissions;
CREATE TRIGGER update_user_permissions_updated_at
    BEFORE UPDATE ON user_permissions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_equipment_schedules_updated_at ON equipment_schedules;
CREATE TRIGGER update_equipment_schedules_updated_at
    BEFORE UPDATE ON equipment_schedules
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();