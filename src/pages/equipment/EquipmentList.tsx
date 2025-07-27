import React, { useState } from "react";
import MainLayout from "@/components/layout/MainLayout";
import { useAuth } from "@/contexts/AuthContext";
import { useCompanyAddress } from "@/hooks/useCompanyAddress";
import { PageHeader } from "@/components/shared/PageHeader";
import { FilterBar } from "@/components/shared/FilterBar";
import { ListingGrid } from "@/components/shared/ListingGrid";
import { Database } from "@/integrations/supabase/types";
import { ReserveEquipmentModal } from "@/components/equipment/ReserveEquipmentModal";
import { useFilteredEquipment } from "@/hooks/useFilteredEquipment";
import { useCityValidation } from "@/hooks/useCityValidation";
import CityRequiredAlert from "@/components/shared/CityRequiredAlert";
import { CityValidationModal } from "@/components/shared/CityValidationModal";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { 
  Wrench, 
  Clock, 
  Package,
  Search,
  SlidersHorizontal,
  MapPin
} from "lucide-react";

type EquipmentWithAvailability = Database["public"]["Tables"]["equipment"]["Row"] & {
  equipment_photos: { id: string; url: string }[];
  branches?: { id: string; name: string; city: string };
  available: number;
};

const EquipmentList: React.FC = () => {
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCity, setSelectedCity] = useState("all");
  const [selectedEquipment, setSelectedEquipment] = useState<any | null>(null);
  const [isReserveModalOpen, setIsReserveModalOpen] = useState(false);
  const [showCityAlert, setShowCityAlert] = useState(true);
  const [showCityModal, setShowCityModal] = useState(false);

  const { isCityRequired, validateCitySelection } = useCityValidation({
    selectedCity,
    pageName: "equipamentos"
  });

  
  // Estado dos filtros incluindo cidade
  const [filters, setFilters] = useState({
    date: null as Date | null,
    startTime: null as string | null,
    endTime: null as string | null,
    city: null as string | null,
  });
  
  const { formatAddress } = useCompanyAddress();

  const {
    data: equipment,
    isLoading,
    error,
  } = useFilteredEquipment({
    searchTerm,
    selectedCity,
    selectedDate: filters.date,
    startTime: filters.startTime,
    endTime: filters.endTime,
  });

  // Handler para aplicar filtros
  const handleFilter = () => {
    console.log("Aplicando filtros:", filters);
  };

  // Handler para limpar filtros
  const handleClearFilters = () => {
    setFilters({
      date: null,
      startTime: null,
      endTime: null,
      city: null,
    });
  };

  // Filtrar equipamentos por termo de busca
  const filteredEquipments = equipment?.filter(equipment =>
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
    image: equipment.equipment_photos?.[0]?.url,
    status: equipment.available > 0 ? 'available' as const : 'unavailable' as const,
    location: equipment.branches ? 
      `${equipment.branches.street}, ${equipment.branches.number} - ${equipment.branches.neighborhood}, ${equipment.branches.city}` : 
      formatAddress(),
  })) || [];

  return (
    <MainLayout>
      <div className="container mx-auto px-4 py-8">
        <PageHeader
          title="Equipamentos Disponíveis"
          description="Encontre e reserve equipamentos para suas necessidades"
        />
        
        {isCityRequired && showCityAlert && (
          <CityRequiredAlert 
            pageName="equipamentos" 
            onDismiss={() => setShowCityAlert(false)}
          />
        )}

        <FilterBar
          searchTerm={searchTerm}
          onSearchChange={setSearchTerm}
          filters={{ ...filters, city: selectedCity }}
          onFiltersChange={(newFilters) => {
            setFilters(newFilters);
            if (newFilters.city !== selectedCity) {
              setSelectedCity(newFilters.city || "all");
            }
          }}
          onFilter={handleFilter}
          onClear={handleClearFilters}
          showDateTimeFilters
          showLocationFilter
          placeholder="Buscar equipamentos..."
        />

        <ListingGrid
          items={equipmentsForGrid}
          isLoading={isLoading}
          error={error}
          onItemAction={(id) => {
            if (user) {
              // Validar se a cidade foi selecionada antes de permitir a reserva
              if (selectedCity === "all" || !selectedCity) {
                setShowCityModal(true);
                return;
              }
              
              const equipment = filteredEquipments?.find(e => e.id === id);
              if (equipment) {
                setSelectedEquipment(equipment);
                setIsReserveModalOpen(true);
              }
            }
          }}
          actionLabel="Reservar Equipamento"
          emptyTitle="Nenhum equipamento encontrado"
          emptyDescription="Ajuste os filtros ou tente novamente mais tarde"
          emptyIcon={Search}
          variant="equipment"
          showFiltersMessage={!filters.date && !filters.startTime && !filters.endTime}
          filtersMessage="Selecione uma data e horário para verificar a disponibilidade dos equipamentos"
          resultCount={filteredEquipments?.length}
        />

        {/* Modal de reserva de equipamento */}
        <ReserveEquipmentModal
          isOpen={isReserveModalOpen}
          onOpenChange={setIsReserveModalOpen}
          selectedEquipment={selectedEquipment}
          filters={filters}
        />

        {/* Modal de validação de cidade */}
        <CityValidationModal
          isOpen={showCityModal}
          onClose={() => setShowCityModal(false)}
          pageName="equipamentos"
        />
      </div>
    </MainLayout>
  );
};

export default EquipmentList;