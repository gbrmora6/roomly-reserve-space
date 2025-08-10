
import React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { format } from "date-fns";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { InvoiceUpload } from "@/components/admin/InvoiceUpload";

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

interface EquipmentBookingDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  booking: EquipmentBooking | null;
  onRefetch: () => void;
}

export const EquipmentBookingDetailsModal: React.FC<EquipmentBookingDetailsModalProps> = ({
  isOpen,
  onClose,
  booking,
  onRefetch,
}) => {
  if (!booking) return null;

  const getCustomerName = (user?: { first_name: string | null; last_name: string | null } | null) => {
    if (!user) return "Cliente não encontrado";
    return `${user.first_name || ""} ${user.last_name || ""}`.trim() || "Nome não informado";
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Detalhes da Reserva de Equipamento</DialogTitle>
          <DialogDescription>Informações completas sobre a reserva selecionada</DialogDescription>
        </DialogHeader>
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h3 className="font-semibold mb-2">Informações do Cliente</h3>
              <p><strong>Nome:</strong> {getCustomerName(booking.user)}</p>
              <p><strong>Data da Reserva:</strong> {format(new Date(booking.created_at), "dd/MM/yyyy HH:mm")}</p>
            </div>
            <div>
              <h3 className="font-semibold mb-2">Detalhes da Reserva</h3>
              <StatusBadge status={booking.status} />
              <p className="mt-2"><strong>Valor Total:</strong> R$ {booking.total_price?.toFixed(2) || "0.00"}</p>
            </div>
          </div>
          
          <div>
            <h3 className="font-semibold mb-2">Horário</h3>
            <p><strong>Data:</strong> {format(new Date(booking.start_time), "dd/MM/yyyy")}</p>
            <p><strong>Início:</strong> {format(new Date(booking.start_time), "HH:mm")}</p>
            <p><strong>Fim:</strong> {format(new Date(booking.end_time), "HH:mm")}</p>
          </div>
          
          <div>
            <h3 className="font-semibold mb-2">Equipamento</h3>
            <div className="border p-3 rounded">
              <p><strong>Nome:</strong> {booking.equipment?.name || "Equipamento não encontrado"}</p>
              <p><strong>Quantidade:</strong> {booking.quantity}x</p>
              <p><strong>Preço por hora:</strong> R$ {booking.equipment?.price_per_hour?.toFixed(2) || "0.00"}</p>
            </div>
          </div>
          
          {booking.invoice_url !== undefined && (
            <div>
              <h3 className="font-semibold mb-2">Nota Fiscal</h3>
              <InvoiceUpload
                recordId={booking.id}
                recordType="equipment_booking"
                currentInvoiceUrl={booking.invoice_url}
                onSuccess={() => onRefetch()}
              />
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
