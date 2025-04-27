
import React, { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import * as XLSX from 'xlsx';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

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
  const { toast } = useToast();

  useEffect(() => {
    supabase
      .from('profiles')
      .select('first_name,last_name,phone,crp,specialty,cpf,cnpj')
      .then(({ data, error }) => {
        if (error) {
          console.error("Error fetching clients:", error);
          toast({
            title: "Erro",
            description: "Não foi possível carregar os clientes.",
            variant: "destructive",
          });
          return;
        }
        
        const clientsWithDefaults = data ? data.map(client => ({
          first_name: client.first_name || '',
          last_name: client.last_name || '',
          phone: client.phone || '',
          email: '', // Add empty email since it's not in the profiles table
          crp: client.crp || '',
          cpf: client.cpf,
          cnpj: client.cnpj,
          specialty: client.specialty
        })) : [];
        
        setClients(clientsWithDefaults);
        setLoading(false);
      });
  }, []);

  const exportExcel = () => {
    const ws = XLSX.utils.json_to_sheet(clients);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Clientes');
    XLSX.writeFile(wb, 'clientes.xlsx');
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
                <TableHead>CRP</TableHead>
                <TableHead>CPF/CNPJ</TableHead>
                <TableHead>Especialidade</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {clients.map((client, index) => (
                <TableRow 
                  key={index}
                  className={!isValidCRP(client.crp) ? 'bg-destructive/10' : ''}
                >
                  <TableCell>{client.first_name}</TableCell>
                  <TableCell>{client.last_name}</TableCell>
                  <TableCell>{client.phone}</TableCell>
                  <TableCell>{client.crp}</TableCell>
                  <TableCell>{client.cpf || client.cnpj || '-'}</TableCell>
                  <TableCell>{client.specialty || '-'}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
};

export default Clients;
