import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { BookingStatusBadge } from "./BookingStatusBadge";
import { BookingActions } from "./BookingActions";
import { Database } from "@/integrations/supabase/types";

type BookingStatus = Database["public"]["Enums"]["booking_status"];

interface Booking {
  id: string;
  user_id: string;
  room_id: string;
  start_time: string;
  end_time: string;
  status: BookingStatus;
  created_at: string;
  updated_at: string;
  total_price: number;
  user: {
    first_name: string | null;
    last_name: string | null;
  } | null;
  room: {
    name: string;
  } | null;
}

interface BookingsTableProps {
  bookings: Booking[] | null;
  onUpdateStatus: (id: string, status: BookingStatus) => void;
}

export const BookingsTable = ({ bookings, onUpdateStatus }: BookingsTableProps) => {
  return (
    <div className="border rounded-md">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Sala</TableHead>
            <TableHead>Usuário</TableHead>
            <TableHead>Data</TableHead>
            <TableHead>Horário</TableHead>
            <TableHead>Valor</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {bookings && bookings.length > 0 ? (
            bookings.map((booking) => (
              <TableRow key={booking.id}>
                <TableCell>{booking.room?.name || '-'}</TableCell>
                <TableCell>
                  {booking.user ? `${booking.user.first_name || ''} ${booking.user.last_name || ''}` : '-'}
                </TableCell>
                <TableCell>
                  {format(new Date(booking.start_time), "dd/MM/yyyy", { locale: ptBR })}
                </TableCell>
                <TableCell>
                  {format(new Date(booking.start_time), "HH:mm")} - {format(new Date(booking.end_time), "HH:mm")}
                </TableCell>
                <TableCell>
                  R$ {booking.total_price.toFixed(2)}
                </TableCell>
                <TableCell>
                  <BookingStatusBadge status={booking.status} />
                </TableCell>
                <TableCell>
                  <BookingActions 
                    bookingId={booking.id} 
                    status={booking.status} 
                    onUpdateStatus={onUpdateStatus}
                  />
                </TableCell>
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell colSpan={7} className="text-center py-4">
                Nenhuma reserva encontrada
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
};
