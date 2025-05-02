
import React, { useState, useEffect } from "react";
import { MapPin, Table, HardDrive } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import MainLayout from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BookingsTable } from "./components/BookingsTable";
import { CompanyAddressDialog } from "./components/CompanyAddressDialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Database } from "@/integrations/supabase/types";

type BookingStatus = Database["public"]["Enums"]["booking_status"];

const MyBookings = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [showAddressDialog, setShowAddressDialog] = useState(false);
  const [companyProfile, setCompanyProfile] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<"rooms" | "equipment">("rooms");

  const { data: roomBookings, isLoading: roomsLoading, refetch: refetchRooms } = useQuery({
    queryKey: ["my-room-bookings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("bookings")
        .select(`
          *,
          room:rooms(
            name,
            price_per_hour
          ),
          booking_equipment:booking_equipment(
            quantity,
            equipment:equipment(
              name,
              price_per_hour
            )
          )
        `)
        .eq("user_id", user?.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const { data: equipmentBookings, isLoading: equipmentLoading, refetch: refetchEquipment } = useQuery({
    queryKey: ["my-equipment-bookings"],
    queryFn: async () => {
      const { data, error } = await supabase
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
        .eq("user_id", user?.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      
      // Transform data to match BookingsTable component expectations
      const transformedData = data.map(item => ({
        id: item.id,
        user_id: item.user_id,
        room_id: null,
        start_time: item.start_time,
        end_time: item.end_time,
        status: item.status as BookingStatus,
        created_at: item.created_at,
        updated_at: item.updated_at,
        total_price: item.total_price,
        user: null,
        room: null,
        booking_equipment: [{
          quantity: item.quantity,
          equipment: {
            name: item.equipment.name,
            price_per_hour: item.equipment.price_per_hour
          }
        }]
      }));
      
      return transformedData;
    },
    enabled: !!user,
  });

  const handleCancelBooking = async (bookingId: string) => {
    try {
      if (activeTab === "rooms") {
        const { error } = await supabase
          .from("bookings")
          .update({ status: "cancelled" })
          .eq("id", bookingId);

        if (error) throw error;
        
        toast({
          title: "Sucesso",
          description: "Reserva de sala cancelada com sucesso.",
        });
        refetchRooms();
      } else {
        const { error } = await supabase
          .from("booking_equipment")
          .update({ status: "cancelled" })
          .eq("id", bookingId);

        if (error) throw error;
        
        toast({
          title: "Sucesso",
          description: "Reserva de equipamento cancelada com sucesso.",
        });
        refetchEquipment();
      }
    } catch (error: any) {
      toast({
        title: "Erro",
        description: "Não foi possível cancelar a reserva: " + error.message,
        variant: "destructive",
      });
    }
  };

  const handleShowAddress = async () => {
    const { data, error } = await supabase
      .from("company_profile")
      .select("*")
      .single();

    if (error) {
      toast({
        title: "Erro",
        description: "Não foi possível carregar o endereço.",
        variant: "destructive",
      });
    } else {
      setCompanyProfile(data);
      setShowAddressDialog(true);
    }
  };

  const isLoading = roomsLoading || equipmentLoading;

  if (isLoading && !roomBookings && !equipmentBookings) {
    return (
      <MainLayout>
        <div className="container mx-auto py-8">
          <div className="space-y-3">
            <Skeleton className="h-8 w-64" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="container mx-auto py-8">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">Minhas Reservas</h1>
          <Button onClick={handleShowAddress} variant="outline" size="lg" className="bg-primary/10 hover:bg-primary/20 border-primary/30">
            <MapPin className="mr-2 h-5 w-5" />
            Ver Endereço
          </Button>
        </div>
        
        <Tabs defaultValue="rooms" value={activeTab} onValueChange={(value) => setActiveTab(value as "rooms" | "equipment")}>
          <TabsList className="mb-4">
            <TabsTrigger value="rooms" className="flex items-center space-x-2">
              <Table className="h-4 w-4" />
              <span>Reservas de Salas</span>
            </TabsTrigger>
            <TabsTrigger value="equipment" className="flex items-center space-x-2">
              <HardDrive className="h-4 w-4" />
              <span>Reservas de Equipamentos</span>
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="rooms">
            <BookingsTable 
              bookings={roomBookings} 
              onCancelBooking={handleCancelBooking} 
            />
          </TabsContent>
          
          <TabsContent value="equipment">
            <BookingsTable 
              bookings={equipmentBookings} 
              onCancelBooking={handleCancelBooking} 
            />
          </TabsContent>
        </Tabs>

        <CompanyAddressDialog
          open={showAddressDialog}
          onOpenChange={setShowAddressDialog}
          companyProfile={companyProfile}
        />
      </div>
    </MainLayout>
  );
};

export default MyBookings;
