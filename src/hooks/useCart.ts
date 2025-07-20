
import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

// Interface que define a estrutura de um item do carrinho
export interface CartItem {
  id: string;
  user_id: string;
  item_type: 'room' | 'equipment' | 'product';
  item_id: string;
  quantity: number;
  price: number;
  metadata: any;
  created_at: string;
  expires_at: string;
  reserved_booking_id?: string;
  reserved_equipment_booking_id?: string;
  branch_id: string;
}

export const useCart = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Query para buscar itens do carrinho do usuário
  const { data: cartItems = [], isLoading, refetch } = useQuery({
    queryKey: ["cart", user?.id],
    queryFn: async () => {
      if (!user) return [];
      
      console.log("Buscando carrinho para usuário:", user.id);
      
      // Primeiro, executar limpeza de itens expirados de forma robusta
      try {
        console.log("Executando limpeza de itens expirados...");
        await (supabase as any).rpc("clean_expired_cart_items");
        console.log("Limpeza automática concluída com sucesso");
      } catch (error) {
        console.log("Nota: Erro na limpeza automática (continuando):", error);
        // Continue mesmo se a limpeza falhar para não bloquear o carrinho
      }
      
      // Chama a function do Supabase para buscar o carrinho
      const { data, error } = await (supabase as any).rpc("get_cart", {
        p_user_id: user.id
      });

      if (error) {
        console.error("Erro ao buscar carrinho:", error);
        throw error;
      }
      
      console.log("Dados do carrinho recebidos:", data);
      
      // Filtrar itens não expirados como medida adicional de segurança
      const now = new Date();
      const validItems = (data as CartItem[]).filter(item => {
        if (!item.expires_at) return true;
        const expiresAt = new Date(item.expires_at);
        const isValid = expiresAt > now;
        if (!isValid) {
          console.log("Item expirado encontrado no frontend:", item.id, "expirou em:", expiresAt);
        }
        return isValid;
      });
      
      console.log(`Retornando ${validItems.length} itens válidos de ${(data as CartItem[]).length} totais`);
      return validItems;
    },
    enabled: !!user,
    refetchInterval: 30000, // Atualiza a cada 30 segundos
  });

  // Mutation para adicionar item ao carrinho
  const addToCartMutation = useMutation({
    mutationFn: async ({
      itemType,
      itemId,
      quantity,
      metadata
    }: {
      itemType: 'room' | 'equipment' | 'product';
      itemId: string;
      quantity: number;
      metadata?: any;
    }) => {
      if (!user) throw new Error("Usuário não autenticado");

      console.log("Adicionando ao carrinho:", { 
        itemType, 
        itemId, 
        quantity, 
        metadata,
        userId: user.id 
      });

      // Garantir que metadata seja um objeto válido
      const validMetadata = metadata && typeof metadata === 'object' ? metadata : {};

      // Chama a function do Supabase para adicionar ao carrinho
      const { data, error } = await (supabase as any).rpc("add_to_cart", {
        p_user_id: user.id,
        p_item_type: itemType,
        p_item_id: itemId,
        p_quantity: quantity,
        p_metadata: validMetadata
      });

      if (error) {
        console.error("Erro ao adicionar ao carrinho:", error);
        throw error;
      }
      
      console.log("Item adicionado ao carrinho com sucesso:", data);
      return data;
    },
    onSuccess: () => {
      // Invalidar cache para atualizar a lista
      queryClient.invalidateQueries({ queryKey: ["cart", user?.id] });
      toast({
        title: "Item adicionado ao carrinho",
        description: "O item foi adicionado com sucesso ao seu carrinho.",
      });
    },
    onError: (error: any) => {
      console.error("Erro na mutation do carrinho:", error);
      toast({
        variant: "destructive",
        title: "Erro ao adicionar item",
        description: error.message || "Erro desconhecido ao adicionar item ao carrinho",
      });
    },
  });

  // Mutation para remover item do carrinho
  const removeFromCartMutation = useMutation({
    mutationFn: async (itemId: string) => {
      console.log("Removendo item do carrinho:", itemId);
      
      // Buscar detalhes do item antes de remover para debug
      const item = cartItems.find(item => item.id === itemId);
      console.log("Detalhes do item a ser removido:", item);
      
      // Chama a function do Supabase para remover do carrinho
      const { data, error } = await (supabase as any).rpc("remove_from_cart", {
        p_id: itemId
      });

      if (error) {
        console.error("Erro ao remover do carrinho:", error);
        console.error("Detalhes do erro:", {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code
        });
        throw error;
      }
      
      console.log("Resultado da remoção:", data);
      return data;
    },
    onSuccess: () => {
      // Invalidar cache para atualizar a lista
      queryClient.invalidateQueries({ queryKey: ["cart", user?.id] });
      toast({
        title: "Item removido",
        description: "O item foi removido do seu carrinho.",
      });
    },
    onError: (error: any) => {
      console.error("Erro ao remover do carrinho:", error);
      toast({
        variant: "destructive",
        title: "Erro ao remover item",
        description: error.message,
      });
    },
  });

  // Mutation para atualizar quantidade no carrinho
  const updateCartMutation = useMutation({
    mutationFn: async ({ itemId, quantity }: { itemId: string; quantity: number }) => {
      console.log("Atualizando item do carrinho:", { itemId, quantity });
      
      // Chama a function do Supabase para atualizar o carrinho
      const { data, error } = await (supabase as any).rpc("update_cart", {
        p_id: itemId,
        p_quantity: quantity
      });

      if (error) {
        console.error("Erro ao atualizar carrinho:", error);
        throw error;
      }
      return data;
    },
    onSuccess: () => {
      // Invalidar cache para atualizar a lista
      queryClient.invalidateQueries({ queryKey: ["cart", user?.id] });
    },
    onError: (error: any) => {
      console.error("Erro ao atualizar carrinho:", error);
      toast({
        variant: "destructive",
        title: "Erro ao atualizar item",
        description: error.message,
      });
    },
  });

  // Mutation para limpar carrinho
  const clearCartMutation = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("Usuário não autenticado");

      console.log("Limpando carrinho para usuário:", user.id);

      // Chama a function do Supabase para limpar o carrinho
      const { data, error } = await (supabase as any).rpc("clear_cart", {
        p_user_id: user.id
      });

      if (error) {
        console.error("Erro ao limpar carrinho:", error);
        throw error;
      }
      return data;
    },
    onSuccess: () => {
      // Invalidar cache para atualizar a lista
      queryClient.invalidateQueries({ queryKey: ["cart", user?.id] });
      toast({
        title: "Carrinho limpo",
        description: "Todos os itens foram removidos do seu carrinho.",
      });
    },
    onError: (error: any) => {
      console.error("Erro ao limpar carrinho:", error);
      toast({
        variant: "destructive",
        title: "Erro ao limpar carrinho",
        description: error.message,
      });
    },
  });

  // Calcular o total do carrinho
  const cartTotal = cartItems.reduce((total, item) => {
    return total + (item.price * item.quantity);
  }, 0);

  // Calcular a quantidade total de itens
  const cartCount = cartItems.reduce((count, item) => {
    return count + item.quantity;
  }, 0);

  return {
    cartItems,
    cartTotal,
    cartCount,
    isLoading,
    addToCart: addToCartMutation.mutate,
    removeFromCart: removeFromCartMutation.mutate,
    updateCart: (itemId: string, quantity: number) => updateCartMutation.mutate({ itemId, quantity }),
    clearCart: clearCartMutation.mutate,
    refetch,
    isAddingToCart: addToCartMutation.isPending,
    isRemovingFromCart: removeFromCartMutation.isPending,
    isUpdatingCart: updateCartMutation.isPending,
    isClearingCart: clearCartMutation.isPending,
  };
};
