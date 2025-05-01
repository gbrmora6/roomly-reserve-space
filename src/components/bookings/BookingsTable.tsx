
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { BookingStatusBadge } from "./BookingStatusBadge";
import { BookingActions } from "./BookingActions";
import { Database } from "@/integrations/supabase/types";
import { formatCurrency } from "@/utils/formatCurrency";

type BookingStatus = Database["public"]["Enums"]["booking_status"];

interface Equipment {
  name: string;
  price_per_hour: number;
}

interface BookingEquipment {
  quantity: number;
  equipment: Equipment;
}

interface Booking {
  id: string;
  user_id: string;
  room_id: string | null;
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
    price_per_hour: number;
  } | null;
  booking_equipment: BookingEquipment[] | null;
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
            <TableHead>Equipamentos</TableHead>
            <TableHead>Valor</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {bookings && bookings.length > 0 ? (
            bookings.map((booking) => (
              <TableRow key={booking.id}>
                <TableCell>{booking.room?.name || 'Apenas Equipamento'}</TableCell>
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
                  {booking.booking_equipment && booking.booking_equipment.length > 0 ? (
                    <ul className="list-disc list-inside">
                      {booking.booking_equipment.map((item, index) => (
                        <li key={index} className="text-sm">
                          {item.quantity}x {item.equipment.name} ({formatCurrency(item.equipment.price_per_hour)}/h)
                        </li>
                      ))}
                    </ul>
                  ) : (
                    '-'
                  )}
                </TableCell>
                <TableCell>
                  {formatCurrency(booking.total_price)}
                </TableCell>
                <TableCell>
                  <BookingStatusBadge status={booking.status} />
                </TableCell>
                <TableCell>
                  <BookingActions 
                    bookingId={booking.id} 
                    userId={booking.user_id}
                    status={booking.status} 
                    onUpdateStatus={onUpdateStatus}
                  />
                </TableCell>
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell colSpan={8} className="text-center py-4">
                Nenhuma reserva encontrada
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
};
