import React, { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface Profile {
  id: string;
  name: string;
  street: string;
  number: string;
  neighborhood: string;
  city: string;
}

const CompanyProfile: React.FC = () => {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase
      .from<Profile>('company_profile')
      .select('*')
      .single()
      .then(({ data, error }) => {
        if (!error && data) setProfile(data);
        setLoading(false);
      });
  }, []);

  const handleSave = async () => {
    if (!profile) return;
    const { error } = await supabase
      .from('company_profile')
      .upsert(profile);
    if (error) alert('Erro: ' + error.message);
    else alert('Perfil salvo!');
  };

  if (loading) return <p>Carregando perfil...</p>;
  return (
    <div className="p-6 bg-white rounded shadow">
      <h2 className="text-xl mb-4">Perfil da Empresa</h2>
      <form className="space-y-3">
        {(['name','street','number','neighborhood','city'] as (keyof Profile)[]).map(f => (
          <div key={f}>
            <label className="block capitalize">{f.replace('_',' ')}</label>
            <input
              className="w-full border px-2 py-1"
              value={profile[f] || ''}
              onChange={e => setProfile({ ...profile, [f]: e.target.value })}
            />
          </div>
        ))}
        <button
          type="button"
          onClick={handleSave}
          className="mt-4 px-4 py-2 bg-red-600 text-white rounded"
        >Salvar</button>
      </form>
    </div>
  );
};

export default CompanyProfile;
