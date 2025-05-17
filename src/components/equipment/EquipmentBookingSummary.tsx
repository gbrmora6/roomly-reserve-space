
import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { formatCurrency } from "@/utils/formatCurrency";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function EquipmentBookingSummary({
  equipment,
  quantity,
  startTime,
  endTime,
  totalPrice,
  onConfirm,
  loading,
  onCancel,
}: {
  equipment: any;
  quantity: number;
  startTime: Date;
  endTime: Date;
  totalPrice: number;
  onConfirm: () => void;
  loading: boolean;
  onCancel: () => void;
}) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [selectedProducts, setSelectedProducts] = useState<{ id: string; quantity: number }[]>([]);

  // Fetch related products
  const { data: relatedProducts } = useQuery({
    queryKey: ["related-products", equipment?.id],
    queryFn: async () => {
      if (!equipment?.id) return [];

      const { data, error } = await supabase
        .from("products")
        .select("id, name, price, quantity")
        .eq("equipment_id", equipment.id)
        .gt("quantity", 0);

      if (error) {
        console.error("Error fetching related products:", error);
        return [];
      }
      return data || [];
    },
    enabled: !!equipment?.id,
  });

  const handleProductSelection = (productId: string, checked: boolean) => {
    if (checked) {
      setSelectedProducts([...selectedProducts, { id: productId, quantity: 1 }]);
    } else {
      setSelectedProducts(selectedProducts.filter(p => p.id !== productId));
    }
  };

  const handleProductQuantityChange = (productId: string, quantity: number) => {
    const newSelectedProducts = selectedProducts.map(p => 
      p.id === productId ? { ...p, quantity: Math.max(1, quantity) } : p
    );
    setSelectedProducts(newSelectedProducts);
  };

  const handleCheckout = async () => {
    if (!user) {
      toast({
        variant: "destructive",
        title: "É necessário estar logado",
        description: "Faça login para continuar com a compra.",
      });
      return;
    }

    if (selectedProducts.length === 0) {
      onConfirm();
      return;
    }

    try {
      const { data, error } = await supabase.functions.invoke("stripe-integration", {
        body: {
          action: "create-checkout",
          userId: user.id,
          productIds: selectedProducts.map(p => p.id),
          quantities: selectedProducts.map(p => p.quantity),
        },
      });

      if (error) throw error;

      if (data?.url) {
        // Create the equipment booking first
        await onConfirm();
        
        // Then redirect to Stripe checkout
        window.open(data.url, '_blank');
      }
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: "Erro ao processar pagamento",
        description: err.message || "Ocorreu um erro ao processar o pagamento.",
      });
    }
  };

  const calculateProductsTotal = () => {
    if (!relatedProducts || relatedProducts.length === 0 || selectedProducts.length === 0) return 0;
    
    return selectedProducts.reduce((sum, selectedProduct) => {
      const product = relatedProducts.find(p => p.id === selectedProduct.id);
      if (!product) return sum;
      return sum + (product.price * selectedProduct.quantity);
    }, 0);
  };

  const productsTotal = calculateProductsTotal();
  const formatDate = (date: Date) => date.toLocaleString("pt-BR");

  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="p-4 space-y-4">
          <h3 className="text-lg font-semibold">Resumo da Reserva</h3>
          
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Equipamento:</span>
              <span>{equipment?.name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Quantidade:</span>
              <span>{quantity}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Data e hora inicial:</span>
              <span>{formatDate(startTime)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Data e hora final:</span>
              <span>{formatDate(endTime)}</span>
            </div>
            <div className="flex justify-between font-semibold">
              <span>Total da reserva:</span>
              <span>{formatCurrency(totalPrice)}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {relatedProducts && relatedProducts.length > 0 && (
        <Card>
          <CardContent className="p-4 space-y-4">
            <h3 className="text-lg font-semibold">Produtos Relacionados</h3>
            <p className="text-sm text-muted-foreground">
              Deseja adicionar algum destes produtos à sua reserva?
            </p>
            
            <div className="space-y-4 mt-2">
              {relatedProducts.map(product => (
                <div key={product.id} className="flex items-start space-x-3">
                  <Checkbox 
                    id={`product-${product.id}`}
                    onCheckedChange={(checked) => 
                      handleProductSelection(product.id, checked === true)
                    }
                  />
                  <div className="flex-1 space-y-1">
                    <div className="flex justify-between">
                      <Label htmlFor={`product-${product.id}`}>{product.name}</Label>
                      <span className="font-medium">{formatCurrency(product.price)}</span>
                    </div>
                    
                    {selectedProducts.some(p => p.id === product.id) && (
                      <div className="flex items-center space-x-2 mt-2">
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => {
                            const current = selectedProducts.find(p => p.id === product.id)?.quantity || 1;
                            handleProductQuantityChange(product.id, current - 1);
                          }}
                        >
                          -
                        </Button>
                        <span className="w-8 text-center">
                          {selectedProducts.find(p => p.id === product.id)?.quantity || 1}
                        </span>
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => {
                            const current = selectedProducts.find(p => p.id === product.id)?.quantity || 1;
                            const max = product.quantity || 1;
                            handleProductQuantityChange(product.id, Math.min(current + 1, max));
                          }}
                        >
                          +
                        </Button>
                        <span className="text-xs text-muted-foreground ml-2">
                          (disponível: {product.quantity})
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              ))}

              {selectedProducts.length > 0 && (
                <div className="pt-2 mt-4 border-t border-border">
                  <div className="flex justify-between font-semibold">
                    <span>Total produtos:</span>
                    <span>{formatCurrency(productsTotal)}</span>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {selectedProducts.length > 0 && (
        <Card>
          <CardContent className="p-4">
            <div className="flex justify-between font-semibold text-lg">
              <span>Total geral:</span>
              <span>{formatCurrency(totalPrice + productsTotal)}</span>
            </div>
          </CardContent>
        </Card>
      )}

      <CardFooter className="flex justify-between px-0">
        <Button
          variant="outline"
          onClick={onCancel}
          disabled={loading}
        >
          Cancelar
        </Button>
        <Button
          onClick={handleCheckout}
          disabled={loading}
          className="bg-roomly-600 hover:bg-roomly-700"
        >
          {loading ? "Processando..." : "Confirmar Reserva"}
        </Button>
      </CardFooter>
    </div>
  );
}
