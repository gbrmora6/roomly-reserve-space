
import React, { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Building, Save } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';

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

  useEffect(() => {
    fetchProfileData();
  }, []);

  const fetchProfileData = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('company_profile')
        .select('*')
        .single();

      if (error) {
        toast({
          title: "Erro ao carregar dados",
          description: error.message,
          variant: "destructive"
        });
      } else if (data) {
        setProfile(data as CompanyProfileData);
      }
    } catch (err) {
      console.error("Erro ao buscar perfil da empresa:", err);
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
    if (!profile) return;
    
    setSaving(true);
    try {
      const { error } = await supabase
        .from('company_profile')
        .upsert(profile);
        
      if (error) {
        toast({
          title: "Erro ao salvar",
          description: error.message,
          variant: "destructive"
        });
      } else {
        toast({
          title: "Sucesso!",
          description: "Perfil da empresa atualizado com sucesso."
        });
      }
    } catch (err) {
      console.error("Erro ao salvar perfil da empresa:", err);
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

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Perfil da Empresa</h1>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Building className="mr-2 h-5 w-5" />
            Informações da Empresa
          </CardTitle>
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
