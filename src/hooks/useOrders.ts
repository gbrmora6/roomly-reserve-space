
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

/**
 * Hook customizado para buscar pedidos de produtos de um usuário específico
 * Retorna histórico de pedidos com informações detalhadas dos produtos
 */
export const useOrders = (userId: string | undefined) => {
  const { data: productOrders = [], isLoading } = useQuery({
    queryKey: ["my-product-orders", userId],
    queryFn: async () => {
      // Se não há usuário logado, retorna array vazio
      if (!userId) return [];
      
      // Busca pedidos do usuário com itens e informações dos produtos
      const { data, error } = await supabase
        .from("orders")
        .select(`
          *, 
          order_items(
            *, 
            product:products(name, price)
          )
        `)
        .eq("user_id", userId)
        .order("created_at", { ascending: false }); // Mais recentes primeiro
      
      if (error) throw error;
      return data;
    },
    // Só executa a query se há um userId válido
    enabled: !!userId,
  });

  return { 
    productOrders, // Lista de pedidos do usuário
    isLoading      // Estado de carregamento
  };
};
