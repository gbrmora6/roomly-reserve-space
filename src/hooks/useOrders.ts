import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export const useOrders = (userId: string | undefined) => {
  const { data: productOrders = [], isLoading } = useQuery({
    queryKey: ["my-product-orders", userId],
    queryFn: async () => {
      if (!userId) return [];
      const { data, error } = await supabase
        .from("orders")
        .select(`*, order_items(*, product:products(name, price))`)
        .eq("user_id", userId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!userId,
  });

  return { productOrders, isLoading };
}; 