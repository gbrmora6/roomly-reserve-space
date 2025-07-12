
import React, { useState } from "react";
import MainLayout from "@/components/layout/MainLayout";
import { useAuth } from "@/contexts/AuthContext";
import { useEquipmentFiltering } from "@/hooks/useEquipmentFiltering";
import { useCompanyAddress } from "@/hooks/useCompanyAddress";
import { PageHeader } from "@/components/shared/PageHeader";
import { FilterBar } from "@/components/shared/FilterBar";
import { ListingGrid } from "@/components/shared/ListingGrid";
import { Database } from "@/integrations/supabase/types";
import { 
  Wrench, 
  Clock, 
  Package,
  Search
} from "lucide-react";

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
  const [searchTerm, setSearchTerm] = useState("");
  
  const { 
    filters, 
    setFilters, 
    data: equipments = [], 
    isLoading, 
    error, 
    handleFilter,
    handleClearFilters 
  } = useEquipmentFiltering();
  
  const { formatAddress } = useCompanyAddress();

  // Filtrar equipamentos por termo de busca
  const filteredEquipments = equipments?.filter(equipment =>
    equipment.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (equipment.description && equipment.description.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  // Converter equipamentos para o formato do ItemCard
  const equipmentsForGrid = filteredEquipments?.map(equipment => ({
    id: equipment.id,
    title: equipment.name,
    description: equipment.description,
    price: equipment.price_per_hour,
    priceLabel: "por hora",
    image: undefined, // Equipments don't have photos in this structure
    status: equipment.available > 0 ? 'available' as const : 'unavailable' as const,
    location: formatAddress(),
    features: [
      { icon: Package, label: "Disponível", available: equipment.available > 0 },
    ],
    stats: [
      { icon: Package, label: "Quantidade", value: equipment.quantity },
      { icon: Package, label: "Disponível", value: equipment.available },
      { icon: Clock, label: "Abertura", value: equipment.open_time || "N/A" },
      { icon: Clock, label: "Fechamento", value: equipment.close_time || "N/A" },
    ],
  })) || [];

  return (
    <MainLayout>
      <div className="container mx-auto px-4 py-8">
        <PageHeader
          title="Equipamentos Disponíveis"
          description="Encontre e reserve equipamentos para suas necessidades"
        />

        <FilterBar
          searchTerm={searchTerm}
          onSearchChange={setSearchTerm}
          filters={filters}
          onFiltersChange={setFilters}
          onFilter={handleFilter}
          onClear={handleClearFilters}
          showDateTimeFilters
          placeholder="Buscar equipamentos..."
        />

        <ListingGrid
          items={equipmentsForGrid}
          isLoading={isLoading}
          error={error}
          onItemAction={(id) => console.log("Reservar equipamento:", id)}
          actionLabel="Reservar Equipamento"
          emptyTitle="Nenhum equipamento encontrado"
          emptyDescription="Ajuste os filtros ou tente novamente mais tarde"
          emptyIcon={Wrench}
          variant="equipment"
          showFiltersMessage={filters.date && (!filters.startTime || !filters.endTime)}
          filtersMessage="Selecione data e horário para verificar a disponibilidade dos equipamentos"
          resultCount={filteredEquipments?.length}
        />
      </div>
    </MainLayout>
  );
};

export default EquipmentList;
