import React, { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import * as XLSX from 'xlsx';

interface Client {
  first_name: string;
  last_name: string;
  phone: string;
  email: string;
  crp: string;
  cpf: string | null;
  cnpj: string | null;
  specialty: string | null;
}

const isValidCRP = (crp: string) => /^[0-9]{7,9}$/.test(crp);

const Clients: React.FC = () => {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase
      .from<Client>('profiles')
      .select('first_name,last_name,phone,email,crp,cpf,cnpj,specialty')
      .then(({ data }) => {
        setClients(data || []); setLoading(false);
      });
  }, []);

  const exportExcel = () => {
    const ws = XLSX.utils.json_to_sheet(clients);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Clientes');
    XLSX.writeFile(wb, 'clientes.xlsx');
  };

  if (loading) return <p>Carregando clientes…</p>;
  return (
    <div className="p-6 bg-white rounded shadow">
      <h2 className="text-xl mb-4">Clientes</h2>
      <button
        className="mb-4 px-3 py-1 bg-black text-white rounded"
        onClick={exportExcel}
      >Exportar Excel</button>
      <table className="w-full table-auto">
        <thead>
          <tr>
            {['Nome','Sobrenome','Telefone','Email','CRP','CPF/CNPJ','Especialidade']
              .map(h => <th key={h}>{h}</th>)}
          </tr>
        </thead>
        <tbody>
          {clients.map((c,i) => (
            <tr key={i} className={!isValidCRP(c.crp) ? 'bg-red-100' : ''}>
              <td>{c.first_name}</td>
              <td>{c.last_name}</td>
              <td>{c.phone}</td>
              <td>{c.email}</td>
              <td>{c.crp}</td>
              <td>{c.cpf || c.cnpj}</td>
              <td>{c.specialty}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default Clients;
