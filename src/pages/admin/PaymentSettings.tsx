import React, { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { CreditCard, Save, Settings } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { useBranchFilter } from '@/hooks/useBranchFilter';
import { Separator } from '@/components/ui/separator';

interface PaymentSettingsData {
  id?: string;
  branch_id: string;
  boleto_enabled: boolean;
  boleto_due_days: number;
  pix_enabled: boolean;
  pix_expiration_minutes: number;
  credit_card_enabled: boolean;
  click2pay_enabled: boolean;
  click2pay_api_url: string | null;
}

const PaymentSettings: React.FC = () => {
  const [settings, setSettings] = useState<PaymentSettingsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { branchId } = useBranchFilter();

  useEffect(() => {
    if (branchId) {
      fetchSettings();
    } else {
      setLoading(false);
    }
  }, [branchId]);

  const fetchSettings = async () => {
    if (!branchId) {
      console.warn('Branch ID não disponível para buscar configurações de pagamento');
      setLoading(false);
      return;
    }
    
    setLoading(true);
    try {
      const { data, error } = await (supabase as any)
        .from('payment_settings')
        .select('*')
        .eq('branch_id', branchId)
        .single();

      if (error && error.code !== 'PGRST116') {
        toast({
          title: "Erro ao carregar configurações",
          description: error.message,
          variant: "destructive"
        });
      } else if (data) {
        setSettings(data as PaymentSettingsData);
      } else {
        // Create default settings if none exist
        setSettings({
          branch_id: branchId,
          boleto_enabled: true,
          boleto_due_days: 3,
          pix_enabled: true,
          pix_expiration_minutes: 30,
          credit_card_enabled: true,
          click2pay_enabled: false,
          click2pay_api_url: null,
        });
      }
    } catch (err) {
      console.error("Erro ao buscar configurações de pagamento:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field: keyof PaymentSettingsData, value: any) => {
    if (settings) {
      setSettings({ ...settings, [field]: value });
    }
  };

  const handleSave = async () => {
    if (!settings || !branchId) {
      toast({
        title: "Erro",
        description: "Branch ID não disponível. Verifique se você está logado corretamente.",
        variant: "destructive"
      });
      return;
    }
    setSaving(true);
    try {
      const { error } = await (supabase as any)
        .from('payment_settings')
        .upsert(settings, { onConflict: 'branch_id' });
        
      if (error) {
        toast({
          title: "Erro ao salvar",
          description: error.message,
          variant: "destructive"
        });
      } else {
        toast({
          title: "Sucesso!",
          description: "Configurações de pagamento atualizadas com sucesso."
        });
      }
    } catch (err) {
      console.error("Erro ao salvar configurações:", err);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-1/3" />
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-1/4" />
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {Array(8).fill(0).map((_, i) => (
                <div key={i} className="space-y-2">
                  <Skeleton className="h-4 w-1/4" />
                  <Skeleton className="h-10 w-full" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!branchId) {
    return (
      <div className="space-y-6">
        <Card className="shadow-lg rounded-2xl border-0 bg-white p-6 mb-8">
          <CardHeader>
            <CardTitle className="text-2xl font-bold flex items-center gap-2 text-gray-900">
              <CreditCard className="h-7 w-7 text-blue-700" /> Configurações de Pagamento
            </CardTitle>
            <CardDescription className="text-gray-500">
              Configure os meios de pagamento e suas opções
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8">
              <p className="text-gray-500 mb-4">
                Não foi possível carregar as configurações de pagamento.
              </p>
              <p className="text-sm text-gray-400">
                Verifique se você está logado corretamente e possui uma filial associada.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card className="shadow-lg rounded-2xl border-0 bg-white p-6 mb-8">
        <CardHeader>
          <CardTitle className="text-2xl font-bold flex items-center gap-2 text-gray-900">
            <CreditCard className="h-7 w-7 text-blue-700" /> Configurações de Pagamento
          </CardTitle>
          <CardDescription className="text-gray-500">
            Configure os meios de pagamento e suas opções
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form className="space-y-6" onSubmit={(e) => { e.preventDefault(); handleSave(); }}>
            
            {/* Boleto Settings */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Settings className="h-5 w-5 text-orange-600" />
                <h3 className="text-lg font-semibold text-gray-900">Configurações do Boleto</h3>
              </div>
              
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="boleto_enabled">Habilitar Boleto</Label>
                  <p className="text-sm text-gray-500">Permitir pagamentos via boleto bancário</p>
                </div>
                <Switch
                  id="boleto_enabled"
                  checked={settings?.boleto_enabled || false}
                  onCheckedChange={(checked) => handleChange('boleto_enabled', checked)}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="boleto_due_days">Dias para Vencimento do Boleto</Label>
                <Input
                  id="boleto_due_days"
                  type="number"
                  min="1"
                  max="30"
                  value={settings?.boleto_due_days || 3}
                  onChange={(e) => handleChange('boleto_due_days', parseInt(e.target.value))}
                  placeholder="Dias para vencimento"
                  disabled={!settings?.boleto_enabled}
                />
              </div>
            </div>

            <Separator />

            {/* Pix Settings */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Settings className="h-5 w-5 text-green-600" />
                <h3 className="text-lg font-semibold text-gray-900">Configurações do Pix</h3>
              </div>
              
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="pix_enabled">Habilitar Pix</Label>
                  <p className="text-sm text-gray-500">Permitir pagamentos via Pix</p>
                </div>
                <Switch
                  id="pix_enabled"
                  checked={settings?.pix_enabled || false}
                  onCheckedChange={(checked) => handleChange('pix_enabled', checked)}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="pix_expiration_minutes">Tempo de Expiração do Pix (minutos)</Label>
                <Input
                  id="pix_expiration_minutes"
                  type="number"
                  min="5"
                  max="1440"
                  value={settings?.pix_expiration_minutes || 30}
                  onChange={(e) => handleChange('pix_expiration_minutes', parseInt(e.target.value))}
                  placeholder="Minutos para expiração"
                  disabled={!settings?.pix_enabled}
                />
              </div>
            </div>

            <Separator />

            {/* Credit Card Settings */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Settings className="h-5 w-5 text-blue-600" />
                <h3 className="text-lg font-semibold text-gray-900">Configurações do Cartão de Crédito</h3>
              </div>
              
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="credit_card_enabled">Habilitar Cartão de Crédito</Label>
                  <p className="text-sm text-gray-500">Permitir pagamentos via cartão de crédito</p>
                </div>
                <Switch
                  id="credit_card_enabled"
                  checked={settings?.credit_card_enabled || false}
                  onCheckedChange={(checked) => handleChange('credit_card_enabled', checked)}
                />
              </div>
            </div>

            <Separator />

            {/* Click2Pay Integration Settings */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Settings className="h-5 w-5 text-purple-600" />
                <h3 className="text-lg font-semibold text-gray-900">Integração Click2Pay</h3>
              </div>
              
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="click2pay_enabled">Habilitar Click2Pay</Label>
                  <p className="text-sm text-gray-500">Ativar integração com o gateway Click2Pay</p>
                </div>
                <Switch
                  id="click2pay_enabled"
                  checked={settings?.click2pay_enabled || false}
                  onCheckedChange={(checked) => handleChange('click2pay_enabled', checked)}
                />
              </div>
              
              {settings?.click2pay_enabled && (
                <div className="space-y-4 pl-4 border-l-2 border-purple-200">
                  <div className="space-y-2">
                    <Label htmlFor="click2pay_api_url">URL da API Click2Pay</Label>
                    <Input
                      id="click2pay_api_url"
                      type="url"
                      value={settings?.click2pay_api_url || ''}
                      onChange={(e) => handleChange('click2pay_api_url', e.target.value)}
                      placeholder="https://api.click2pay.com.br"
                    />
                  </div>
                  
                  <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                    <p className="text-sm text-blue-700">
                      <strong>Nota:</strong> As credenciais de acesso (usuário e senha) são configuradas diretamente nos secrets do Supabase por questões de segurança.
                    </p>
                  </div>
                </div>
              )}
            </div>
            
            <Button 
              type="submit"
              className="mt-6 w-full md:w-auto"
              disabled={saving}
            >
              <Save className="mr-2 h-4 w-4" />
              {saving ? 'Salvando...' : 'Salvar Configurações'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default PaymentSettings;