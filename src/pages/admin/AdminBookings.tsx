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
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { BookOpen } from "lucide-react";
import { useBranchFilter } from "@/hooks/useBranchFilter";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type BookingStatus = Database["public"]["Enums"]["booking_status"];

const AdminBookings = () => {
  const { branchId } = useBranchFilter();
  const { bookings, isLoading, refetch, filter, setFilter } = useBookingData({ status: 'all', branchId });
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

  // Adaptação do filtro de status para o novo formato
  const handleStatusChange = (status: BookingStatus | "all") => {
    setFilter((prev) => ({ ...prev, status: status as BookingStatus | "all" }));
  };

  return (
    <div className="space-y-6">
      <Card className="shadow-lg rounded-2xl border-0 bg-white p-6 mb-8">
        <CardHeader>
          <CardTitle className="text-2xl font-bold flex items-center gap-2 text-gray-900">
            <BookOpen className="h-7 w-7 text-purple-700" /> Reservas de Salas
          </CardTitle>
          <CardDescription className="text-gray-500">Gerencie todas as reservas de salas</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <h1 className="text-3xl font-bold">Gerenciar Reservas</h1>
            <BookingExport bookings={safeBookings} />
          </div>

          <BookingFilters filter={filter.status || "all"} onFilterChange={handleStatusChange} />

          {isLoading ? (
            <div className="flex justify-center p-8">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary"></div>
            </div>
          ) : (
            <BookingsTable bookings={safeBookings} onUpdateStatus={handleUpdateStatus} />
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminBookings;
