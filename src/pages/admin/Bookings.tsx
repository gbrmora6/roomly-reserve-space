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

type BookingStatus = "pending" | "confirmed" | "cancelled";

interface Booking {
  id: string;
  user_id: string;
  room_id: string;
  start_time: string;
  end_time: string;
  booking_status: BookingStatus;    // aqui é booking_status
  created_at: string;
  updated_at: string;
  user: { first_name: string | null; last_name: string | null };
  room: { name: string };
}

const Bookings: React.FC = () => {
  const [filter, setFilter] = useState<BookingStatus | "all">("all");

  const { data: bookings, isLoading, refetch } = useQuery({
    queryKey: ["bookings", filter],
    queryFn: async () => {
      let query = supabase
        .from("bookings")
        .select(`
          *,
          user:user_id(first_name,last_name),
          room:room_id(name)
        `)
        .order("start_time", { ascending: false });

      if (filter !== "all") {
        // filtra pela coluna booking_status
        query = query.eq("booking_status", filter);
      }

      const { data, error } = await query;
      if (error) throw error;

      return data as Booking[];
    },
  });

  const handleUpdateStatus = async (id: string, newStatus: BookingStatus) => {
    try {
      // atualiza a coluna booking_status
      const { error } = await supabase
        .from("bookings")
        .update({ booking_status: newStatus })
        .eq("id", id);

      if (error) throw error;

      toast({
        title:
          newStatus === "confirmed"
            ? "Reserva confirmada com sucesso"
            : "Reserva cancelada com sucesso",
      });

      // seta o filtro e refaz a consulta
      setFilter(newStatus);
      await refetch();
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: "Erro ao atualizar reserva",
        description: err.message,
      });
    }
  };

  const getStatusBadge = (status: BookingStatus) => {
    switch (status) {
      case "pending":
        return <Badge variant="yellow">Pendente</Badge>;
      case "confirmed":
        return <Badge variant="green">Confirmada</Badge>;
      case "cancelled":
        return <Badge variant="red">Cancelada</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Gerenciar Reservas</h1>

      <div className="flex gap-2 mb-4">
        {(["all", "pending", "confirmed", "cancelled"] as const).map((f) => (
          <Button
            key={f}
            variant={filter === f ? "default" : "outline"}
            onClick={() => setFilter(f)}
          >
            {f === "all"
              ? "Todas"
              : f === "pending"
              ? "Pendentes"
              : f === "confirmed"
              ? "Confirmadas"
              : "Canceladas"}
          </Button>
        ))}
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
                    <TableCell>{b.room.name}</TableCell>
                    <TableCell>
                      {b.user.first_name} {b.user.last_name}
                    </TableCell>
                    <TableCell>
                      {format(new Date(b.start_time), "dd/MM/yyyy", {
                        locale: ptBR,
                      })}
                    </TableCell>
                    <TableCell>
                      {format(new Date(b.start_time), "HH:mm")} –{" "}
                      {format(new Date(b.end_time), "HH:mm")}
                    </TableCell>
                    <TableCell>{getStatusBadge(b.booking_status)}</TableCell>
                    <TableCell className="flex gap-2">
                      {b.booking_status === "pending" && (
                        <>
                          <Button
                            size="sm"
                            onClick={() =>
                              handleUpdateStatus(b.id, "confirmed")
                            }
                          >
                            Confirmar
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() =>
                              handleUpdateStatus(b.id, "cancelled")
                            }
                          >
                            Cancelar
                          </Button>
                        </>
                      )}
                      {b.booking_status === "confirmed" && (
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() =>
                            handleUpdateStatus(b.id, "cancelled")
                          }
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

export default Bookings;
