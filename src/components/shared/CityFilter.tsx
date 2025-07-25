
import React from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface CityFilterProps {
  selectedCity: string;
  onCityChange: (city: string) => void;
  placeholder?: string;
}

export const CityFilter: React.FC<CityFilterProps> = ({
  selectedCity,
  onCityChange,
  placeholder = "Todas as cidades"
}) => {
  // Query para buscar cidades das filiais cadastradas
  const { data: cities = [] } = useQuery({
    queryKey: ["branch-cities"],
    queryFn: async () => {
      console.log("Buscando cidades das filiais...");
      
      // Buscar cidades distintas das filiais
      const { data, error } = await supabase
        .from("branches")
        .select("city")
        .order("city");
      
      if (error) {
        console.error("Erro ao buscar cidades das filiais:", error);
        throw error;
      }
      
      console.log("Cidades das filiais encontradas:", data);
      
      // Remover duplicatas e filtrar valores vazios
      const uniqueCities = [...new Set(data.map(branch => branch.city))].filter(Boolean);
      return uniqueCities;
    },
  });

  return (
    <Select value={selectedCity} onValueChange={onCityChange}>
      <SelectTrigger className="w-[200px] h-11 bg-white/80 border-secondary/40 hover:border-primary/50 transition-all duration-200">
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">Todas as cidades</SelectItem>
        {(cities as string[]).map((city: string) => (
          <SelectItem key={city as string} value={city as string}>
            {city as string}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
};
