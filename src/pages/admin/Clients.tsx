import React, { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import * as XLSX from 'xlsx';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Download, Users } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Client {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  crp: string;
  cpf: string | null;
  cnpj: string | null;
  specialty: string | null;
  cep: string | null;
  street: string | null;
  house_number: string | null;
  neighborhood: string | null;
  city: string | null;
  state: string | null;
  role: string | null;
  created_at: string;
}

const isValidCRP = (crp: string) => /^[0-9]{7,9}$/.test(crp);

const Clients: React.FC = () => {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    const fetchClients = async () => {
      try {
        console.log("Fetching client profiles...");
        // Busca apenas os perfis com role de client
        const { data: profiles, error: profilesError } = await supabase
          .from('profiles')
          .select('id,first_name,last_name,email,phone,crp,specialty,cpf,cnpj,cep,street,house_number,neighborhood,city,state,role,created_at')
          .eq('role', 'client');
        
        if (profilesError) {
          console.error("Error fetching profiles:", profilesError);
          toast({
            title: "Erro",
            description: "Não foi possível carregar os perfis dos clientes.",
            variant: "destructive",
          });
          setLoading(false);
          return;
        }
        
        console.log(`Fetched ${profiles?.length || 0} client profiles`);
        
        // Processar os perfis que foram retornados com sucesso
        const clientsData = profiles ? profiles.map(profile => {
          return {
            id: profile.id,
            first_name: profile.first_name || '',
            last_name: profile.last_name || '',
            email: profile.email || '',
            phone: profile.phone || '',
            crp: profile.crp || '',
            cpf: profile.cpf,
            cnpj: profile.cnpj,
            specialty: profile.specialty,
            cep: profile.cep,
            street: profile.street,
            house_number: profile.house_number,
            neighborhood: profile.neighborhood,
            city: profile.city,
            state: profile.state,
            role: profile.role,
            created_at: profile.created_at
          };
        }) : [];
        
        setClients(clientsData);
      } catch (error) {
        console.error("Error in fetchClients:", error);
        toast({
          title: "Erro",
          description: "Ocorreu um erro ao buscar os dados dos clientes.",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };
    
    fetchClients();
  }, [toast]);

  const exportExcel = () => {
    if (!clients.length) {
      toast({
        title: "Sem dados",
        description: "Não há clientes para exportar.",
        variant: "destructive",
      });
      return;
    }
    
    try {
      // Formatar os dados para o Excel com nomes de colunas mais amigáveis
      const exportData = clients.map(client => ({
        'ID': client.id,
        'Nome': client.first_name,
        'Sobrenome': client.last_name,
        'Email': client.email,
        'Telefone': client.phone,
        'CRP': client.crp,
        'CPF': client.cpf || '',
        'CNPJ': client.cnpj || '',
        'Especialidade': client.specialty || '',
        'CEP': client.cep || '',
        'Rua': client.street || '',
        'Número': client.house_number || '',
        'Bairro': client.neighborhood || '',
        'Cidade': client.city || '',
        'Estado': client.state || '',
        'Perfil': client.role || '',
        'Data de Cadastro': client.created_at ? new Date(client.created_at).toLocaleDateString('pt-BR') : ''
      }));

      const ws = XLSX.utils.json_to_sheet(exportData);
      
      // Configurar largura das colunas
      const colWidths = [
        { wch: 40 }, // ID
        { wch: 20 }, // Nome
        { wch: 20 }, // Sobrenome
        { wch: 30 }, // Email
        { wch: 15 }, // Telefone
        { wch: 12 }, // CRP
        { wch: 15 }, // CPF
        { wch: 18 }, // CNPJ
        { wch: 25 }, // Especialidade
        { wch: 10 }, // CEP
        { wch: 30 }, // Rua
        { wch: 10 }, // Número
        { wch: 20 }, // Bairro
        { wch: 20 }, // Cidade
        { wch: 10 }, // Estado
        { wch: 15 }, // Perfil
        { wch: 15 }  // Data de Cadastro
      ];
      ws['!cols'] = colWidths;

      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Clientes');
      
      // Gerar nome do arquivo com data atual
      const today = new Date().toLocaleDateString('pt-BR').replace(/\//g, '-');
      XLSX.writeFile(wb, `clientes-${today}.xlsx`);
      
      toast({
        title: "Sucesso",
        description: "Lista de clientes exportada com sucesso.",
      });
    } catch (error) {
      console.error("Error exporting to Excel:", error);
      toast({
        title: "Erro",
        description: "Não foi possível exportar os dados para Excel.",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <Card className="shadow-lg rounded-2xl border-0 bg-white p-6 mb-8">
        <CardHeader>
          <CardTitle className="text-2xl font-bold flex items-center gap-2 text-gray-900">
            <Users className="h-7 w-7 text-yellow-700" /> Clientes
          </CardTitle>
          <CardDescription className="text-gray-500">Veja todos os clientes cadastrados</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-32">
            <p className="text-muted-foreground">Carregando clientes...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-lg rounded-2xl border-0 bg-white p-6 mb-8">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-2xl font-bold flex items-center gap-2 text-gray-900">
              <Users className="h-7 w-7 text-yellow-700" /> Clientes
            </CardTitle>
            <CardDescription className="text-gray-500">Veja todos os clientes cadastrados</CardDescription>
          </div>
          <Button 
            onClick={exportExcel}
            variant="outline"
            className="flex items-center gap-2"
          >
            <Download className="h-4 w-4" />
            Exportar Excel
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Telefone</TableHead>
                <TableHead>CRP</TableHead>
                <TableHead>CPF/CNPJ</TableHead>
                <TableHead>Cidade</TableHead>
                <TableHead>Especialidade</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {clients.length > 0 ? (
                clients.map((client, index) => (
                  <TableRow 
                    key={client.id || index}
                    className={client.crp && !isValidCRP(client.crp) ? 'bg-destructive/10' : ''}
                  >
                    <TableCell>{client.first_name} {client.last_name}</TableCell>
                    <TableCell>{client.email}</TableCell>
                    <TableCell>{client.phone}</TableCell>
                    <TableCell>{client.crp}</TableCell>
                    <TableCell>{client.cpf || client.cnpj || '-'}</TableCell>
                    <TableCell>{client.city || '-'}</TableCell>
                    <TableCell>{client.specialty || '-'}</TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-6">
                    Nenhum cliente encontrado
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
};

export default Clients;
