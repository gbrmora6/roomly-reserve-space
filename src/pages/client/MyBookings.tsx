
import React, { useState } from "react";
import { MapPin } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import MainLayout from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { BookingsTable } from "./components/BookingsTable";
import { CompanyAddressDialog } from "./components/CompanyAddressDialog";

const MyBookings = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [showAddressDialog, setShowAddressDialog] = useState(false);
  const [companyProfile, setCompanyProfile] = useState<any>(null);

  const { data: bookings, isLoading, refetch } = useQuery({
    queryKey: ["my-bookings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("bookings")
        .select(`
          *,
          room:rooms(
            name,
            price_per_hour
          )
        `)
        .eq("user_id", user?.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const handleCancelBooking = async (bookingId: string) => {
    const { error } = await supabase
      .from("bookings")
      .update({ status: "cancelled" })
      .eq("id", bookingId);

    if (error) {
      toast({
        title: "Erro",
        description: "Não foi possível cancelar a reserva.",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Sucesso",
        description: "Reserva cancelada com sucesso.",
      });
      refetch();
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

  if (isLoading) {
    return (
      <MainLayout>
        <div className="container mx-auto py-8">
          <p>Carregando reservas...</p>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="container mx-auto py-8">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">Minhas Reservas</h1>
          <Button onClick={handleShowAddress} variant="outline" size="sm">
            <MapPin className="mr-2 h-4 w-4" />
            Ver Endereço
          </Button>
        </div>
        
        <BookingsTable 
          bookings={bookings} 
          onCancelBooking={handleCancelBooking} 
        />

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
