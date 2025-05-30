
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
      
      console.log("Fetching cart for user:", user.id);
      
      const { data, error } = await supabase.rpc("get_cart", {
        p_user_id: user.id
      });

      if (error) {
        console.error("Error fetching cart:", error);
        throw error;
      }
      
      console.log("Cart data received:", data);
      return data as CartItem[];
    },
    enabled: !!user,
    refetchInterval: 30000,
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

      console.log("Adding to cart:", { 
        itemType, 
        itemId, 
        quantity, 
        metadata,
        userId: user.id 
      });

      // Ensure metadata is a valid object
      const validMetadata = metadata && typeof metadata === 'object' ? metadata : {};

      const { data, error } = await supabase.rpc("add_to_cart", {
        p_user_id: user.id,
        p_item_type: itemType,
        p_item_id: itemId,
        p_quantity: quantity,
        p_metadata: validMetadata
      });

      if (error) {
        console.error("Error adding to cart:", error);
        throw error;
      }
      
      console.log("Item added to cart successfully:", data);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cart", user?.id] });
      toast({
        title: "Item adicionado ao carrinho",
        description: "O item foi adicionado com sucesso ao seu carrinho.",
      });
    },
    onError: (error: any) => {
      console.error("Cart mutation error:", error);
      toast({
        variant: "destructive",
        title: "Erro ao adicionar item",
        description: error.message || "Erro desconhecido ao adicionar item ao carrinho",
      });
    },
  });

  const removeFromCartMutation = useMutation({
    mutationFn: async (itemId: string) => {
      console.log("Removing item from cart:", itemId);
      
      const { data, error } = await supabase
        .from("cart_items")
        .delete()
        .eq("id", itemId);

      if (error) {
        console.error("Error removing from cart:", error);
        throw error;
      }
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cart", user?.id] });
      toast({
        title: "Item removido",
        description: "O item foi removido do seu carrinho.",
      });
    },
    onError: (error: any) => {
      console.error("Remove from cart error:", error);
      toast({
        variant: "destructive",
        title: "Erro ao remover item",
        description: error.message,
      });
    },
  });

  const updateCartMutation = useMutation({
    mutationFn: async ({ itemId, quantity }: { itemId: string; quantity: number }) => {
      console.log("Updating cart item:", { itemId, quantity });
      
      const { data, error } = await supabase
        .from("cart_items")
        .update({ quantity })
        .eq("id", itemId);

      if (error) {
        console.error("Error updating cart:", error);
        throw error;
      }
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cart", user?.id] });
    },
    onError: (error: any) => {
      console.error("Update cart error:", error);
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

      console.log("Clearing cart for user:", user.id);

      const { data, error } = await supabase
        .from("cart_items")
        .delete()
        .eq("user_id", user.id);

      if (error) {
        console.error("Error clearing cart:", error);
        throw error;
      }
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cart", user?.id] });
      toast({
        title: "Carrinho limpo",
        description: "Todos os itens foram removidos do seu carrinho.",
      });
    },
    onError: (error: any) => {
      console.error("Clear cart error:", error);
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
