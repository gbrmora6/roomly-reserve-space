
import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

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
}

export const useCart = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: cartItems = [], isLoading, refetch } = useQuery({
    queryKey: ["cart", user?.id],
    queryFn: async () => {
      if (!user) return [];
      
      const { data, error } = await supabase.rpc("get_cart", {
        p_user_id: user.id
      });

      if (error) throw error;
      return data as CartItem[];
    },
    enabled: !!user,
    refetchInterval: 30000, // Refresh a cada 30 segundos para verificar itens expirados
  });

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

      const { data, error } = await supabase.rpc("add_to_cart", {
        p_user_id: user.id,
        p_item_type: itemType,
        p_item_id: itemId,
        p_quantity: quantity,
        p_metadata: metadata || {}
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cart", user?.id] });
      toast({
        title: "Item adicionado ao carrinho",
        description: "O item foi adicionado com sucesso ao seu carrinho.",
      });
    },
    onError: (error) => {
      toast({
        variant: "destructive",
        title: "Erro ao adicionar item",
        description: error.message,
      });
    },
  });

  const removeFromCartMutation = useMutation({
    mutationFn: async (itemId: string) => {
      const { data, error } = await supabase.rpc("remove_from_cart", {
        p_id: itemId
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cart", user?.id] });
      toast({
        title: "Item removido",
        description: "O item foi removido do seu carrinho.",
      });
    },
    onError: (error) => {
      toast({
        variant: "destructive",
        title: "Erro ao remover item",
        description: error.message,
      });
    },
  });

  const updateCartMutation = useMutation({
    mutationFn: async ({ itemId, quantity }: { itemId: string; quantity: number }) => {
      const { data, error } = await supabase.rpc("update_cart", {
        p_id: itemId,
        p_quantity: quantity
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cart", user?.id] });
    },
    onError: (error) => {
      toast({
        variant: "destructive",
        title: "Erro ao atualizar item",
        description: error.message,
      });
    },
  });

  const clearCartMutation = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("Usuário não autenticado");

      const { data, error } = await supabase.rpc("clear_cart", {
        p_user_id: user.id
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cart", user?.id] });
      toast({
        title: "Carrinho limpo",
        description: "Todos os itens foram removidos do seu carrinho.",
      });
    },
    onError: (error) => {
      toast({
        variant: "destructive",
        title: "Erro ao limpar carrinho",
        description: error.message,
      });
    },
  });

  const cartTotal = cartItems.reduce((total, item) => {
    return total + (item.price * item.quantity);
  }, 0);

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
    updateCart: updateCartMutation.mutate,
    clearCart: clearCartMutation.mutate,
    refetch,
    isAddingToCart: addToCartMutation.isPending,
    isRemovingFromCart: removeFromCartMutation.isPending,
    isUpdatingCart: updateCartMutation.isPending,
    isClearingCart: clearCartMutation.isPending,
  };
};
