
import React, { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import * as XLSX from 'xlsx';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Client {
  id: string;
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
  const { toast } = useToast();

  useEffect(() => {
    const fetchClients = async () => {
      try {
        // Busca os usuários da autenticação para obter os emails
        const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers();
        
        if (authError) {
          console.error("Error fetching auth users:", authError);
          // Tenta buscar apenas os perfis se não conseguir acessar usuários de autenticação
          const { data: profilesOnly, error: profilesError } = await supabase
            .from('profiles')
            .select('id,first_name,last_name,phone,crp,specialty,cpf,cnpj');
            
          if (profilesError) {
            console.error("Error fetching profiles:", profilesError);
            toast({
              title: "Erro",
              description: "Não foi possível carregar os clientes.",
              variant: "destructive",
            });
            setLoading(false);
            return;
          }
          
          const clientsData = profilesOnly ? profilesOnly.map(profile => ({
            id: profile.id,
            first_name: profile.first_name || '',
            last_name: profile.last_name || '',
            phone: profile.phone || '',
            email: '', // Email não disponível sem acesso à autenticação
            crp: profile.crp || '',
            cpf: profile.cpf,
            cnpj: profile.cnpj,
            specialty: profile.specialty
          })) : [];
          
          setClients(clientsData);
          setLoading(false);
          return;
        }
        
        // Se tiver acesso aos usuários de autenticação, busca os perfis
        const { data: profiles, error } = await supabase
          .from('profiles')
          .select('id,first_name,last_name,phone,crp,specialty,cpf,cnpj');
        
        if (error) {
          console.error("Error fetching profiles:", error);
          toast({
            title: "Erro",
            description: "Não foi possível carregar os clientes.",
            variant: "destructive",
          });
          setLoading(false);
          return;
        }
        
        // Mapeia os emails dos usuários para os perfis
        const userEmails = new Map();
        if (authUsers?.users) {
          authUsers.users.forEach(user => {
            userEmails.set(user.id, user.email);
          });
        }
        
        // Combina os dados dos perfis com os emails
        const clientsWithData = profiles ? profiles.map(profile => ({
          id: profile.id,
          first_name: profile.first_name || '',
          last_name: profile.last_name || '',
          phone: profile.phone || '',
          email: userEmails.get(profile.id) || '',
          crp: profile.crp || '',
          cpf: profile.cpf,
          cnpj: profile.cnpj,
          specialty: profile.specialty
        })) : [];
        
        setClients(clientsWithData);
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
      const ws = XLSX.utils.json_to_sheet(clients);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Clientes');
      XLSX.writeFile(wb, 'clientes.xlsx');
      
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
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-center h-32">
            <p className="text-muted-foreground">Carregando clientes...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <CardTitle className="text-2xl font-bold">Clientes</CardTitle>
        <Button
          onClick={exportExcel}
          variant="outline"
          className="flex items-center gap-2"
          disabled={clients.length === 0}
        >
          <Download className="h-4 w-4" />
          Exportar Excel
        </Button>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Sobrenome</TableHead>
                <TableHead>Telefone</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>CRP</TableHead>
                <TableHead>CPF/CNPJ</TableHead>
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
                    <TableCell>{client.first_name}</TableCell>
                    <TableCell>{client.last_name}</TableCell>
                    <TableCell>{client.phone}</TableCell>
                    <TableCell>{client.email}</TableCell>
                    <TableCell>{client.crp}</TableCell>
                    <TableCell>{client.cpf || client.cnpj || '-'}</TableCell>
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
