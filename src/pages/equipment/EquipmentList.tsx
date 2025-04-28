
import React, { useState } from "react";
import MainLayout from "@/components/layout/MainLayout";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import { EquipmentFilters } from "@/components/equipment/EquipmentFilters";
import { EquipmentsGrid } from "@/components/equipment/EquipmentsGrid";
import { ReserveEquipmentForm } from "@/components/equipment/ReserveEquipmentForm";
import { formatCurrency } from "@/utils/formatCurrency";

interface Equipment {
  id: string;
  name: string;
  description: string | null;
  quantity: number;
  price_per_hour: number;
}

const EquipmentList: React.FC = () => {
  const { user } = useAuth();
  const [selectedEquipment, setSelectedEquipment] = useState<Equipment | null>(null);
  const [isReserveModalOpen, setIsReserveModalOpen] = useState(false);
  const [filters, setFilters] = useState({
    date: null as Date | null,
    startTime: null as string | null,
    endTime: null as string | null,
  });
  const [companyAddress, setCompanyAddress] = useState({
    street: "",
    number: "",
    neighborhood: "",
    city: "",
  });

  // Fetch company profile for address
  React.useEffect(() => {
    const fetchCompanyProfile = async () => {
      const { data, error } = await supabase
        .from("company_profile")
        .select("street, number, neighborhood, city")
        .single();
      
      if (data && !error) {
        setCompanyAddress(data);
      }
    };
    
    fetchCompanyProfile();
  }, []);

  const { data: equipments, isLoading, error, refetch } = useQuery({
    queryKey: ["equipments", filters],
    queryFn: async () => {
      if (filters.date && filters.startTime && filters.endTime) {
        const startDateTime = new Date(filters.date);
        const [startHours, startMinutes] = filters.startTime.split(':');
        startDateTime.setHours(parseInt(startHours), parseInt(startMinutes));

        const endDateTime = new Date(filters.date);
        const [endHours, endMinutes] = filters.endTime.split(':');
        endDateTime.setHours(parseInt(endHours), parseInt(endMinutes));

        // Get all equipment
        const { data: allEquipments, error: equipmentsError } = await supabase
          .from('equipment')
          .select('*')
          .order('name');

        if (equipmentsError) throw equipmentsError;

        // Get bookings that overlap with the selected time
        const { data: bookings, error: bookingsError } = await supabase
          .from('booking_equipment')
          .select(`
            equipment_id,
            quantity,
            bookings (
              start_time,
              end_time,
              status
            )
          `)
          .not('bookings.status', 'eq', 'cancelled')
          .gte('bookings.end_time', startDateTime.toISOString())
          .lte('bookings.start_time', endDateTime.toISOString());

        if (bookingsError) throw bookingsError;

        // Calculate available quantities
        const bookedQuantities: Record<string, number> = {};
        
        bookings.forEach(booking => {
          if (booking.bookings) {
            if (!bookedQuantities[booking.equipment_id]) {
              bookedQuantities[booking.equipment_id] = 0;
            }
            bookedQuantities[booking.equipment_id] += booking.quantity;
          }
        });

        // Filter out equipment with no available quantity
        const availableEquipments = allEquipments.map(equipment => ({
          ...equipment,
          available: equipment.quantity - (bookedQuantities[equipment.id] || 0)
        })).filter(equipment => equipment.available > 0);

        return availableEquipments;
      }

      // If no filters, just get all equipment
      const { data, error } = await supabase
        .from('equipment')
        .select('*')
        .order('name');
        
      if (error) throw error;
      
      return data.map(equipment => ({
        ...equipment,
        available: equipment.quantity
      }));
    },
  });

  const handleReserve = (equipment: Equipment) => {
    if (user) {
      setSelectedEquipment(equipment);
      setIsReserveModalOpen(true);
    } else {
      toast({
        title: "Você precisa estar logado",
        description: "Faça login para reservar equipamentos",
        variant: "destructive"
      });
    }
  };

  const handleFilter = () => {
    refetch();
  };

  const handleClearFilters = () => {
    setFilters({
      date: null,
      startTime: null,
      endTime: null,
    });
  };

  // Format the full address
  const formatAddress = () => {
    if (!companyAddress.street) return "";
    return `${companyAddress.street}, ${companyAddress.number} - ${companyAddress.neighborhood}, ${companyAddress.city}`;
  };

  return (
    <MainLayout>
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-8 text-center md:text-left bg-gradient-to-r from-roomly-600 to-roomly-800 text-transparent bg-clip-text">
          Equipamentos Disponíveis
        </h1>

        <EquipmentFilters 
          filters={filters} 
          setFilters={setFilters} 
          onFilter={handleFilter}
          onClear={handleClearFilters}
        />

        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          </div>
        ) : error ? (
          <div className="text-center py-20">
            <p className="text-red-500 mb-2">Erro ao carregar equipamentos</p>
          </div>
        ) : (
          <EquipmentsGrid
            equipments={equipments}
            onReserve={handleReserve}
            isLoggedIn={!!user}
            address={formatAddress()}
            showFilterMessage={!filters.date && !filters.startTime && !filters.endTime}
          />
        )}

        <Dialog open={isReserveModalOpen} onOpenChange={setIsReserveModalOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Reservar Equipamento</DialogTitle>
            </DialogHeader>
            {selectedEquipment && (
              <ReserveEquipmentForm
                equipment={selectedEquipment}
                onClose={() => setIsReserveModalOpen(false)}
                filters={filters}
              />
            )}
          </DialogContent>
        </Dialog>
      </div>
    </MainLayout>
  );
};

export default EquipmentList;
