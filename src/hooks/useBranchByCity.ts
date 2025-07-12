
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export const useBranchByCity = (selectedCity: string) => {
  return useQuery({
    queryKey: ["branches-by-city", selectedCity],
    queryFn: async () => {
      if (!selectedCity || selectedCity === "all") {
        return null;
      }

      console.log("Buscando branch para cidade:", selectedCity);
      
      const { data, error } = await supabase
        .from("branches")
        .select("id")
        .eq("city", selectedCity)
        .limit(1)
        .single();
      
      if (error) {
        console.error("Erro ao buscar branch por cidade:", error);
        return null;
      }
      
      console.log("Branch encontrada para cidade:", data);
      return data?.id || null;
    },
    enabled: !!selectedCity && selectedCity !== "all",
  });
};
