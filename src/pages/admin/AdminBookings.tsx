
import React from "react";
import { BookingsTable } from "@/components/bookings/BookingsTable";
import { BookingFilters } from "@/components/bookings/BookingFilters";
import { BookingExport } from "@/components/bookings/BookingExport";
import { useBookingData } from "@/hooks/useBookingData";
import { BookingStatusManager } from "@/components/bookings/BookingStatusManager";
import { Database } from "@/integrations/supabase/types";

type BookingStatus = Database["public"]["Enums"]["booking_status"];

const AdminBookings = () => {
  const { bookings, isLoading, refetch, filter, setFilter } = useBookingData();
  const { handleUpdateStatus } = BookingStatusManager({ refetch });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Gerenciar Reservas</h1>
        <BookingExport bookings={bookings} />
      </div>

      <BookingFilters filter={filter} onFilterChange={setFilter} />

      <BookingsTable bookings={bookings} onUpdateStatus={handleUpdateStatus} />
    </div>
  );
};

export default AdminBookings;
