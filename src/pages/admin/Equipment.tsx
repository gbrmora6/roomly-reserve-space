import React, { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Link } from "react-router-dom";
import { Plus, Pencil, Trash, PowerOff, Power } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/contexts/AuthContext";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Mic } from "lucide-react";
import { useBranchFilter } from "@/hooks/useBranchFilter";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface Equipment {
  id: string;
  name: string;
  description: string | null;
  quantity: number;
  is_active: boolean;
}

const AdminEquipment: React.FC = () => {
  const { refreshUserClaims } = useAuth();
  const { branchId, setBranchId, branches, isSuperAdmin } = useBranchFilter();
  
  // Execute refresh claims on component mount
  useEffect(() => {
    console.log("AdminEquipment component mounted, refreshing user claims");
    const refreshClaims = async () => {
      await refreshUserClaims();
    };
    refreshClaims();
  }, [refreshUserClaims]);

  const { data: equipment, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["equipment", branchId],
    queryFn: async () => {
      if (!branchId) return [];
      console.log("Fetching equipment data");
      const { data, error } = await supabase
        .from("equipment")
        .select("*")
        .eq("branch_id", branchId)
        .order("name");
      
      if (error) {
        console.error("Error fetching equipment:", error);
        throw error;
      }
      
      console.log("Equipment data received:", data);
      return data as Equipment[];
    },
    enabled: !!branchId
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

  const toggleEquipmentStatus = async (id: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from("equipment")
        .update({ is_active: !currentStatus })
        .eq("id", id);
      
      if (error) throw error;
      
      toast({
        title: currentStatus ? "Equipamento desativado com sucesso" : "Equipamento ativado com sucesso",
      });
      refetch();
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: "Erro ao atualizar status do equipamento",
        description: err.message,
      });
    }
  };

  console.log("AdminEquipment render state:", { isLoading, isError, equipmentCount: equipment?.length });

  return (
    <div className="space-y-6">
      <Card className="shadow-lg rounded-2xl border-0 bg-white p-6 mb-8">
        <CardHeader>
          <CardTitle className="text-2xl font-bold flex items-center gap-2 text-gray-900">
            <Mic className="h-7 w-7 text-green-700" /> Equipamentos
          </CardTitle>
          <CardDescription className="text-gray-500">Gerencie todos os equipamentos cadastrados</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex justify-between items-center">
            <h1 className="text-3xl font-bold">Gerenciar Equipamentos</h1>
            <Button asChild>
              <Link to="/admin/equipment/new">
                <Plus className="mr-2 h-4 w-4" /> Novo Equipamento
              </Link>
            </Button>
          </div>
          
          {isSuperAdmin && branches && (
            <div className="mb-4 max-w-xs">
              <Select value={branchId || undefined} onValueChange={setBranchId!}>
                <SelectTrigger>
                  <SelectValue placeholder="Filial" />
                </SelectTrigger>
                <SelectContent>
                  {branches.map((b) => (
                    <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          
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
                    <TableHead>Status</TableHead>
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
                        <TableCell>
                          <Badge variant={item.is_active ? "default" : "outline"}>
                            {item.is_active ? "Ativo" : "Inativo"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right space-x-2">
                          <Button variant="ghost" size="icon" asChild>
                            <Link to={`/admin/equipment/${item.id}`}>
                              <Pencil className="h-4 w-4" />
                            </Link>
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="icon"
                            onClick={() => toggleEquipmentStatus(item.id, item.is_active)}
                            title={item.is_active ? "Desativar equipamento" : "Ativar equipamento"}
                          >
                            {item.is_active ? 
                              <PowerOff className="h-4 w-4 text-red-500" /> : 
                              <Power className="h-4 w-4 text-green-500" />
                            }
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
                      <TableCell colSpan={5} className="text-center py-4">
                        Nenhum equipamento cadastrado
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminEquipment;
