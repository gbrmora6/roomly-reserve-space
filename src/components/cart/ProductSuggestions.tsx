
import React from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus } from "lucide-react";
import { formatCurrency } from "@/utils/formatCurrency";
import { useCart } from "@/hooks/useCart";

interface ProductSuggestionsProps {
  equipmentId: string;
}

const ProductSuggestions: React.FC<ProductSuggestionsProps> = ({ equipmentId }) => {
  const { addToCart } = useCart();

  const { data: relatedProducts, isLoading } = useQuery({
    queryKey: ["related-products", equipmentId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("*")
        .eq("equipment_id", equipmentId)
        .eq("is_active", true);

      if (error) throw error;
      return data;
    },
  });

  const handleAddProduct = (productId: string, price: number) => {
    addToCart("product", productId, 1, {});
  };

  if (isLoading || !relatedProducts || relatedProducts.length === 0) {
    return null;
  }

  return (
    <Card className="mt-4 border-blue-200 bg-blue-50">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm text-blue-800">Produtos Relacionados</CardTitle>
        <CardDescription className="text-xs text-blue-600">
          Aproveite e adicione estes produtos ao seu carrinho
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-2">
        {relatedProducts.map((product) => (
          <div
            key={product.id}
            className="flex items-center justify-between p-2 bg-white rounded border"
          >
            <div className="flex-1">
              <p className="text-sm font-medium">{product.name}</p>
              <p className="text-xs text-muted-foreground">{product.description}</p>
              <p className="text-sm font-bold text-blue-600">
                {formatCurrency(product.price)}
              </p>
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleAddProduct(product.id, product.price)}
              className="ml-3"
            >
              <Plus className="h-3 w-3 mr-1" />
              Adicionar
            </Button>
          </div>
        ))}
      </CardContent>
    </Card>
  );
};

export default ProductSuggestions;
