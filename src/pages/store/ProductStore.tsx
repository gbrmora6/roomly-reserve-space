
import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import MainLayout from "@/components/layout/MainLayout";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Link } from "react-router-dom";
import { ShoppingBag, Search } from "lucide-react";
import { formatCurrency } from "@/utils/formatCurrency";

const ProductStore = () => {
  const [searchTerm, setSearchTerm] = useState("");

  const { data: products, isLoading } = useQuery({
    queryKey: ["store-products"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("*")
        .eq("is_active", true)
        .order("name");

      if (error) throw error;
      return data || [];
    },
  });

  const filteredProducts = products?.filter((product) =>
    product.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    (product.description && product.description.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <MainLayout>
      <div className="container py-10">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold">Loja de Produtos</h1>
            <p className="text-muted-foreground mt-1">
              Encontre os melhores produtos para suas necessidades
            </p>
          </div>
          <div className="relative w-64">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar produtos..."
              className="pl-8"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        {isLoading ? (
          <div className="flex justify-center my-20">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          </div>
        ) : filteredProducts && filteredProducts.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredProducts.map((product) => (
              <Card key={product.id} className="overflow-hidden flex flex-col h-full">
                <div className="bg-muted h-48 flex items-center justify-center">
                  <ShoppingBag className="h-16 w-16 text-muted-foreground/50" />
                </div>
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg line-clamp-2">{product.name}</CardTitle>
                </CardHeader>
                <CardContent className="pb-2 flex-grow">
                  <p className="text-muted-foreground text-sm line-clamp-3">
                    {product.description || "Sem descrição disponível"}
                  </p>
                  {product.model && (
                    <p className="text-sm mt-2">
                      <span className="font-medium">Modelo:</span> {product.model}
                    </p>
                  )}
                </CardContent>
                <CardFooter className="flex items-center justify-between pt-2 border-t">
                  <p className="font-bold text-lg">{formatCurrency(product.price)}</p>
                  <Button asChild>
                    <Link to={`/store/product/${product.id}`}>Ver Detalhes</Link>
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        ) : (
          <div className="text-center py-20 border rounded-md bg-muted/20">
            <ShoppingBag className="mx-auto h-12 w-12 text-muted-foreground/50 mb-3" />
            <h3 className="text-lg font-medium">Nenhum produto encontrado</h3>
            <p className="text-muted-foreground">
              {searchTerm ? "Tente uma busca diferente" : "Estamos adicionando novos produtos em breve"}
            </p>
          </div>
        )}
      </div>
    </MainLayout>
  );
};

export default ProductStore;
