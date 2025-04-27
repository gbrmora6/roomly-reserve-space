
// src/components/admin/CompanyProfile.tsx
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

export const CompanyProfile: React.FC = () => {
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
    await supabase
      .from('company_profile')
      .upsert(profile)
      .then(() => alert('Perfil salvo!'));
  };

  if (loading) return <p>Carregando...</p>;
  return (
    <div className="p-6 bg-white rounded shadow">
      <h2 className="text-xl mb-4">Perfil da Empresa</h2>
      {profile && (
        <form className="space-y-3">
          {(['name','street','number','neighborhood','city'] as (keyof Profile)[]).map((field) => (
            <div key={field}>
              <label className="block capitalize">{field.replace('_',' ')}</label>
              <input
                className="w-full border px-2 py-1"
                value={profile[field] || ''}
                onChange={e => setProfile({...profile, [field]: e.target.value})}
              />
            </div>
          ))}
          <button
            type="button"
            onClick={handleSave}
            className="mt-4 px-4 py-2 bg-red-600 text-white rounded"
          >
            Salvar
          </button>
        </form>
      )}
    </div>
  );
};
