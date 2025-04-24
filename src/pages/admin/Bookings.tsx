
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
import { 
  Check, 
  X
} from "lucide-react";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";

interface Booking {
  id: string;
  user_id: string;
  room_id: string;
  start_time: string;
  end_time: string;
  status: "pending" | "confirmed" | "cancelled";
  profiles: {
    first_name: string | null;
    last_name: string | null;
  };
  rooms: {
    name: string;
  };
}

const AdminBookings: React.FC = () => {
  const [statusFilter, setStatusFilter] = useState<string | undefined>(undefined);
  
  const { data: bookings, isLoading, refetch } = useQuery({
    queryKey: ["bookings", statusFilter],
    queryFn: async () => {
      let query = supabase
        .from("bookings")
        .select(`
          *,
          profiles:user_id(first_name, last_name),
          rooms:room_id(name)
        `)
        .order("start_time", { ascending: true });
      
      if (statusFilter) {
        query = query.eq("status", statusFilter);
      }
      
      const { data, error } = await query;
      
      if (error) throw error;
      return data as Booking[];
    },
  });

  const updateBookingStatus = async (id: string, status: "confirmed" | "cancelled") => {
    const { error } = await supabase
      .from("bookings")
      .update({ status })
      .eq("id", id);
    
    if (error) {
      toast({
        variant: "destructive",
        title: "Erro ao atualizar status da reserva",
        description: error.message,
      });
      return;
    }
    
    toast({
      title: `Reserva ${status === "confirmed" ? "confirmada" : "cancelada"} com sucesso`,
    });
    refetch();
  };

  const formatDateTime = (dateString: string) => {
    return format(new Date(dateString), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });
  };

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case "confirmed":
        return "bg-green-100 text-green-800 border-green-200";
      case "cancelled":
        return "bg-red-100 text-red-800 border-red-200";
      default:
        return "bg-yellow-100 text-yellow-800 border-yellow-200";
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Gerenciar Reservas</h1>
        <div className="w-64">
          <Select 
            value={statusFilter} 
            onValueChange={(value) => setStatusFilter(value || undefined)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Filtrar por status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">Todos</SelectItem>
              <SelectItem value="pending">Pendentes</SelectItem>
              <SelectItem value="confirmed">Confirmados</SelectItem>
              <SelectItem value="cancelled">Cancelados</SelectItem>
            </SelectContent>
          </Select>
        </div>
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
                <TableHead>Cliente</TableHead>
                <TableHead>Sala</TableHead>
                <TableHead>Início</TableHead>
                <TableHead>Término</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {bookings && bookings.length > 0 ? (
                bookings.map((booking) => (
                  <TableRow key={booking.id}>
                    <TableCell>
                      {booking.profiles?.first_name} {booking.profiles?.last_name}
                    </TableCell>
                    <TableCell>{booking.rooms?.name}</TableCell>
                    <TableCell>{formatDateTime(booking.start_time)}</TableCell>
                    <TableCell>{formatDateTime(booking.end_time)}</TableCell>
                    <TableCell>
                      <span className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold border ${getStatusBadgeClass(booking.status)}`}>
                        {booking.status === "pending" && "Pendente"}
                        {booking.status === "confirmed" && "Confirmado"}
                        {booking.status === "cancelled" && "Cancelado"}
                      </span>
                    </TableCell>
                    <TableCell className="text-right space-x-2">
                      {booking.status === "pending" && (
                        <>
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-green-600 border-green-600 hover:bg-green-50"
                            onClick={() => updateBookingStatus(booking.id, "confirmed")}
                          >
                            <Check className="mr-1 h-4 w-4" />
                            Confirmar
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-red-600 border-red-600 hover:bg-red-50"
                            onClick={() => updateBookingStatus(booking.id, "cancelled")}
                          >
                            <X className="mr-1 h-4 w-4" />
                            Cancelar
                          </Button>
                        </>
                      )}
                      {booking.status === "confirmed" && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-red-600 border-red-600 hover:bg-red-50"
                          onClick={() => updateBookingStatus(booking.id, "cancelled")}
                        >
                          <X className="mr-1 h-4 w-4" />
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
