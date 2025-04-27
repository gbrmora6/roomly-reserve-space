import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from "@/components/ui/table";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";

type BookingStatus = "pendente" | "confirmada" | "cancelada";

interface Booking {
  id: string;
  user_id: string;
  room_id: string;
  start_time: string;
  end_time: string;
  status: BookingStatus;
  created_at: string;
  updated_at: string;
  profiles: {
    first_name: string | null;
    last_name: string | null;
  };
  rooms: {
    name: string | null;
  };
}

const AdminBookings: React.FC = () => {
  const [filter, setFilter] = useState<BookingStatus | "all">("all");

  const { data: bookings, isLoading, refetch } = useQuery({
  queryKey: ["bookings", filter],
  queryFn: async () => {
    let query = supabase
      .from<Booking>("bookings")
      .select(`
        *,
        profiles(first_name, last_name),
        rooms(name)
      `)                // agora o PostgREST reconhece as FKs
      .order("start_time", { ascending: false });

    if (filter !== "all") {
      query = query.eq("status", filter);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data;
  },
});

  const handleUpdateStatus = async (id: string, status: BookingStatus) => {
    try {
      const { error } = await supabase
        .from("bookings")
        .update({ status })
        .eq("id", id);

      if (error) throw error;

      toast({ title: "Status da reserva atualizado com sucesso" });
      refetch();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Erro ao atualizar status",
        description: error.message,
      });
    }
  };

  const getStatusBadge = (status: BookingStatus) => {
    switch (status) {
      case "pendente":
        return (
          <Badge className="bg-yellow-100 text-yellow-800 border-yellow-300">
            Pendente
          </Badge>
        );
      case "confirmada":
        return (
          <Badge className="bg-green-100 text-green-800 border-green-300">
            Confirmada
          </Badge>
        );
      case "cancelada":
        return (
          <Badge className="bg-red-100 text-red-800 border-red-300">
            Cancelada
          </Badge>
        );
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Gerenciar Reservas</h1>

      <div className="flex gap-2 mb-4">
        <Button
          variant={filter === "all" ? "default" : "outline"}
          onClick={() => setFilter("all")}
        >
          Todas
        </Button>
        <Button
          variant={filter === "pendente" ? "default" : "outline"}
          onClick={() => setFilter("pendente")}
        >
          Pendentes
        </Button>
        <Button
          variant={filter === "confirmada" ? "default" : "outline"}
          onClick={() => setFilter("confirmada")}
        >
          Confirmadas
        </Button>
        <Button
          variant={filter === "cancelada" ? "default" : "outline"}
          onClick={() => setFilter("cancelada")}
        >
          Canceladas
        </Button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-8">
          <p>Carregando reservas...</p>
        </div>
      ) : (
        <div className="border rounded-md">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Sala</TableHead>
                <TableHead>Usuário</TableHead>
                <TableHead>Data</TableHead>
                <TableHead>Horário</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {bookings && bookings.length > 0 ? (
                bookings.map((b) => (
                  <TableRow key={b.id}>
                    <TableCell>{b.rooms.name}</TableCell>
                    <TableCell>
                      {b.profiles.first_name} {b.profiles.last_name}
                    </TableCell>
                    <TableCell>
                      {format(new Date(b.start_time), "dd/MM/yyyy", {
                        locale: ptBR,
                      })}
                    </TableCell>
                    <TableCell>
                      {format(new Date(b.start_time), "HH:mm")} -{" "}
                      {format(new Date(b.end_time), "HH:mm")}
                    </TableCell>
                    <TableCell>{getStatusBadge(b.status)}</TableCell>
                    <TableCell className="flex gap-2">
                      {b.status === "pendente" && (
                        <>
                          <Button
                            size="sm"
                            onClick={() => handleUpdateStatus(b.id, "confirmada")}
                          >
                            Confirmar
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => handleUpdateStatus(b.id, "cancelada")}
                          >
                            Cancelar
                          </Button>
                        </>
                      )}
                      {b.status === "confirmada" && (
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => handleUpdateStatus(b.id, "cancelada")}
                        >
                          Cancelar
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-4">
                    Nenhuma reserva encontrada
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

export default AdminBookings;
