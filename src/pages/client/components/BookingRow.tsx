
import React from "react";
import { TableCell, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { X } from "lucide-react";
import { format } from "date-fns";
import { InvoiceDownload } from "@/components/client/InvoiceDownload";
import { parseStoredDateTime } from "@/utils/timezone";

interface Booking {
  id: string;
  room?: {
    name: string;
  } | null;
  equipment?: {
    name: string;
  } | null;
  start_time?: string;
  end_time?: string;
  total_price?: number;
  status: string;
  order_items?: Array<{
    product: {
      name: string;
    };
    quantity: number;
  }>;
  created_at?: string;
}

interface BookingRowProps {
  booking: Booking;
  onCancelBooking: (bookingId: string) => void;
}

export const BookingRow = ({ booking, onCancelBooking }: BookingRowProps) => {
  const getStatusColor = (status: string) => {
    switch (status) {
      case "paid":
        return "bg-green-100 text-green-800";
      case "in_process":
        return "bg-blue-100 text-blue-800";
      case "pre_authorized":
        return "bg-purple-100 text-purple-800";
      case "partial_refunded":
        return "bg-orange-100 text-orange-800";
      case "cancelled":
      case "recused":
        return "bg-red-100 text-red-800";
      // Status legados para compatibilidade
      case "confirmed":
        return "bg-green-100 text-green-800";
      case "pending":
        return "bg-yellow-100 text-yellow-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { label: string; variant: any }> = {
      pending: { label: "Pendente", variant: "secondary" },
      confirmed: { label: "Confirmado", variant: "default" },
      paid: { label: "Pago", variant: "default" },
      recused: { label: "Cancelado", variant: "destructive" },
  

    };

    const statusInfo = statusMap[status] || { label: status, variant: "secondary" };
    return <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>;
  };

  const formatDateTime = (startTime: string, endTime: string) => {
    // Usar parseStoredDateTime para interpretar como horário local
    const start = parseStoredDateTime(startTime);
    const end = parseStoredDateTime(endTime);
    const date = format(start, "dd/MM/yyyy");
    const timeRange = `${format(start, "HH:mm")} - ${format(end, "HH:mm")}`;
    return { date, timeRange };
  };

  const isRoom = !!booking.room;
  const isEquipment = !!booking.equipment;
  const isOrder = !!booking.order_items;

  return (
    <TableRow>
      <TableCell>
        {isRoom && booking.room?.name}
        {isEquipment && booking.equipment?.name}
        {isOrder && (
          <div>
            {booking.order_items?.map((item, index) => (
              <div key={index}>
                {item.quantity}x {item.product?.name}
              </div>
            ))}
          </div>
        )}
      </TableCell>
      <TableCell>
        {booking.start_time && booking.end_time
          ? formatDateTime(booking.start_time, booking.end_time).date
          : booking.created_at
          ? format(parseStoredDateTime(booking.created_at), "dd/MM/yyyy")
          : "-"
        }
      </TableCell>
      <TableCell>
        {booking.start_time && booking.end_time
          ? formatDateTime(booking.start_time, booking.end_time).timeRange
          : "-"
        }
      </TableCell>
      <TableCell>
        R$ {booking.total_price?.toFixed(2) || "0,00"}
      </TableCell>
      <TableCell>{getStatusBadge(booking.status)}</TableCell>
      <TableCell>
        <div className="flex items-center gap-2">
          <InvoiceDownload
            bookingId={isRoom ? booking.id : undefined}
            equipmentBookingId={isEquipment ? booking.id : undefined}
            orderId={isOrder ? booking.id : undefined}
            status={booking.status}
          />
          {booking.status === "pending" && (
            <Button
              variant="destructive"
              size="sm"
              onClick={() => onCancelBooking(booking.id)}
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      </TableCell>
    </TableRow>
  );
};
