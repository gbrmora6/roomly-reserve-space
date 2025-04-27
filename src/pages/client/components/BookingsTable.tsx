
import React from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { BookingRow } from "./BookingRow";
import { EmptyBookings } from "./EmptyBookings";

interface Booking {
  id: string;
  room: {
    name: string;
  } | null;
  start_time: string;
  end_time: string;
  total_price: number;
  status: string;
}

interface BookingsTableProps {
  bookings: Booking[] | null;
  onCancelBooking: (bookingId: string) => void;
}

export const BookingsTable = ({ bookings, onCancelBooking }: BookingsTableProps) => {
  return (
    <div className="bg-white rounded-lg shadow-sm overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Sala</TableHead>
            <TableHead>Data</TableHead>
            <TableHead>Horário</TableHead>
            <TableHead>Valor</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Chat</TableHead>
            <TableHead>Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {bookings?.map((booking) => (
            <BookingRow
              key={booking.id}
              booking={booking}
              onCancelBooking={onCancelBooking}
            />
          ))}
          {!bookings?.length && <EmptyBookings />}
        </TableBody>
      </Table>
    </div>
  );
};

