import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export const useOrders = (userId: string | undefined) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: productOrders = [], isLoading, refetch } = useQuery({
    queryKey: ["my-product-orders", userId],
    queryFn: async () => {
      if (!userId) return [];
      const { data, error } = await supabase
        .from("orders")
        .select(`
          *, 
          order_items(*, product:products(name, price)),
          payment_details(*),
          invoice_url,
          invoice_uploaded_at,
          invoice_uploaded_by
        `)
        .eq("user_id", userId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!userId,
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  // Função para consultar status do pagamento
  const checkPaymentStatus = useMutation({
    mutationFn: async (orderId: string) => {
      const { data, error } = await supabase.functions.invoke('payment-status', {
        body: { orderId }
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-product-orders", userId] });
      toast({
        title: "Status atualizado",
        description: "Status do pagamento foi atualizado",
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

  // Função para solicitar estorno
  const requestRefund = useMutation({
    mutationFn: async ({ orderId, reason }: { orderId: string, reason?: string }) => {
      const { data, error } = await supabase.functions.invoke('payment-refund', {
        body: { orderId, reason }
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["my-product-orders", userId] });
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
    productOrders, 
    isLoading,
    refetch,
    checkPaymentStatus,
    requestRefund
  };
};