
import React, { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BookingsTable } from "@/components/bookings/BookingsTable";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { Database } from "@/integrations/supabase/types";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import * as XLSX from "xlsx";
import { format } from "date-fns";

type BookingStatus = Database["public"]["Enums"]["booking_status"];

// Define types to match BookingTable component expectations
interface User {
  first_name: string | null;
  last_name: string | null;
}

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
  user: User | null;
  room: {
    name: string;
    price_per_hour: number;
  } | null;
  booking_equipment: BookingEquipment[] | null;
}

const AdminEquipmentBookings: React.FC = () => {
  const [activeTab, setActiveTab] = useState<BookingStatus | "all">("all");
  const { refreshUserClaims } = useAuth();
  
  // Execute refresh claims on component mount
  useEffect(() => {
    console.log("AdminEquipmentBookings component mounted, refreshing user claims");
    const refreshClaims = async () => {
      await refreshUserClaims();
    };
    refreshClaims();
  }, [refreshUserClaims]);
  
  const { data: bookings, isLoading, error, refetch } = useQuery({
    queryKey: ["equipment_bookings", activeTab],
    queryFn: async () => {
      console.log(`Fetching ${activeTab} equipment bookings`);
      try {
        // Query the booking_equipment table with a proper join to profiles
        let query = supabase
          .from("booking_equipment")
          .select(`
            id,
            booking_id,
            equipment_id,
            quantity,
            start_time,
            end_time,
            status,
            created_at,
            updated_at,
            total_price,
            user_id,
            equipment:equipment(
              name,
              price_per_hour
            )
          `)
          .order("created_at", { ascending: false });
          
        if (activeTab !== "all") {
          query = query.eq("status", activeTab);
        }
        
        const { data: equipmentBookingsData, error: equipmentError } = await query;
        
        if (equipmentError) throw equipmentError;
        
        console.log("Equipment booking data retrieved:", equipmentBookingsData?.length || 0, "records");
        
        // Fetch user profiles separately for each booking
        const transformedBookings: Booking[] = await Promise.all(
          (equipmentBookingsData || []).map(async (item) => {
            // Fetch user profile
            const { data: userProfile, error: userError } = await supabase
              .from("profiles")
              .select("first_name, last_name")
              .eq("id", item.user_id)
              .single();
            
            if (userError) {
              console.error("Error fetching user profile for", item.user_id, ":", userError);
            }
            
            // Garantir que temos um objeto user válido mesmo se a busca falhar
            const user = userProfile || { first_name: '', last_name: '' };
            
            return {
              id: item.id,
              user_id: item.user_id,
              room_id: null,
              start_time: item.start_time,
              end_time: item.end_time,
              status: item.status as BookingStatus,
              created_at: item.created_at || '',
              updated_at: item.updated_at || '',
              total_price: item.total_price || 0,
              user,
              room: null,
              booking_equipment: [{
                quantity: item.quantity,
                equipment: {
                  name: (item.equipment as any)?.name || "Equipamento não encontrado",
                  price_per_hour: (item.equipment as any)?.price_per_hour || 0
                }
              }]
            };
          })
        );
        
        console.log("Transformed bookings:", transformedBookings.length);
        return transformedBookings;
      } catch (error) {
        console.error("Error fetching equipment bookings:", error);
        throw error;
      }
    },
  });
  
  const handleUpdateStatus = async (id: string, newStatus: BookingStatus) => {
    try {
      const { error } = await supabase
        .from("booking_equipment")
        .update({ status: newStatus })
        .eq("id", id);
      
      if (error) throw error;
      
      toast({
        title: "Status atualizado com sucesso",
      });
      
      refetch();
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: "Erro ao atualizar status",
        description: err.message,
      });
    }
  };

  const downloadReport = () => {
    if (!bookings || bookings.length === 0) {
      toast({
        title: "Sem dados para exportar",
        description: "Não há reservas de equipamentos para gerar o relatório."
      });
      return;
    }

    try {
      // Prepare data for export
      const exportData = bookings.map(booking => {
        const startDate = new Date(booking.start_time);
        const endDate = new Date(booking.end_time);
        
        const equipmentText = booking.booking_equipment && booking.booking_equipment.length > 0
          ? booking.booking_equipment.map(item => 
              `${item.quantity}x ${item.equipment.name}`
            ).join("; ")
          : "Nenhum";
        
        return {
          "ID": booking.id,
          "Cliente": booking.user 
            ? `${booking.user.first_name || ""} ${booking.user.last_name || ""}`.trim() 
            : "-",
          "Data": format(startDate, "dd/MM/yyyy"),
          "Horário Início": format(startDate, "HH:mm"),
          "Horário Fim": format(endDate, "HH:mm"),
          "Equipamentos": equipmentText,
          "Valor Total": `R$ ${booking.total_price?.toFixed(2) || "0.00"}`,
          "Status": translateStatus(booking.status)
        };
      });

      // Create worksheet
      const worksheet = XLSX.utils.json_to_sheet(exportData);
      
      // Create workbook
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Reservas de Equipamentos");
      
      // Generate filename with current date
      const fileName = `Relatório_Reservas_Equipamentos_${format(new Date(), "dd-MM-yyyy")}.xlsx`;
      
      // Write and download
      XLSX.writeFile(workbook, fileName);
      
      toast({
        title: "Relatório gerado com sucesso",
        description: `O arquivo ${fileName} foi baixado.`
      });
    } catch (error) {
      console.error("Erro ao gerar relatório:", error);
      toast({
        variant: "destructive",
        title: "Erro ao gerar relatório",
        description: "Ocorreu um erro durante a geração do relatório. Tente novamente."
      });
    }
  };

  const translateStatus = (status: BookingStatus): string => {
    switch (status) {
      case "pending": return "Pendente";
      case "confirmed": return "Confirmada";
      case "cancelled": return "Cancelada";
      default: return status;
    }
  };
  
  // Garantir que bookings é um array válido antes de passar para o componente
  const safeBookings = (bookings || []).map(booking => ({
    ...booking,
    user: booking.user || { first_name: '', last_name: '' },
    booking_equipment: booking.booking_equipment || []
  }));
  
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Reservas de Equipamentos</h1>
          <p className="text-muted-foreground mt-2">
            Gerencie todas as reservas de equipamentos
          </p>
        </div>
        
        <Button variant="outline" onClick={downloadReport}>
          <Download className="mr-2 h-4 w-4" />
          Baixar Relatório
        </Button>
      </div>
      
      <Tabs defaultValue="all" value={activeTab} onValueChange={(value) => setActiveTab(value as BookingStatus | "all")}>
        <TabsList>
          <TabsTrigger value="all">Todas</TabsTrigger>
          <TabsTrigger value="pending">Pendentes</TabsTrigger>
          <TabsTrigger value="confirmed">Confirmadas</TabsTrigger>
          <TabsTrigger value="cancelled">Canceladas</TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="mt-6">
          {isLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : error ? (
            <div className="rounded-lg bg-destructive/10 p-6 text-center">
              <p className="text-destructive font-medium">Erro ao carregar reservas</p>
              <p className="text-sm text-muted-foreground mt-2">
                {(error as Error).message || "Ocorreu um erro ao carregar as reservas."}
              </p>
            </div>
          ) : !safeBookings || safeBookings.length === 0 ? (
            <div className="text-center py-10 border rounded-lg">
              <p className="text-muted-foreground">Nenhuma reserva de equipamento encontrada</p>
            </div>
          ) : (
            <BookingsTable bookings={safeBookings} onUpdateStatus={handleUpdateStatus} />
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AdminEquipmentBookings;
