
import React, { useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import MainLayout from "@/components/layout/MainLayout";
import { useAuth } from "@/contexts/AuthContext";
import { useCart } from "@/hooks/useCart";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ShoppingBag, ShoppingCart, ChevronLeft } from "lucide-react";
import { Input } from "@/components/ui/input";
import { formatCurrency } from "@/utils/formatCurrency";

const ProductDetail = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const { addToCart, isLoading: isAddingToCart } = useCart();
  const navigate = useNavigate();
  const [quantity, setQuantity] = useState(1);

  const { data: product, isLoading } = useQuery({
    queryKey: ["product", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select(`
          *,
          equipment:equipment(name)
        `)
        .eq("id", id)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  const handleAddToCart = () => {
    if (!user) {
      navigate("/login", { state: { returnTo: `/store/product/${id}` } });
      return;
    }
    
    if (!id) return;

    addToCart('product', id, quantity, {});
  };

  const handleQuantityChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value);
    if (value > 0) {
      setQuantity(value);
    }
  };

  return (
    <MainLayout>
      <div className="container py-10">
        <div className="mb-6">
          <Button variant="ghost" asChild className="pl-0">
            <Link to="/store">
              <ChevronLeft className="mr-2 h-4 w-4" />
              Voltar para a loja
            </Link>
          </Button>
        </div>

        {isLoading ? (
          <div className="flex justify-center my-20">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          </div>
        ) : product ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="bg-muted rounded-lg flex items-center justify-center h-[400px]">
              <ShoppingBag className="h-32 w-32 text-muted-foreground/30" />
            </div>
            
            <div className="space-y-6">
              <div>
                <h1 className="text-3xl font-bold">{product.name}</h1>
                <p className="text-2xl font-bold text-primary mt-2">
                  {formatCurrency(product.price)}
                </p>
              </div>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg">Detalhes do produto</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <h3 className="font-medium">Descrição</h3>
                    <p className="text-muted-foreground">
                      {product.description || "Não há descrição disponível para este produto."}
                    </p>
                  </div>

                  {product.model && (
                    <div>
                      <h3 className="font-medium">Modelo</h3>
                      <p className="text-muted-foreground">{product.model}</p>
                    </div>
                  )}

                  {product.equipment && (
                    <div>
                      <h3 className="font-medium">Equipamento relacionado</h3>
                      <p className="text-muted-foreground">{(product.equipment as any).name}</p>
                    </div>
                  )}

                  <div>
                    <h3 className="font-medium">Disponibilidade</h3>
                    <p className={`${product.quantity > 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {product.quantity > 0
                        ? `${product.quantity} unidades em estoque`
                        : "Fora de estoque"}
                    </p>
                  </div>
                </CardContent>
              </Card>

              <div className="pt-4 space-y-4">
                <div className="flex items-center space-x-4">
                  <div className="w-24">
                    <label htmlFor="quantity" className="text-sm font-medium mb-1 block">
                      Quantidade
                    </label>
                    <Input
                      id="quantity"
                      type="number"
                      min="1"
                      max={product.quantity || 999}
                      value={quantity}
                      onChange={handleQuantityChange}
                    />
                  </div>
                  <div className="text-muted-foreground text-sm">
                    {formatCurrency(product.price * quantity)}
                  </div>
                </div>

                <Button
                  onClick={handleAddToCart}
                  className="w-full"
                  size="lg"
                  disabled={isAddingToCart || product.quantity <= 0}
                >
                  <ShoppingCart className="mr-2 h-4 w-4" />
                  {isAddingToCart
                    ? "Adicionando..."
                    : product.quantity <= 0
                    ? "Fora de estoque"
                    : "Adicionar ao carrinho"}
                </Button>
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center py-20">
            <h2 className="text-2xl font-bold">Produto não encontrado</h2>
            <p className="text-muted-foreground mt-2">
              O produto que você está procurando não existe ou foi removido.
            </p>
            <Button asChild className="mt-4">
              <Link to="/store">Ver outros produtos</Link>
            </Button>
          </div>
        )}
      </div>
    </MainLayout>
  );
};

export default ProductDetail;
