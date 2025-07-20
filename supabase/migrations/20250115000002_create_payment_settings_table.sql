-- Create payment_settings table
CREATE TABLE IF NOT EXISTS payment_settings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  branch_id UUID NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
  
  -- Boleto settings
  boleto_enabled BOOLEAN DEFAULT true,
  boleto_due_days INTEGER DEFAULT 3 CHECK (boleto_due_days > 0),
  
  -- Pix settings
  pix_enabled BOOLEAN DEFAULT true,
  pix_expiration_minutes INTEGER DEFAULT 30 CHECK (pix_expiration_minutes > 0),
  
  -- Credit card settings
  credit_card_enabled BOOLEAN DEFAULT true,
  
  -- Click2Pay integration settings
  click2pay_enabled BOOLEAN DEFAULT false,
  click2pay_api_url TEXT,
  click2pay_username TEXT,
  click2pay_password TEXT,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Ensure one record per branch
  UNIQUE(branch_id)
);

-- Create RLS policies
ALTER TABLE payment_settings ENABLE ROW LEVEL SECURITY;

-- Policy for authenticated users to read payment settings
CREATE POLICY "Users can view payment settings for their branch" ON payment_settings
  FOR SELECT USING (
    auth.uid() IN (
      SELECT id FROM profiles 
      WHERE branch_id = payment_settings.branch_id
    )
  );

-- Policy for admin users to manage payment settings
CREATE POLICY "Admins can manage payment settings" ON payment_settings
  FOR ALL USING (
    auth.uid() IN (
      SELECT id FROM profiles 
      WHERE branch_id = payment_settings.branch_id 
      AND role IN ('admin', 'super_admin')
    )
  );

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_payment_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for updated_at
CREATE TRIGGER update_payment_settings_updated_at_trigger
  BEFORE UPDATE ON payment_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_payment_settings_updated_at();

-- Insert default settings for existing branches
INSERT INTO payment_settings (branch_id, boleto_enabled, pix_enabled, credit_card_enabled)
SELECT id, true, true, true
FROM branches
ON CONFLICT (branch_id) DO NOTHING;