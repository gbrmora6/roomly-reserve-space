
import React, { createContext, useContext, ReactNode } from 'react';
import { useCart as useCartHook, CartItem } from '@/hooks/useCart';

interface CartContextType {
  cartItems: CartItem[];
  cartCount: number;
  cartTotal: number;
  isLoading: boolean;
  addToCart: (params: {
    itemType: 'room' | 'equipment' | 'product';
    itemId: string;
    quantity: number;
    metadata?: any;
  }) => void;
  removeFromCart: (itemId: string) => void;
  updateCart: (itemId: string, quantity: number) => void;
  clearCart: () => void;
  refetch: () => void;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export const CartProvider = ({ children }: { children: ReactNode }) => {
  const cartHook = useCartHook();

  return (
    <CartContext.Provider value={cartHook}>
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const context = useContext(CartContext);
  if (context === undefined) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
};
