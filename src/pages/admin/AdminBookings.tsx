
import React from "react";
import { BookingsTable } from "@/components/bookings/BookingsTable";
import { BookingFilters } from "@/components/bookings/BookingFilters";
import { BookingExport } from "@/components/bookings/BookingExport";
import { useBookingData } from "@/hooks/useBookingData";
import { BookingStatusManager } from "@/components/bookings/BookingStatusManager";
import { Database } from "@/integrations/supabase/types";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

type BookingStatus = Database["public"]["Enums"]["booking_status"];

const AdminBookings = () => {
  const { bookings, isLoading, refetch, filter, setFilter } = useBookingData();
  const { handleUpdateStatus } = BookingStatusManager({ refetch });
  const { toast } = useToast();

  // Verificar se temos acesso às reservas no carregamento inicial
  useEffect(() => {
    const checkAccess = async () => {
      const { data, error } = await supabase
        .from("bookings")
        .select("id")
        .limit(1);

      if (error) {
        console.error("Erro ao acessar reservas:", error);
        toast({
          title: "Erro de acesso",
          description: "Não foi possível acessar as reservas. Verifique as permissões no banco de dados.",
          variant: "destructive"
        });
      }
    };

    checkAccess();
  }, [toast]);

  // Garantir que bookings seja um array válido antes de passar para os componentes
  const safeBookings = Array.isArray(bookings) ? bookings.map(booking => ({
    ...booking,
    user: booking.user || { first_name: '', last_name: '' },
    booking_equipment: booking.booking_equipment || []
  })) : [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Gerenciar Reservas</h1>
        <BookingExport bookings={safeBookings} />
      </div>

      <BookingFilters filter={filter} onFilterChange={setFilter} />

      {isLoading ? (
        <div className="flex justify-center p-8">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary"></div>
        </div>
      ) : (
        <BookingsTable bookings={safeBookings} onUpdateStatus={handleUpdateStatus} />
      )}
    </div>
  );
};

export default AdminBookings;
