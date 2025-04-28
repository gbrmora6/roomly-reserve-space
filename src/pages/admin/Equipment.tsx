
import React, { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Link } from "react-router-dom";
import { Plus, Pencil, Trash } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/contexts/AuthContext";

interface Equipment {
  id: string;
  name: string;
  description: string | null;
  quantity: number;
}

const AdminEquipment: React.FC = () => {
  const { refreshUserClaims } = useAuth();
  
  // Execute refresh claims on component mount
  useEffect(() => {
    console.log("AdminEquipment component mounted, refreshing user claims");
    const refreshClaims = async () => {
      await refreshUserClaims();
    };
    refreshClaims();
  }, [refreshUserClaims]);

  const { data: equipment, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["equipment"],
    queryFn: async () => {
      console.log("Fetching equipment data");
      const { data, error } = await supabase
        .from("equipment")
        .select("*")
        .order("name");
      
      if (error) {
        console.error("Error fetching equipment:", error);
        throw error;
      }
      
      console.log("Equipment data received:", data);
      return data as Equipment[];
    },
  });

  const handleDelete = async (id: string) => {
    if (!window.confirm("Tem certeza que deseja excluir este equipamento?")) return;
    
    try {
      const { error } = await supabase
        .from("equipment")
        .delete()
        .eq("id", id);
      
      if (error) throw error;
      
      toast({
        title: "Equipamento excluído com sucesso",
      });
      refetch();
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: "Erro ao excluir equipamento",
        description: err.message,
      });
    }
  };

  console.log("AdminEquipment render state:", { isLoading, isError, equipmentCount: equipment?.length });

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Gerenciar Equipamentos</h1>
        <Button asChild>
          <Link to="/admin/equipment/new">
            <Plus className="mr-2 h-4 w-4" /> Novo Equipamento
          </Link>
        </Button>
      </div>
      
      {isError ? (
        <div className="rounded-lg bg-destructive/10 p-6 text-center">
          <p className="text-destructive font-medium mb-2">Erro ao carregar equipamentos</p>
          <p className="text-sm text-muted-foreground mb-4">{(error as Error)?.message || "Ocorreu um erro desconhecido"}</p>
          <Button onClick={() => refetch()} variant="outline">Tentar novamente</Button>
        </div>
      ) : isLoading ? (
        <div className="space-y-3 py-4">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
      ) : (
        <div className="border rounded-md">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Descrição</TableHead>
                <TableHead>Quantidade</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {equipment && equipment.length > 0 ? (
                equipment.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium">{item.name}</TableCell>
                    <TableCell className="max-w-[300px] truncate">{item.description}</TableCell>
                    <TableCell>{item.quantity}</TableCell>
                    <TableCell className="text-right space-x-2">
                      <Button variant="ghost" size="icon" asChild>
                        <Link to={`/admin/equipment/${item.id}`}>
                          <Pencil className="h-4 w-4" />
                        </Link>
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="icon"
                        onClick={() => handleDelete(item.id)}
                      >
                        <Trash className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-4">
                    Nenhum equipamento cadastrado
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
};

export default AdminEquipment;
