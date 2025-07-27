import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Eye } from "lucide-react";
import { format } from "date-fns";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
type BookingStatus = "in_process" | "paid" | "partial_refunded" | "pre_authorized" | "recused" | "pending" | "confirmed";
interface EquipmentBooking {
  id: string;
  start_time: string;
  end_time: string;
  total_price: number;
  status: BookingStatus;
  user_id: string;
  created_at: string;
  quantity: number;
  equipment_id: string;
  invoice_url?: string;
  user?: {
    first_name: string | null;
    last_name: string | null;
  } | null;
  equipment?: {
    name: string;
    price_per_hour: number;
  } | null;
}
interface EquipmentBookingTableProps {
  bookings: EquipmentBooking[];
  onViewDetails: (booking: EquipmentBooking) => void;
  onRefetch: () => void;
}
export const EquipmentBookingTable: React.FC<EquipmentBookingTableProps> = ({
  bookings,
  onViewDetails,
  onRefetch
}) => {
  const handleRefund = async (bookingId: string) => {
    try {
      const {
        error
      } = await supabase.from("booking_equipment").update({
        status: "recused"
      }).eq("id", bookingId);
      if (error) throw error;
      toast({
        title: "Estorno realizado",
        description: "A reserva foi cancelada e o estorno foi processado."
      });
      onRefetch();
    } catch (error: any) {
      toast({
        title: "Erro ao processar estorno",
        description: error.message || "Erro desconhecido",
        variant: "destructive"
      });
    }
  };
  const handleConfirmPayment = async (bookingId: string) => {
    try {
      const {
        error
      } = await supabase.from("booking_equipment").update({
        status: "paid"
      }).eq("id", bookingId);
      if (error) throw error;
      toast({
        title: "Pagamento confirmado",
        description: "O pagamento foi confirmado com sucesso."
      });
      onRefetch();
    } catch (error: any) {
      toast({
        title: "Erro ao confirmar pagamento",
        description: error.message || "Erro desconhecido",
        variant: "destructive"
      });
    }
  };
  const getCustomerName = (user?: {
    first_name: string | null;
    last_name: string | null;
  } | null) => {
    if (!user) return "Cliente não encontrado";
    return `${user.first_name || ""} ${user.last_name || ""}`.trim() || "Nome não informado";
  };
  if (bookings.length === 0) {
    return <Card>
        <CardContent className="p-6">
          <div className="text-center text-muted-foreground">
            <p>Nenhuma reserva de equipamento encontrada.</p>
          </div>
        </CardContent>
      </Card>;
  }
  return <Card>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Cliente</TableHead>
                <TableHead>Equipamento</TableHead>
                <TableHead>Data/Hora</TableHead>
                <TableHead>Quantidade</TableHead>
                <TableHead>Valor</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {bookings.map(booking => <TableRow key={booking.id}>
                  <TableCell className="py-3 px-4">
                    <div className="font-medium">
                      {getCustomerName(booking.user)}
                    </div>
                  </TableCell>
                  <TableCell className="py-3 px-4">
                    {booking.equipment?.name || "Equipamento não encontrado"}
                  </TableCell>
                  <TableCell className="py-3 px-4 text-sm">
                    <div>
                      <div>{format(new Date(booking.start_time), "dd/MM/yyyy")}</div>
                      <div className="text-muted-foreground">
                        {format(new Date(booking.start_time), "HH:mm")} - {format(new Date(booking.end_time), "HH:mm")}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="py-3 px-4 text-sm">
                    {booking.quantity}x
                  </TableCell>
                  <TableCell className="py-3 px-4 text-sm font-medium">
                    R$ {booking.total_price?.toFixed(2) || "0.00"}
                  </TableCell>
                  <TableCell className="py-3 px-4 text-sm">
                    <StatusBadge status={booking.status} />
                  </TableCell>
                  <TableCell className="py-3 px-4 text-sm">
                    <div className="flex gap-2 flex-col lg:flex-row">
                      <Button size="sm" variant="outline" onClick={() => onViewDetails(booking)}>
                        <Eye className="h-4 w-4 mr-1" />
                        Ver
                      </Button>
                      {booking.status === "in_process"}
                    </div>
                  </TableCell>
                </TableRow>)}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>;
};