
import React from "react";
import { useCart } from "@/hooks/useCart";
import { useAuth } from "@/contexts/AuthContext";
import MainLayout from "@/components/layout/MainLayout";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Trash2, Plus, Minus, ShoppingBag } from "lucide-react";
import { formatCurrency } from "@/utils/formatCurrency";
import { Link, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const CartPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const {
    cartItems,
    cartTotal,
    cartCount,
    isLoading,
    removeFromCart,
    updateCart,
    clearCart,
    isRemovingFromCart,
    isUpdatingCart,
    isClearingCart,
  } = useCart();

  // Buscar detalhes dos itens
  const { data: itemDetails } = useQuery({
    queryKey: ["cart-details", cartItems],
    queryFn: async () => {
      const details = await Promise.all(
        cartItems.map(async (item) => {
          let itemData;
          switch (item.item_type) {
            case 'room':
              const { data: room } = await supabase
                .from("rooms")
                .select("name, description")
                .eq("id", item.item_id)
                .single();
              itemData = room;
              break;
            case 'equipment':
              const { data: equipment } = await supabase
                .from("equipment")
                .select("name, description")
                .eq("id", item.item_id)
                .single();
              itemData = equipment;
              break;
            case 'product':
              const { data: product } = await supabase
                .from("products")
                .select("name, description")
                .eq("id", item.item_id)
                .single();
              itemData = product;
              break;
            default:
              itemData = null;
          }
          return { ...item, details: itemData };
        })
      );
      return details;
    },
    enabled: cartItems.length > 0,
  });

  const handleQuantityChange = (itemId: string, newQuantity: number) => {
    if (newQuantity <= 0) {
      removeFromCart(itemId);
    } else {
      updateCart({ itemId, quantity: newQuantity });
    }
  };

  const handleCheckout = async () => {
    // Implementar checkout com Stripe
    navigate("/checkout");
  };

  if (!user) {
    return (
      <MainLayout>
        <div className="container py-10">
          <div className="text-center">
            <h1 className="text-2xl font-bold mb-4">Faça login para ver seu carrinho</h1>
            <Button asChild>
              <Link to="/login">Fazer Login</Link>
            </Button>
          </div>
        </div>
      </MainLayout>
    );
  }

  if (isLoading) {
    return (
      <MainLayout>
        <div className="container py-10">
          <div className="flex justify-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          </div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="container py-10">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold">Meu Carrinho</h1>
          {cartCount > 0 && (
            <Button
              variant="outline"
              onClick={() => clearCart()}
              disabled={isClearingCart}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Limpar Carrinho
            </Button>
          )}
        </div>

        {cartCount === 0 ? (
          <div className="text-center py-20">
            <ShoppingBag className="mx-auto h-16 w-16 text-muted-foreground/50 mb-4" />
            <h2 className="text-xl font-medium mb-2">Seu carrinho está vazio</h2>
            <p className="text-muted-foreground mb-6">
              Adicione alguns itens para começar suas compras
            </p>
            <div className="flex gap-4 justify-center">
              <Button asChild>
                <Link to="/rooms">Ver Salas</Link>
              </Button>
              <Button variant="outline" asChild>
                <Link to="/equipment">Ver Equipamentos</Link>
              </Button>
              <Button variant="outline" asChild>
                <Link to="/store">Ver Produtos</Link>
              </Button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-4">
              {itemDetails?.map((item) => (
                <Card key={item.id}>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <h3 className="font-medium">
                          {item.details?.name || `${item.item_type} (ID: ${item.item_id})`}
                        </h3>
                        <p className="text-sm text-muted-foreground mt-1">
                          {item.details?.description || `Tipo: ${item.item_type}`}
                        </p>
                        <p className="text-sm font-medium mt-2">
                          {formatCurrency(item.price)} cada
                        </p>
                        {item.metadata && Object.keys(item.metadata).length > 0 && (
                          <div className="mt-2 text-xs text-muted-foreground">
                            {JSON.stringify(item.metadata)}
                          </div>
                        )}
                      </div>
                      
                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleQuantityChange(item.id, item.quantity - 1)}
                            disabled={isUpdatingCart}
                          >
                            <Minus className="h-3 w-3" />
                          </Button>
                          <span className="w-8 text-center">{item.quantity}</span>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleQuantityChange(item.id, item.quantity + 1)}
                            disabled={isUpdatingCart}
                          >
                            <Plus className="h-3 w-3" />
                          </Button>
                        </div>
                        
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeFromCart(item.id)}
                          disabled={isRemovingFromCart}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            <div className="lg:col-span-1">
              <Card className="sticky top-4">
                <CardHeader>
                  <CardTitle>Resumo do Pedido</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span>Subtotal ({cartCount} {cartCount === 1 ? 'item' : 'itens'})</span>
                      <span>{formatCurrency(cartTotal)}</span>
                    </div>
                    <div className="border-t pt-2">
                      <div className="flex justify-between font-medium">
                        <span>Total</span>
                        <span>{formatCurrency(cartTotal)}</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
                <CardFooter>
                  <Button 
                    className="w-full" 
                    onClick={handleCheckout}
                    disabled={cartCount === 0}
                  >
                    Finalizar Compra
                  </Button>
                </CardFooter>
              </Card>
            </div>
          </div>
        )}
      </div>
    </MainLayout>
  );
};

export default CartPage;
