
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

type AuthUser = {
  id: string;
  email: string;
};

const isValidCRP = (crp: string) => /^[0-9]{7,9}$/.test(crp);

const Clients: React.FC = () => {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    const fetchClients = async () => {
      try {
        // Busca os perfis primeiro
        const { data: profiles, error: profilesError } = await supabase
          .from('profiles')
          .select('id,first_name,last_name,phone,crp,specialty,cpf,cnpj');
        
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

        // Tenta buscar os emails dos usuários através da API de admin do auth
        let userEmails: Map<string, string> = new Map();
        try {
          // Essa chamada pode falhar se o usuário não tiver permissões de admin
          const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers();
          
          if (!authError && authUsers?.users) {
            authUsers.users.forEach((user: AuthUser) => {
              if (user && user.id && user.email) {
                userEmails.set(user.id, user.email);
              }
            });
          } else {
            console.log("Não foi possível acessar os dados de autenticação, emails podem estar ausentes");
          }
        } catch (authErr) {
          console.log("Erro ao acessar dados de autenticação:", authErr);
        }
        
        // Combinar os dados dos perfis com os e-mails
        const clientsData = profiles ? profiles.map(profile => {
          return {
            id: profile.id,
            first_name: profile.first_name || '',
            last_name: profile.last_name || '',
            phone: profile.phone || '',
            email: userEmails.get(profile.id) || '',
            crp: profile.crp || '',
            cpf: profile.cpf,
            cnpj: profile.cnpj,
            specialty: profile.specialty
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
