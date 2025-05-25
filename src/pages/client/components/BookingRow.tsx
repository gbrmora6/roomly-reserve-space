import React from "react";
import { format, addHours } from "date-fns";
import { ptBR } from "date-fns/locale";
import { TableCell, TableRow } from "@/components/ui/table";
import { BookingStatusBadge } from "@/components/bookings/BookingStatusBadge";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

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
  const navigate = useNavigate();
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

  // Lógica para mostrar botão de tentar pagar novamente
  const isFaltaPagar = booking.status === "falta pagar";
  let canRetryPayment = false;
  if (isFaltaPagar && booking.start_time) {
    const createdAt = new Date(booking.start_time);
    const now = new Date();
    const diffMs = now.getTime() - createdAt.getTime();
    const diffMinutes = diffMs / (1000 * 60);
    canRetryPayment = diffMinutes <= 15;
  }

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
        {isFaltaPagar && canRetryPayment && (
          <Button
            variant="outline"
            size="sm"
            className="ml-2"
            onClick={() => navigate(`/payment-instructions?bookingId=${booking.id}`)}
          >
            Tentar pagar novamente
          </Button>
        )}
      </TableCell>
    </TableRow>
  );
};
