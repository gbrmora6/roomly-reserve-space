
import React, { useState } from "react";
import MainLayout from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import { EquipmentFilters } from "@/components/equipment/EquipmentFilters";
import { EquipmentsGrid } from "@/components/equipment/EquipmentsGrid";
import { ReserveEquipmentModal } from "@/components/equipment/ReserveEquipmentModal";
import { useEquipmentFiltering } from "@/hooks/useEquipmentFiltering";
import { useCompanyAddress } from "@/hooks/useCompanyAddress";
import { Database } from "@/integrations/supabase/types";

// Use the correct enum type for open_days
interface Equipment {
  id: string;
  name: string;
  description: string | null;
  quantity: number;
  price_per_hour: number;
  available: number;
  open_time?: string;
  close_time?: string;
  open_days?: Database["public"]["Enums"]["weekday"][];
}

const EquipmentList: React.FC = () => {
  const { user } = useAuth();
  const [selectedEquipment, setSelectedEquipment] = useState<Equipment | null>(null);
  const [isReserveModalOpen, setIsReserveModalOpen] = useState(false);
  
  const { 
    filters, 
    setFilters, 
    equipments, 
    isLoading, 
    error, 
    handleFilter,
    handleClearFilters 
  } = useEquipmentFiltering();
  
  const { formatAddress } = useCompanyAddress();

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
            showFilterMessage={filters.date && (!filters.startTime || !filters.endTime)}
          />
        )}

        <ReserveEquipmentModal
          isOpen={isReserveModalOpen}
          onOpenChange={setIsReserveModalOpen}
          selectedEquipment={selectedEquipment}
          filters={filters}
        />
      </div>
    </MainLayout>
  );
};

export default EquipmentList;
