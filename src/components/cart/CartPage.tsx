
import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Trash2, ShoppingCart, Package, MapPin, Plus, Minus } from "lucide-react";
import { useCart } from "@/hooks/useCart";
import { formatCurrency } from "@/utils/formatCurrency";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import CartTimer from "./CartTimer";
import ProductSuggestions from "./ProductSuggestions";

const CartPage: React.FC = () => {
  const navigate = useNavigate();
  const { cartItems, cartTotal, removeFromCart, updateCart, refetch } = useCart();

  // Buscar detalhes dos itens do carrinho
  const { data: itemsWithDetails, isLoading } = useQuery({
    queryKey: ["cart-details", cartItems],
    queryFn: async () => {
      if (!cartItems.length) return [];

      const roomIds = cartItems.filter(item => item.item_type === 'room').map(item => item.item_id);
      const equipmentIds = cartItems.filter(item => item.item_type === 'equipment').map(item => item.item_id);
      const productIds = cartItems.filter(item => item.item_type === 'product').map(item => item.item_id);

      const [roomsData, equipmentsData, productsData] = await Promise.all([
        roomIds.length ? supabase.from('rooms').select('*').in('id', roomIds) : { data: [] },
        equipmentIds.length ? supabase.from('equipment').select('*').in('id', equipmentIds) : { data: [] },
        productIds.length ? supabase.from('products').select('*').in('id', productIds) : { data: [] }
      ]);

      return cartItems.map(item => {
        let details;
        switch (item.item_type) {
          case 'room':
            details = roomsData.data?.find(room => room.id === item.item_id);
            break;
          case 'equipment':
            details = equipmentsData.data?.find(eq => eq.id === item.item_id);
            break;
          case 'product':
            details = productsData.data?.find(prod => prod.id === item.item_id);
            break;
        }
        return { ...item, details };
      });
    },
    enabled: cartItems.length > 0,
  });

  // Auto refresh para verificar expiração
  useEffect(() => {
    const interval = setInterval(() => {
      refetch();
    }, 10000); // Verificar a cada 10 segundos

    return () => clearInterval(interval);
  }, [refetch]);

  const handleItemExpired = () => {
    toast({
      variant: "destructive",
      title: "Item expirado",
      description: "Um item do seu carrinho expirou e foi removido automaticamente.",
    });
    refetch();
  };

  const handleCheckout = () => {
    if (cartItems.length === 0) {
      toast({
        variant: "destructive",
        title: "Carrinho vazio",
        description: "Adicione itens ao carrinho antes de finalizar a compra.",
      });
      return;
    }
    navigate("/checkout");
  };

  const renderCartItem = (item: any) => {
    if (!item.details) return null;

    const isTimeSensitive = item.item_type === 'room' || item.item_type === 'equipment';
    const metadata = item.metadata || {};

    return (
      <Card key={item.id} className="mb-4">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-lg">
              {item.item_type === 'room' && <MapPin className="h-4 w-4" />}
              {item.item_type === 'equipment' && <Package className="h-4 w-4" />}
              {item.item_type === 'product' && <ShoppingCart className="h-4 w-4" />}
              {item.details.name}
            </CardTitle>
            
            <div className="flex items-center gap-2">
              {isTimeSensitive && (
                <CartTimer 
                  expiresAt={item.expires_at} 
                  onExpired={handleItemExpired}
                />
              )}
              <Button
                variant="destructive"
                size="sm"
                onClick={() => removeFromCart(item.id)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {item.details.description && (
            <p className="text-sm text-muted-foreground">
              {item.details.description}
            </p>
          )}

          {/* Detalhes específicos do tipo */}
          {(item.item_type === 'room' || item.item_type === 'equipment') && (
            <div className="space-y-2">
              {metadata.date && (
                <div className="flex justify-between text-sm">
                  <span>Data:</span>
                  <span>{metadata.date}</span>
                </div>
              )}
              {metadata.start_time_display && metadata.end_time_display && (
                <div className="flex justify-between text-sm">
                  <span>Horário:</span>
                  <span>{metadata.start_time_display} - {metadata.end_time_display}</span>
                </div>
              )}
              {metadata.duration && (
                <div className="flex justify-between text-sm">
                  <span>Duração:</span>
                  <span>{metadata.duration}h</span>
                </div>
              )}
            </div>
          )}

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-sm">Quantidade:</span>
              {item.item_type === 'product' ? (
                <div className="flex items-center gap-1">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => updateCart({ itemId: item.id, quantity: Math.max(1, item.quantity - 1) })}
                    disabled={item.quantity <= 1}
                  >
                    <Minus className="h-3 w-3" />
                  </Button>
                  <span className="px-2">{item.quantity}</span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => updateCart({ itemId: item.id, quantity: item.quantity + 1 })}
                  >
                    <Plus className="h-3 w-3" />
                  </Button>
                </div>
              ) : (
                <Badge variant="secondary">{item.quantity}</Badge>
              )}
            </div>

            <div className="text-right">
              <p className="text-lg font-bold">
                {formatCurrency(item.price * item.quantity)}
              </p>
              {item.quantity > 1 && (
                <p className="text-xs text-muted-foreground">
                  {formatCurrency(item.price)} cada
                </p>
              )}
            </div>
          </div>

          {/* Produtos relacionados para equipamentos */}
          {item.item_type === 'equipment' && (
            <ProductSuggestions equipmentId={item.item_id} />
          )}
        </CardContent>
      </Card>
    );
  };

  if (isLoading) {
    return (
      <div className="py-8">
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="py-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">Carrinho de Compras</h1>

        {itemsWithDetails && itemsWithDetails.length > 0 ? (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Lista de itens */}
            <div className="lg:col-span-2">
              {itemsWithDetails.map(renderCartItem)}
            </div>

            {/* Resumo do pedido */}
            <div className="lg:col-span-1">
              <Card className="sticky top-4">
                <CardHeader>
                  <CardTitle>Resumo do Pedido</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-between">
                    <span>Subtotal:</span>
                    <span>{formatCurrency(cartTotal)}</span>
                  </div>

                  <Separator />

                  <div className="flex justify-between font-bold text-lg">
                    <span>Total:</span>
                    <span>{formatCurrency(cartTotal)}</span>
                  </div>

                  <Button 
                    onClick={handleCheckout}
                    className="w-full"
                    size="lg"
                    disabled={cartItems.length === 0}
                  >
                    Finalizar Compra
                  </Button>

                  <p className="text-xs text-muted-foreground text-center">
                    * Salas e equipamentos são reservados temporariamente por 15 minutos
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        ) : (
          <div className="text-center py-20">
            <ShoppingCart className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
            <h2 className="text-2xl font-semibold mb-2">Seu carrinho está vazio</h2>
            <p className="text-muted-foreground mb-6">
              Adicione salas, equipamentos ou produtos para começar
            </p>
            <div className="space-x-4">
              <Button onClick={() => navigate("/rooms")}>
                Ver Salas
              </Button>
              <Button variant="outline" onClick={() => navigate("/equipment")}>
                Ver Equipamentos
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CartPage;
