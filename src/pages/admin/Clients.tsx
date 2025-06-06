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
  phone: string;
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
        console.log("Fetching client profiles...");
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
        
        console.log(`Fetched ${profiles?.length || 0} client profiles`);
        
        // Processar os perfis que foram retornados com sucesso
        const clientsData = profiles ? profiles.map(profile => {
          return {
            id: profile.id,
            first_name: profile.first_name || '',
            last_name: profile.last_name || '',
            phone: profile.phone || '',
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
        <CardTitle className="text-2xl font-bold flex items-center gap-2 text-gray-900">
          <Users className="h-7 w-7 text-yellow-700" /> Clientes
        </CardTitle>
        <CardDescription className="text-gray-500">Veja todos os clientes cadastrados</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Sobrenome</TableHead>
                <TableHead>Telefone</TableHead>
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
                    <TableCell>{client.crp}</TableCell>
                    <TableCell>{client.cpf || client.cnpj || '-'}</TableCell>
                    <TableCell>{client.specialty || '-'}</TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-6">
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
