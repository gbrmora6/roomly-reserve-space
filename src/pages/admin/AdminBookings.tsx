
import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { BookingsTable } from "@/components/bookings/BookingsTable";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { Database } from "@/integrations/supabase/types";
import { Download } from "lucide-react";
import * as XLSX from "xlsx";
import { format } from "date-fns";

type BookingStatus = Database["public"]["Enums"]["booking_status"];

const AdminBookings = () => {
  const [filter, setFilter] = useState<BookingStatus | "all">("all");

  const { data: bookings, isLoading, refetch } = useQuery({
    queryKey: ["bookings", filter],
    queryFn: async () => {
      let query = supabase
        .from("bookings")
        .select(`
          *,
          room:rooms(
            name,
            price_per_hour
          ),
          user:profiles(first_name, last_name),
          booking_equipment:booking_equipment(
            quantity,
            equipment:equipment(
              name,
              price_per_hour
            )
          )
        `)
        .order("start_time", { ascending: false });

      if (filter !== "all") {
        query = query.eq("status", filter);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data;
    },
    meta: {
      onError: (err: any) => {
        toast({
          variant: "destructive",
          title: "Erro ao carregar reservas",
          description: err.message,
        });
      }
    },
  });

  const handleUpdateStatus = async (id: string, newStatus: BookingStatus) => {
    try {
      if (newStatus === "cancelled") {
        // First remove any equipment bookings
        const { error: equipmentError } = await supabase
          .from("booking_equipment")
          .delete()
          .eq("booking_id", id);
          
        if (equipmentError) {
          throw equipmentError;
        }
        
        // Then update the booking status
        const { error } = await supabase
          .from("bookings")
          .update({ status: newStatus })
          .eq("id", id);
          
        if (error) throw error;
        
        toast({ title: "Reserva cancelada com sucesso" });
      } else {
        const { error } = await supabase
          .from("bookings")
          .update({ status: newStatus })
          .eq("id", id);
          
        if (error) throw error;
        toast({ title: "Status da reserva atualizado com sucesso" });
      }
      
      await refetch();
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: "Erro ao atualizar reserva",
        description: err.message,
      });
    }
  };

  const downloadReport = () => {
    if (!bookings || bookings.length === 0) {
      toast({
        title: "Sem dados para exportar",
        description: "Não há reservas para gerar o relatório."
      });
      return;
    }

    try {
      // Prepare data for export
      const exportData = bookings.map(booking => {
        const startDate = new Date(booking.start_time);
        const endDate = new Date(booking.end_time);
        
        const equipmentText = booking.booking_equipment && booking.booking_equipment.length > 0
          ? booking.booking_equipment.map(item => 
              `${item.quantity}x ${item.equipment.name}`
            ).join("; ")
          : "Nenhum";
        
        return {
          "ID": booking.id,
          "Sala": booking.room?.name || "Apenas equipamentos",
          "Cliente": booking.user 
            ? `${booking.user.first_name || ""} ${booking.user.last_name || ""}`.trim() 
            : "-",
          "Data": format(startDate, "dd/MM/yyyy"),
          "Horário Início": format(startDate, "HH:mm"),
          "Horário Fim": format(endDate, "HH:mm"),
          "Equipamentos": equipmentText,
          "Valor Total": `R$ ${booking.total_price.toFixed(2)}`,
          "Status": translateStatus(booking.status)
        };
      });

      // Create worksheet
      const worksheet = XLSX.utils.json_to_sheet(exportData);
      
      // Create workbook
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Reservas");
      
      // Generate filename with current date
      const fileName = `Relatório_Reservas_${format(new Date(), "dd-MM-yyyy")}.xlsx`;
      
      // Write and download
      XLSX.writeFile(workbook, fileName);
      
      toast({
        title: "Relatório gerado com sucesso",
        description: `O arquivo ${fileName} foi baixado.`
      });
    } catch (error) {
      console.error("Erro ao gerar relatório:", error);
      toast({
        variant: "destructive",
        title: "Erro ao gerar relatório",
        description: "Ocorreu um erro durante a geração do relatório. Tente novamente."
      });
    }
  };

  const translateStatus = (status: BookingStatus): string => {
    switch (status) {
      case "pending": return "Pendente";
      case "confirmed": return "Confirmada";
      case "cancelled": return "Cancelada";
      default: return status;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Gerenciar Reservas</h1>
        
        <Button variant="outline" onClick={downloadReport}>
          <Download className="mr-2 h-4 w-4" />
          Baixar Relatório
        </Button>
      </div>

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

      <BookingsTable bookings={bookings} onUpdateStatus={handleUpdateStatus} />
    </div>
  );
};

export default AdminBookings;
