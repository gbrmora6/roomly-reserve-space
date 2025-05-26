
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
  const { data: cities = [] } = useQuery({
    queryKey: ["cities"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("branches")
        .select("city")
        .order("city");
      
      if (error) throw error;
      
      // Remove duplicatas e ordena
      const uniqueCities = [...new Set(data.map(branch => branch.city))].filter(Boolean);
      return uniqueCities;
    },
  });

  return (
    <Select value={selectedCity} onValueChange={onCityChange}>
      <SelectTrigger className="w-[200px]">
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">Todas as cidades</SelectItem>
        {cities.map((city) => (
          <SelectItem key={city} value={city}>
            {city}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
};
