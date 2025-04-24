
import React from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Link } from "react-router-dom";
import { Plus, Pencil, Trash } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface Room {
  id: string;
  name: string;
  description: string | null;
  has_wifi: boolean | null;
  has_ac: boolean | null;
  has_chairs: boolean | null;
  has_tables: boolean | null;
}

const AdminRooms: React.FC = () => {
  const { data: rooms, isLoading, refetch } = useQuery({
    queryKey: ["rooms"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("rooms")
        .select("*")
        .order("name");
      
      if (error) throw error;
      return data as Room[];
    },
  });

  const handleDelete = async (id: string) => {
    if (!window.confirm("Tem certeza que deseja excluir esta sala?")) return;
    
    const { error } = await supabase
      .from("rooms")
      .delete()
      .eq("id", id);
    
    if (error) {
      toast({
        variant: "destructive",
        title: "Erro ao excluir sala",
        description: error.message,
      });
      return;
    }
    
    toast({
      title: "Sala excluída com sucesso",
    });
    refetch();
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Gerenciar Salas</h1>
        <Button asChild>
          <Link to="/admin/rooms/new">
            <Plus className="mr-2 h-4 w-4" /> Nova Sala
          </Link>
        </Button>
      </div>
      
      {isLoading ? (
        <div className="flex items-center justify-center py-8">
          <p>Carregando salas...</p>
        </div>
      ) : (
        <div className="border rounded-md">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Descrição</TableHead>
                <TableHead>Wi-Fi</TableHead>
                <TableHead>Ar-Condic.</TableHead>
                <TableHead>Cadeiras</TableHead>
                <TableHead>Mesas</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rooms && rooms.length > 0 ? (
                rooms.map((room) => (
                  <TableRow key={room.id}>
                    <TableCell className="font-medium">{room.name}</TableCell>
                    <TableCell className="max-w-[200px] truncate">{room.description}</TableCell>
                    <TableCell>{room.has_wifi ? "Sim" : "Não"}</TableCell>
                    <TableCell>{room.has_ac ? "Sim" : "Não"}</TableCell>
                    <TableCell>{room.has_chairs ? "Sim" : "Não"}</TableCell>
                    <TableCell>{room.has_tables ? "Sim" : "Não"}</TableCell>
                    <TableCell className="text-right space-x-2">
                      <Button variant="ghost" size="icon" asChild>
                        <Link to={`/admin/rooms/${room.id}`}>
                          <Pencil className="h-4 w-4" />
                        </Link>
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        onClick={() => handleDelete(room.id)}
                      >
                        <Trash className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-4">
                    Nenhuma sala cadastrada
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

export default AdminRooms;
