
import React from "react";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { Download } from "lucide-react";
import * as XLSX from "xlsx";
import { format } from "date-fns";
import { Database } from "@/integrations/supabase/types";
import { parseStoredDateTime } from "@/utils/timezone";

type BookingStatus = Database["public"]["Enums"]["booking_status"];

interface BookingData {
  id: string;
  status: BookingStatus;
  start_time: string;
  end_time: string;
  total_price: number;
  room?: {
    name: string;
  } | null;
  user?: {
    first_name: string | null;
    last_name: string | null;
  } | null;
  booking_equipment?: {
    quantity: number;
    equipment: {
      name: string;
    }
  }[] | null;
}

interface BookingExportProps {
  bookings: BookingData[] | null;
}

export const BookingExport = ({ bookings }: BookingExportProps) => {
  const translateStatus = (status: BookingStatus): string => {
    switch (status) {
      case "in_process": return "Em Processamento";
    case "paid": return "Paga";
    case "partial_refunded": return "Parcialmente Devolvida";
    case "recused": return "Cancelada";
    case "pre_authorized": return "Pré-autorizada";
    case "recused": return "Recusada";
    // Status legados para compatibilidade
    case "pending": return "Pendente";
    case "confirmed": return "Confirmada";
    default: return status;
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
        // Usar parseStoredDateTime para interpretar como horário local
        const startDate = parseStoredDateTime(booking.start_time);
        const endDate = parseStoredDateTime(booking.end_time);
        
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

  return (
    <Button variant="outline" onClick={downloadReport}>
      <Download className="mr-2 h-4 w-4" />
      Baixar Relatório
    </Button>
  );
};
