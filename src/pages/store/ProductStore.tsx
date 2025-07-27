
import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import MainLayout from "@/components/layout/MainLayout";
import { Link, useNavigate } from "react-router-dom";
import { ShoppingBag, Search, Package, Star, Tags } from "lucide-react";
import { formatCurrency } from "@/utils/formatCurrency";
import { PageHeader } from "@/components/shared/PageHeader";
import { FilterBar } from "@/components/shared/FilterBar";
import { ListingGrid } from "@/components/shared/ListingGrid";
import { CityFilter } from "@/components/shared/CityFilter";
import { useBranchByCity } from "@/hooks/useBranchByCity";
import { useCityValidation } from "@/hooks/useCityValidation";
import CityRequiredAlert from "@/components/shared/CityRequiredAlert";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

const ProductStore = () => {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState("name");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
  const [selectedCity, setSelectedCity] = useState("all");
  const [showCityAlert, setShowCityAlert] = useState(true);

  const { isCityRequired, validateCitySelection } = useCityValidation({
    selectedCity,
    pageName: "produtos"
  });

  const { data: branchId } = useBranchByCity(selectedCity);

  const { data: products, isLoading, error } = useQuery({
    queryKey: ["store-products", sortBy, sortOrder, selectedCity, branchId],
    queryFn: async () => {
      let query = supabase
        .from("products")
        .select("*")
        .eq("is_active", true)
        .order(sortBy, { ascending: sortOrder === "asc" });

      // Aplicar filtro de cidade se selecionado
      if (selectedCity && selectedCity !== "all" && branchId) {
        console.log("Aplicando filtro de branch para produtos:", branchId);
        query = query.eq('branch_id', branchId);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data || [];
    },
  });

  const filteredProducts = products?.filter((product) =>
    product.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    (product.description && product.description.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  // Converter produtos para o formato do ItemCard
  const productsForGrid = filteredProducts?.map(product => ({
    id: product.id,
    title: product.name,
    description: product.description,
    price: product.price,
    priceLabel: "unidade",
    image: undefined, // Products don't have photos in this structure
    status: product.quantity > 0 ? 'available' as const : 'unavailable' as const,
    features: [
      { icon: Package, label: "Em estoque", available: product.quantity > 0 },
    ],
    stats: [
      { icon: Package, label: "Estoque", value: product.quantity },
      ...(product.model ? [{ icon: Star, label: "Modelo", value: product.model }] : []),
    ],
  })) || [];

  const handleItemAction = (id: string) => {
    // Validar se a cidade foi selecionada antes de permitir a navegação
    if (!validateCitySelection()) {
      return;
    }
    
    // Navigate to product detail page usando React Router
    navigate(`/product/${id}`);
  };

  const handleSortChange = (newSortBy: string, newOrder: "asc" | "desc") => {
    setSortBy(newSortBy);
    setSortOrder(newOrder);
  };

  return (
    <MainLayout>
      <div className="container py-10">
        <PageHeader
          title="Loja de Produtos"
          description="Encontre os melhores produtos para suas necessidades"
        />
        
        {isCityRequired && showCityAlert && (
          <CityRequiredAlert 
            pageName="produtos" 
            onDismiss={() => setShowCityAlert(false)}
          />
        )}

        <FilterBar
          searchTerm={searchTerm}
          onSearchChange={setSearchTerm}
          filters={{ city: selectedCity }}
          onFiltersChange={(newFilters) => {
            if (newFilters.city !== selectedCity) {
              setSelectedCity(newFilters.city || "all");
            }
          }}
          showLocationFilter
          placeholder="Buscar produtos..."
        />

        <ListingGrid
          items={productsForGrid}
          isLoading={isLoading}
          error={error}
          onItemAction={handleItemAction}
          actionLabel="Ver Detalhes"
          emptyTitle="Nenhum produto encontrado"
          emptyDescription={
            searchTerm 
              ? "Tente uma busca diferente" 
              : "Estamos adicionando novos produtos em breve"
          }
          emptyIcon={ShoppingBag}
          variant="product"
          sortBy={sortBy}
          sortOrder={sortOrder}
          onSortChange={handleSortChange}
          resultCount={filteredProducts?.length}
        />
      </div>
    </MainLayout>
  );
};

export default ProductStore;
