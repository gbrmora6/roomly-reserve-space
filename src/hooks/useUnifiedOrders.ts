import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface UnifiedOrder {
  id: string;
  user_id: string;
  total_amount: number;
  status: string;
  payment_method?: string;
  created_at: string;
  updated_at: string;
  refund_status?: string;
  refund_amount?: number;
  invoice_url?: string;
  click2pay_response?: any;
  
  // Products
  order_items?: Array<{
    id: string;
    quantity: number;
    price_per_unit: number;
    product: {
      name: string;
      price: number;
    };
  }>;
  
  // Room bookings
  bookings?: Array<{
    id: string;
    start_time: string;
    end_time: string;
    total_price: number;
    status: string;
    room: {
      name: string;
      description?: string;
    };
  }>;
  
  // Equipment bookings
  booking_equipment?: Array<{
    id: string;
    start_time: string;
    end_time: string;
    quantity: number;
    total_price: number;
    status: string;
    equipment: {
      name: string;
      description?: string;
    };
  }>;
  
  // User info
  profiles?: {
    first_name: string;
    last_name: string;
    email: string;
  };
}

export const useUnifiedOrders = (userId: string | undefined) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: allOrders = [], isLoading, refetch } = useQuery({
    queryKey: ["unified-orders", userId],
    queryFn: async () => {
      if (!userId) return [];
      
      console.log("🔍 Fazendo consulta de pedidos para usuário:", userId);
      
      const { data, error } = await supabase
        .from("orders")
        .select(`
          *,
          order_items(
            *,
            product:products(name, price)
          ),
          bookings(
            *,
            room:rooms(name, description)
          ),
          booking_equipment(
            *,
            equipment:equipment(name, description)
          ),
          profiles!fk_orders_profiles(first_name, last_name, email)
        `)
        .eq("user_id", userId)
        .order("created_at", { ascending: false });
        
      if (error) {
        console.error("❌ Erro ao buscar pedidos:", error);
        throw error;
      }
      
      console.log("✅ Pedidos carregados:", data?.length || 0, "pedidos");
      console.log("📄 Dados:", data);
      
      return data as UnifiedOrder[];
    },
    enabled: !!userId,
    refetchInterval: 30000,
  });

  // Separate orders by type
  const productOrders = allOrders.filter(order => 
    order.order_items && order.order_items.length > 0
  );
  
  const roomOrders = allOrders.filter(order => 
    order.bookings && order.bookings.length > 0
  );
  
  const equipmentOrders = allOrders.filter(order => 
    order.booking_equipment && order.booking_equipment.length > 0
  );

  // Check payment status mutation
  const checkPaymentStatus = useMutation({
    mutationFn: async (orderId: string) => {
      const { data, error } = await supabase.functions.invoke('check-payment-status', {
        body: { orderId }
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["unified-orders", userId] });
      toast({
        title: data.updated ? "Status atualizado" : "Status verificado",
        description: data.message || "Verificação concluída",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao consultar status",
        description: error.message || "Erro desconhecido",
        variant: "destructive",
      });
    }
  });

  // Request refund mutation
  const requestRefund = useMutation({
    mutationFn: async ({ orderId, reason }: { orderId: string, reason?: string }) => {
      const { data, error } = await supabase.functions.invoke('payment-refund', {
        body: { orderId, reason }
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["unified-orders", userId] });
      toast({
        title: data.success ? "Estorno solicitado" : "Erro no estorno",
        description: data.message,
        variant: data.success ? "default" : "destructive",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao solicitar estorno",
        description: error.message || "Erro desconhecido",
        variant: "destructive",
      });
    }
  });

  return {
    allOrders,
    productOrders,
    roomOrders,
    equipmentOrders,
    isLoading,
    refetch,
    checkPaymentStatus,
    requestRefund
  };
};