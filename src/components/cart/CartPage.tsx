
import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Trash2, ShoppingCart, Plus, Minus } from "lucide-react";
import { useCart } from "@/hooks/useCart";
import { formatCurrency } from "@/utils/formatCurrency";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import CartTimer from "./CartTimer";
import ProductSuggestions from "./ProductSuggestions";
import { CartItemImage } from "./CartItemImage";
import { CartItemNotes } from "./CartItemNotes";

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
    }, 10000);

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
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-4 flex-1">
              <CartItemImage 
                itemType={item.item_type}
                itemName={item.details.name}
              />
              
              <div className="flex-1">
                <CardTitle className="text-lg mb-1">
                  {item.details.name}
                </CardTitle>
                
                {item.details.description && (
                  <p className="text-sm text-muted-foreground mb-2">
                    {item.details.description}
                  </p>
                )}

                <div className="flex items-center gap-2 mb-2">
                  <Badge 
                    variant={
                      item.item_type === 'room' ? 'default' : 
                      item.item_type === 'equipment' ? 'secondary' : 
                      'outline'
                    }
                  >
                    {item.item_type === 'room' ? 'Sala' : 
                     item.item_type === 'equipment' ? 'Equipamento' : 
                     'Produto'}
                  </Badge>
                  
                  {isTimeSensitive && (
                    <CartTimer 
                      expiresAt={item.expires_at} 
                      onExpired={handleItemExpired}
                    />
                  )}
                </div>
              </div>
            </div>
            
            <Button
              variant="destructive"
              size="sm"
              onClick={() => removeFromCart(item.id)}
              className="ml-2"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Detalhes específicos do tipo */}
          {(item.item_type === 'room' || item.item_type === 'equipment') && (
            <div className="bg-gray-50 rounded-lg p-3 space-y-2">
              {metadata.date && (
                <div className="flex justify-between text-sm">
                  <span className="font-medium">Data:</span>
                  <span>{metadata.date}</span>
                </div>
              )}
              {metadata.start_time_display && metadata.end_time_display && (
                <div className="flex justify-between text-sm">
                  <span className="font-medium">Horário:</span>
                  <span>{metadata.start_time_display} - {metadata.end_time_display}</span>
                </div>
              )}
              {metadata.duration && (
                <div className="flex justify-between text-sm">
                  <span className="font-medium">Duração:</span>
                  <span>{metadata.duration}h</span>
                </div>
              )}
            </div>
          )}

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <span className="text-sm font-medium">Quantidade:</span>
              {item.item_type === 'product' ? (
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => updateCart({ itemId: item.id, quantity: Math.max(1, item.quantity - 1) })}
                    disabled={item.quantity <= 1}
                    className="h-8 w-8 p-0"
                  >
                    <Minus className="h-3 w-3" />
                  </Button>
                  <span className="w-8 text-center font-medium">{item.quantity}</span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => updateCart({ itemId: item.id, quantity: item.quantity + 1 })}
                    className="h-8 w-8 p-0"
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

          {/* Campo de observações para reservas */}
          {(item.item_type === 'room' || item.item_type === 'equipment') && (
            <CartItemNotes 
              itemId={item.id} 
              currentNotes={metadata.notes} 
            />
          )}

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
      <div className="container mx-auto py-8">
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 py-8">
      <div className="container mx-auto px-6">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">Carrinho de Compras</h1>
          <div className="w-24 h-1 bg-gradient-to-r from-primary to-primary/60 rounded-full mx-auto"></div>
        </div>

        {itemsWithDetails && itemsWithDetails.length > 0 ? (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Lista de itens */}
            <div className="lg:col-span-2 space-y-6">
              {itemsWithDetails.map(renderCartItem)}
            </div>

            {/* Resumo do pedido */}
            <div className="lg:col-span-1">
              <div className="sticky top-24 bg-white/70 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 overflow-hidden">
                <div className="bg-gradient-to-r from-primary to-primary/80 text-white p-6">
                  <h3 className="text-xl font-bold">Resumo do Pedido</h3>
                </div>
                <div className="p-6 space-y-4">
                  <div className="space-y-3">
                    <div className="flex justify-between text-gray-600">
                      <span>Itens ({cartItems.length}):</span>
                      <span className="font-medium">{formatCurrency(cartTotal)}</span>
                    </div>
                  </div>

                  <div className="border-t border-gray-200 pt-4">
                    <div className="flex justify-between font-bold text-xl text-gray-900">
                      <span>Total:</span>
                      <span className="text-primary">{formatCurrency(cartTotal)}</span>
                    </div>
                  </div>

                  <Button 
                    onClick={handleCheckout}
                    className="w-full bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 text-white shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 py-4"
                    size="lg"
                    disabled={cartItems.length === 0}
                  >
                    Finalizar Compra ({cartItems.length} {cartItems.length === 1 ? 'item' : 'itens'})
                  </Button>

                  <div className="text-xs text-gray-500 text-center space-y-1 mt-4">
                    <p>🔒 Salas e equipamentos reservados por 15 minutos</p>
                    <p>📦 Produtos físicos sem limite de tempo</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center py-20">
            <div className="mb-8">
              <div className="w-24 h-24 mx-auto bg-gradient-to-br from-gray-200 to-gray-300 rounded-full flex items-center justify-center mb-4">
                <ShoppingCart className="h-12 w-12 text-gray-400" />
              </div>
            </div>
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Carrinho Vazio</h2>
            <p className="text-xl text-gray-600 mb-8 max-w-md mx-auto">
              Que tal adicionar alguns itens ao seu carrinho?
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button onClick={() => navigate("/rooms")} size="lg" className="bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 transform hover:scale-105 transition-all duration-300">
                Ver Salas
              </Button>
              <Button variant="outline" onClick={() => navigate("/equipment")} size="lg" className="border-2 hover:bg-gray-50 transform hover:scale-105 transition-all duration-300">
                Ver Equipamentos
              </Button>
              <Button variant="outline" onClick={() => navigate("/store")} size="lg" className="border-2 hover:bg-gray-50 transform hover:scale-105 transition-all duration-300">
                Ver Produtos
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CartPage;
