
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

interface Room {
  id: string;
  name: string;
  description: string | null;
  has_wifi: boolean | null;
  has_ac: boolean | null;
  has_chairs: boolean | null;
  has_tables: boolean | null;
  is_active: boolean;
}

const AdminRooms: React.FC = () => {
  const { refreshUserClaims } = useAuth();
  
  // Execute refresh claims on component mount
  useEffect(() => {
    console.log("AdminRooms component mounted, refreshing user claims");
    const refreshClaims = async () => {
      await refreshUserClaims();
    };
    refreshClaims();
  }, [refreshUserClaims]);

  const { data: rooms, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["rooms"],
    queryFn: async () => {
      console.log("Fetching rooms data");
      const { data, error } = await supabase
        .from("rooms")
        .select("*")
        .order("name");
      
      if (error) {
        console.error("Error fetching rooms:", error);
        throw error;
      }
      
      console.log("Rooms data received:", data);
      return data as Room[];
    },
  });

  const handleDelete = async (id: string) => {
    if (!window.confirm("Tem certeza que deseja excluir esta sala?")) return;
    
    try {
      const { error } = await supabase
        .from("rooms")
        .delete()
        .eq("id", id);
      
      if (error) throw error;
      
      toast({
        title: "Sala excluída com sucesso",
      });
      refetch();
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: "Erro ao excluir sala",
        description: err.message,
      });
    }
  };

  const toggleRoomStatus = async (id: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from("rooms")
        .update({ is_active: !currentStatus })
        .eq("id", id);
      
      if (error) throw error;
      
      toast({
        title: currentStatus ? "Sala desativada com sucesso" : "Sala ativada com sucesso",
      });
      refetch();
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: "Erro ao atualizar status da sala",
        description: err.message,
      });
    }
  };

  console.log("AdminRooms render state:", { isLoading, isError, roomsCount: rooms?.length });

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
      
      {isError ? (
        <div className="rounded-lg bg-destructive/10 p-6 text-center">
          <p className="text-destructive font-medium mb-2">Erro ao carregar salas</p>
          <p className="text-sm text-muted-foreground mb-4">{(error as Error)?.message || "Ocorreu um erro desconhecido"}</p>
          <Button onClick={() => refetch()} variant="outline">Tentar novamente</Button>
        </div>
      ) : isLoading ? (
        <div className="space-y-3 py-4">
          <Skeleton className="h-10 w-full" />
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
                <TableHead>Wi-Fi</TableHead>
                <TableHead>Ar-Condic.</TableHead>
                <TableHead>Cadeiras</TableHead>
                <TableHead>Mesas</TableHead>
                <TableHead>Status</TableHead>
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
                    <TableCell>
                      <Badge variant={room.is_active ? "default" : "outline"}>
                        {room.is_active ? "Ativo" : "Inativo"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right space-x-2">
                      <Button variant="ghost" size="icon" asChild>
                        <Link to={`/admin/rooms/${room.id}`}>
                          <Pencil className="h-4 w-4" />
                        </Link>
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        onClick={() => toggleRoomStatus(room.id, room.is_active)}
                        title={room.is_active ? "Desativar sala" : "Ativar sala"}
                      >
                        {room.is_active ? 
                          <PowerOff className="h-4 w-4 text-red-500" /> : 
                          <Power className="h-4 w-4 text-green-500" />
                        }
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
                  <TableCell colSpan={8} className="text-center py-4">
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
