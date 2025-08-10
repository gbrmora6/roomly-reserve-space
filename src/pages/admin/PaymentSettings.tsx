import React, { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
// import { Input } from '@/components/ui/input';
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
  boleto_visible: boolean;
  pix_visible: boolean;
  cartao_visible: boolean;
  dinheiro_visible: boolean;
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
          boleto_visible: true,
          pix_visible: true,
          cartao_visible: true,
          dinheiro_visible: true,
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
                  <Label htmlFor="boleto_visible">Exibir Boleto no checkout</Label>
                  <p className="text-sm text-gray-500">Controla se o boleto aparece como opção de pagamento</p>
                </div>
                <Switch
                  id="boleto_visible"
                  checked={settings?.boleto_visible ?? true}
                  onCheckedChange={(checked) => handleChange('boleto_visible', checked)}
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
                  <Label htmlFor="pix_visible">Exibir PIX no checkout</Label>
                  <p className="text-sm text-gray-500">Controla se o PIX aparece como opção de pagamento</p>
                </div>
                <Switch
                  id="pix_visible"
                  checked={settings?.pix_visible ?? true}
                  onCheckedChange={(checked) => handleChange('pix_visible', checked)}
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
                  <Label htmlFor="cartao_visible">Exibir Cartão no checkout</Label>
                  <p className="text-sm text-gray-500">Controla se o cartão aparece como opção de pagamento</p>
                </div>
                <Switch
                  id="cartao_visible"
                  checked={settings?.cartao_visible ?? true}
                  onCheckedChange={(checked) => handleChange('cartao_visible', checked)}
                />
              </div>
            </div>

            <Separator />

            {/* Cash Payment Visibility Settings */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Settings className="h-5 w-5 text-green-600" />
                <h3 className="text-lg font-semibold text-gray-900">Pagamento em Dinheiro (Admin)</h3>
              </div>
              
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="dinheiro_visible">Exibir Pagamento em Dinheiro</Label>
                  <p className="text-sm text-gray-500">Controla se o pagamento em dinheiro aparece para administradores</p>
                </div>
                <Switch
                  id="dinheiro_visible"
                  checked={settings?.dinheiro_visible ?? true}
                  onCheckedChange={(checked) => handleChange('dinheiro_visible', checked)}
                />
              </div>
              
              <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
                <p className="text-sm text-yellow-700">
                  <strong>Nota:</strong> O pagamento em dinheiro é uma funcionalidade exclusiva para administradores e permite confirmação manual de pagamentos.
                </p>
              </div>
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