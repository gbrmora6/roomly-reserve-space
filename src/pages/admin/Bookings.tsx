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
  status: BookingStatus;
  created_at: string;
  updated_at: string;
  user: {
    first_name: string | null;
    last_name: string | null;
  };
  room: {
    name: string;
  };
}

const AdminBookings: React.FC = () => {
  const [filter, setFilter] = useState<BookingStatus | "all">("all");

  const { data: bookings = [], isLoading, refetch, isError } = useQuery<Booking[]>({
    queryKey: ["bookings", filter],
    queryFn: async () => {
      let query = supabase
        .from("bookings")
        .select(`
          id,
          user_id,
          room_id,
          start_time,
          end_time,
          status,
          created_at,
          updated_at,
          user:user_id(first_name,last_name),
          room:room_id(name)
        `)
        .order("start_time", { ascending: false });

      if (filter !== "all") {
        query = query.eq("status", filter);
      }

      const { data, error } = await query;
      if (error) {
        throw new Error(error.message);
      }

      return data as Booking[];
    },
    onError: (err: any) => {
      toast({
        variant: "destructive",
        title: "Erro ao carregar reservas",
        description: err.message,
      });
    },
  });

  const handleUpdateStatus = async (id: string, newStatus: BookingStatus) => {
    try {
      const { error } = await supabase
        .from("bookings")
        .update({ status: newStatus })
        .eq("id", id);

      if (error) throw error;

      toast({
        title:
          newStatus === "confirmed"
            ? "Reserva confirmada com sucesso"
            : "Reserva cancelada com sucesso",
      });

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
        return (
          <Badge className="bg-yellow-100 text-yellow-800 border-yellow-300">
            Pendente
          </Badge>
        );
      case "confirmed":
        return (
          <Badge className="bg-green-100 text-green-800 border-green-300">
            Confirmada
          </Badge>
        );
      case "cancelled":
        return (
          <Badge className="bg-red-100 text-red-800 border-red-300">
            Cancelada
          </Badge>
        );
    }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Gerenciar Reservas</h1>

      <div className="flex gap-2 mb-4">
        {(["all", "pending", "confirmed", "cancelled"] as const).map((status) => (
          <Button
            key={status}
            variant={filter === status ? "default" : "outline"}
            onClick={() => setFilter(status)}
          >
            {status === "all" && "Todas"}
            {status === "pending" && "Pendentes"}
            {status === "confirmed" && "Confirmadas"}
            {status === "cancelled" && "Canceladas"}
          </Button>
        ))}
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-8">
          <p>Carregando reservas...</p>
        </div>
      ) : isError ? (
        <div className="flex items-center justify-center py-8">
          <p>Erro ao carregar reservas.</p>
        </div>
      ) : bookings.length > 0 ? (
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
              {bookings.map((booking) => (
                <TableRow key={booking.id}>
                  <TableCell>{booking.room.name}</TableCell>
                  <TableCell>
                    {booking.user.first_name} {booking.user.last_name}
                  </TableCell>
                  <TableCell>
                    {format(new Date(booking.start_time), "dd/MM/yyyy", { locale: ptBR })}
                  </TableCell>
                  <TableCell>
                    {format(new Date(booking.start_time), "HH:mm")} –{" "}
                    {format(new Date(booking.end_time), "HH:mm")}
                  </TableCell>
                  <TableCell>{getStatusBadge(booking.status)}</TableCell>
                  <TableCell className="flex gap-2">
                    {booking.status === "pending" && (
                      <>
                        <Button size="sm" onClick={() => handleUpdateStatus(booking.id, "confirmed")}>
                          Confirmar
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => handleUpdateStatus(booking.id, "cancelled")}
                        >
                          Cancelar
                        </Button>
                      </>
                    )}
                    {booking.status === "confirmed" && (
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => handleUpdateStatus(booking.id, "cancelled")}
                      >
                        Cancelar
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ) : (
        <div className="flex items-center justify-center py-8">
          <p>Nenhuma reserva encontrada.</p>
        </div>
      )}
    </div>
  );
};

export default AdminBookings;
