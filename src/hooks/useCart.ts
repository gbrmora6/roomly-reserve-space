import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface CartItem {
  id: string;
  user_id: string;
  item_type: string;
  item_id: string;
  quantity: number;
  price: number;
  metadata: any;
  created_at: string;
  expires_at?: string;
  reserved_booking_id?: string;
  reserved_equipment_booking_id?: string;
  branch_id: string;
}

export const useCart = () => {
  const { user } = useAuth();
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [cartCount, setCartCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);

  const fetchCartItems = async () => {
    if (!user) {
      setCartItems([]);
      setCartCount(0);
      return;
    }

    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('cart_items')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      setCartItems(data || []);
      setCartCount((data || []).length);
    } catch (error) {
      console.error('Error fetching cart:', error);
      toast.error('Erro ao carregar carrinho');
    } finally {
      setIsLoading(false);
    }
  };

  const addToCart = async (itemType: string, itemId: string, quantity: number = 1, metadata: any = {}) => {
    if (!user) {
      toast.error('Você precisa estar logado para adicionar ao carrinho');
      return false;
    }

    try {
      const { error } = await supabase
        .from('cart_items')
        .insert({
          user_id: user.id,
          item_type: itemType,
          item_id: itemId,
          quantity: quantity,
          price: 0, // Will be calculated by trigger
          metadata: metadata,
          branch_id: user.user_metadata?.branch_id || ''
        });

      if (error) throw error;

      await fetchCartItems();
      toast.success('Item adicionado ao carrinho!');
      return true;
    } catch (error: any) {
      console.error('Error adding to cart:', error);
      toast.error(`Erro ao adicionar ao carrinho: ${error.message}`);
      return false;
    }
  };

  const removeFromCart = async (itemId: string) => {
    try {
      const { error } = await supabase
        .from('cart_items')
        .delete()
        .eq('id', itemId);

      if (error) throw error;

      await fetchCartItems();
      toast.success('Item removido do carrinho');
      return true;
    } catch (error: any) {
      console.error('Error removing from cart:', error);
      toast.error(`Erro ao remover do carrinho: ${error.message}`);
      return false;
    }
  };

  const updateCart = async (itemId: string, quantity: number) => {
    try {
      const { error } = await supabase
        .from('cart_items')
        .update({ quantity })
        .eq('id', itemId);

      if (error) throw error;

      await fetchCartItems();
      return true;
    } catch (error: any) {
      console.error('Error updating cart:', error);
      toast.error(`Erro ao atualizar carrinho: ${error.message}`);
      return false;
    }
  };

  const clearCart = async () => {
    if (!user) return false;

    try {
      const { error } = await supabase
        .from('cart_items')
        .delete()
        .eq('user_id', user.id);

      if (error) throw error;

      setCartItems([]);
      setCartCount(0);
      toast.success('Carrinho limpo');
      return true;
    } catch (error: any) {
      console.error('Error clearing cart:', error);
      toast.error(`Erro ao limpar carrinho: ${error.message}`);
      return false;
    }
  };

  const getCartTotal = () => {
    return cartItems.reduce((total, item) => total + (item.price * item.quantity), 0);
  };

  useEffect(() => {
    if (user) {
      fetchCartItems();
    } else {
      setCartItems([]);
      setCartCount(0);
    }
  }, [user]);

  return {
    cartItems,
    cartCount,
    cartTotal: getCartTotal(),
    isLoading,
    addToCart,
    removeFromCart,
    updateCart,
    clearCart,
    fetchCartItems,
    getCartTotal,
    refetch: fetchCartItems
  };
};