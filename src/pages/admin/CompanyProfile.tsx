import React, { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Building, Save } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { useBranchFilter } from '@/hooks/useBranchFilter';

interface CompanyProfileData {
  id: string;
  name: string;
  street: string | null;
  number: string | null;
  neighborhood: string | null;
  city: string | null;
}

const CompanyProfile: React.FC = () => {
  const [profile, setProfile] = useState<CompanyProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { branchId } = useBranchFilter();

  useEffect(() => {
    console.log('CompanyProfile useEffect - branchId:', branchId);
    if (branchId) {
      fetchProfileData();
    } else {
      console.log('Nenhum branchId encontrado');
      setLoading(false);
    }
  }, [branchId]);

  const fetchProfileData = async () => {
    setLoading(true);
    try {
      console.log('Buscando perfil da empresa para branch_id:', branchId);
      const { data, error } = await supabase
        .from('branches')
        .select('*')
        .eq('id', branchId)
        .maybeSingle();
      
      console.log('Resultado da busca:', { data, error });
      
      if (error) {
        console.error('Erro ao buscar perfil da empresa:', error);
        toast({
          title: "Erro ao carregar dados",
          description: error.message,
          variant: "destructive"
        });
      } else {
        setProfile(data as CompanyProfileData);
      }
    } catch (err) {
      console.error('Erro inesperado:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    if (profile) {
      setProfile({ ...profile, [name]: value });
    }
  };

  const handleSave = async () => {
    if (!profile || !branchId) {
      console.log('Dados insuficientes para salvar:', { profile, branchId });
      return;
    }
    setSaving(true);
    try {
      // Log da sessão atual
      const { data: { session } } = await supabase.auth.getSession();
      console.log('Sessão atual:', {
        user: session?.user?.id,
        email: session?.user?.email,
        role: session?.user?.role,
        aud: session?.user?.aud
      });
      
      const upsertData = { ...profile, branch_id: branchId };
      console.log('Tentando salvar dados:', upsertData);
      
      // Para agora, vamos usar a tabela branches existente
      const { data: existingData } = await supabase
        .from('branches')
        .select('id')
        .eq('id', branchId)
        .single();
      
      let data, error;
      
      if (existingData) {
        // Atualizar registro existente na tabela branches
        const updateResult = await supabase
          .from('branches')
          .update(upsertData)
          .eq('id', branchId)
          .select();
        data = updateResult.data;
        error = updateResult.error;
      } else {
        // Inserir novo registro na tabela branches
        const insertResult = await supabase
          .from('branches')
          .insert({ ...upsertData, id: branchId })
          .select();
        data = insertResult.data;
        error = insertResult.error;
      }
      
      console.log('Resultado do upsert:', { data, error });
      
      if (error) {
        console.error('Erro detalhado do Supabase:', {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code
        });
        toast({
          title: "Erro ao salvar",
          description: `${error.message} ${error.details ? '- ' + error.details : ''}`,
          variant: "destructive"
        });
      } else {
        console.log('Dados salvos com sucesso:', data);
        toast({
          title: "Sucesso!",
          description: "Perfil da empresa atualizado com sucesso."
        });
      }
    } catch (err) {
      console.error("Erro ao salvar perfil da empresa:", err);
      toast({
        title: "Erro",
        description: "Ocorreu um erro ao salvar o perfil da empresa.",
        variant: "destructive"
      });
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
              {Array(5).fill(0).map((_, i) => (
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
              <Building className="h-7 w-7 text-blue-700" /> Perfil da Empresa
            </CardTitle>
            <CardDescription className="text-gray-500">Gerencie as informações da empresa</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8">
              <p className="text-gray-500 mb-4">Nenhuma filial encontrada para este usuário.</p>
              <p className="text-sm text-gray-400">Entre em contato com o administrador do sistema para configurar sua filial.</p>
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
            <Building className="h-7 w-7 text-blue-700" /> Perfil da Empresa
          </CardTitle>
          <CardDescription className="text-gray-500">Gerencie as informações da empresa</CardDescription>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); handleSave(); }}>
            <div className="space-y-2">
              <Label htmlFor="name">Nome da Empresa</Label>
              <Input
                id="name"
                name="name"
                value={profile?.name || ''}
                onChange={handleChange}
                placeholder="Nome da empresa"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="street">Endereço</Label>
              <Input
                id="street"
                name="street"
                value={profile?.street || ''}
                onChange={handleChange}
                placeholder="Rua, Avenida, etc."
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="number">Número</Label>
                <Input
                  id="number"
                  name="number"
                  value={profile?.number || ''}
                  onChange={handleChange}
                  placeholder="Número"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="neighborhood">Bairro</Label>
                <Input
                  id="neighborhood"
                  name="neighborhood"
                  value={profile?.neighborhood || ''}
                  onChange={handleChange}
                  placeholder="Bairro"
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="city">Cidade</Label>
              <Input
                id="city"
                name="city"
                value={profile?.city || ''}
                onChange={handleChange}
                placeholder="Cidade"
              />
            </div>
            
            <Button 
              type="submit"
              className="mt-6 w-full md:w-auto"
              disabled={saving}
            >
              <Save className="mr-2 h-4 w-4" />
              {saving ? 'Salvando...' : 'Salvar Alterações'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default CompanyProfile;
