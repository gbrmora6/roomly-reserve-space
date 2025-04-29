
import React from "react";
import { format, addHours } from "date-fns";
import { ptBR } from "date-fns/locale";
import { TableCell, TableRow } from "@/components/ui/table";
import { BookingStatusBadge } from "@/components/bookings/BookingStatusBadge";
import { Button } from "@/components/ui/button";

interface BookingRowProps {
  booking: {
    id: string;
    room: {
      name: string;
    } | null;
    start_time: string;
    end_time: string;
    total_price: number;
    status: string;
  };
  onCancelBooking: (bookingId: string) => void;
}

export const BookingRow = ({ booking, onCancelBooking }: BookingRowProps) => {
  const formatDateTime = (dateTimeString: string) => {
    try {
      // Adjust time to correct the 3-hour difference
      const date = addHours(new Date(dateTimeString), 3);
      return format(date, "HH:mm", { locale: ptBR });
    } catch (error) {
      console.error("Error formatting date:", error);
      return "Horário inválido";
    }
  };

  return (
    <TableRow key={booking.id}>
      <TableCell className="font-medium">{booking.room?.name || "N/A"}</TableCell>
      <TableCell>
        {format(addHours(new Date(booking.start_time), 3), "dd/MM/yyyy", { locale: ptBR })}
      </TableCell>
      <TableCell>
        {formatDateTime(booking.start_time)} - {formatDateTime(booking.end_time)}
      </TableCell>
      <TableCell>
        {new Intl.NumberFormat("pt-BR", {
          style: "currency",
          currency: "BRL",
        }).format(booking.total_price)}
      </TableCell>
      <TableCell>
        <BookingStatusBadge status={booking.status as any} />
      </TableCell>
      <TableCell>
        {booking.status !== "cancelled" && (
          <Button
            variant="destructive"
            size="sm"
            onClick={() => onCancelBooking(booking.id)}
          >
            Cancelar
          </Button>
        )}
      </TableCell>
    </TableRow>
  );
};
