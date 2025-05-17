import React, { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { Plus, Trash2, Edit, RefreshCw } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";

const productSchema = z.object({
  name: z.string().min(1, "Nome é obrigatório"),
  description: z.string().optional(),
  price: z.coerce.number().min(0.01, "Preço deve ser maior que zero"),
  model: z.string().optional(),
  quantity: z.coerce.number().min(0, "Quantidade não pode ser negativa"),
  equipment_id: z.string().optional(),
});

type ProductFormValues = z.infer<typeof productSchema>;

const AdminProducts = () => {
  const [openDialog, setOpenDialog] = useState(false);
  const [editingProductId, setEditingProductId] = useState<string | null>(null);
  const { toast } = useToast();

  const form = useForm<ProductFormValues>({
    resolver: zodResolver(productSchema),
    defaultValues: {
      name: "",
      description: "",
      price: 0,
      model: "",
      quantity: 0,
      equipment_id: undefined,
    },
  });

  // Fetch products
  const { data: products, isLoading: isLoadingProducts, refetch: refetchProducts } = useQuery({
    queryKey: ["products"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select(`
          *,
          equipment:equipment(name)
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data || [];
    },
  });

  // Fetch equipment for reference selection
  const { data: equipment } = useQuery({
    queryKey: ["equipment"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("equipment")
        .select("id, name")
        .order("name");

      if (error) throw error;
      return data || [];
    },
  });

  // Create or update product
  const saveProductMutation = useMutation({
    mutationFn: async (values: ProductFormValues) => {
      const productData = {
        name: values.name,
        description: values.description,
        price: values.price,
        model: values.model,
        quantity: values.quantity,
        equipment_id: values.equipment_id || null,
      };

      if (editingProductId) {
        // Update existing product
        const { data, error } = await supabase
          .from("products")
          .update(productData)
          .eq("id", editingProductId)
          .select()
          .single();

        if (error) throw error;
        return data;
      } else {
        // Create new product
        const { data, error } = await supabase
          .from("products")
          .insert(productData)
          .select()
          .single();

        if (error) throw error;
        
        // Sync with Stripe
        await createProductInStripe(data);
        return data;
      }
    },
    onSuccess: () => {
      toast({
        title: editingProductId ? "Produto atualizado" : "Produto criado",
        description: editingProductId 
          ? "O produto foi atualizado com sucesso." 
          : "O produto foi criado com sucesso.",
      });
      setOpenDialog(false);
      resetForm();
      refetchProducts();
    },
    onError: (error) => {
      toast({
        variant: "destructive",
        title: "Erro",
        description: `Ocorreu um erro ao ${editingProductId ? 'atualizar' : 'criar'} o produto: ${error.message}`,
      });
    },
  });

  // Create product in Stripe
  const createProductInStripe = async (productData: any) => {
    try {
      const { error } = await supabase.functions.invoke("stripe-integration", {
        body: {
          action: "create-product",
          productData,
        },
      });

      if (error) throw error;
    } catch (error) {
      console.error("Error creating product in Stripe:", error);
      toast({
        variant: "destructive",
        title: "Erro ao integrar com Stripe",
        description: "O produto foi salvo, mas ocorreu um erro ao sincronizar com o Stripe.",
      });
    }
  };

  // Delete product
  const deleteProductMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("products")
        .delete()
        .eq("id", id);

      if (error) throw error;
      return id;
    },
    onSuccess: (id) => {
      toast({
        title: "Produto excluído",
        description: "O produto foi excluído com sucesso.",
      });
      refetchProducts();
    },
    onError: (error) => {
      toast({
        variant: "destructive",
        title: "Erro",
        description: `Ocorreu um erro ao excluir o produto: ${error.message}`,
      });
    },
  });

  // Sync all products with Stripe
  const syncProductsMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.functions.invoke("stripe-integration", {
        body: {
          action: "sync-products",
        },
      });

      if (error) throw error;
    },
    onSuccess: () => {
      toast({
        title: "Produtos sincronizados",
        description: "Os produtos foram sincronizados com o Stripe com sucesso.",
      });
      refetchProducts();
    },
    onError: (error) => {
      toast({
        variant: "destructive",
        title: "Erro",
        description: `Ocorreu um erro ao sincronizar produtos: ${error.message}`,
      });
    },
  });

  const resetForm = () => {
    form.reset({
      name: "",
      description: "",
      price: 0,
      model: "",
      quantity: 0,
      equipment_id: undefined,
    });
    setEditingProductId(null);
  };

  const handleEditProduct = (product: any) => {
    form.reset({
      name: product.name,
      description: product.description || "",
      price: product.price,
      model: product.model || "",
      quantity: product.quantity || 0,
      equipment_id: product.equipment_id || undefined,
    });
    setEditingProductId(product.id);
    setOpenDialog(true);
  };

  const handleDeleteProduct = (productId: string) => {
    if (window.confirm("Tem certeza de que deseja excluir este produto?")) {
      deleteProductMutation.mutate(productId);
    }
  };

  const onSubmit = (values: ProductFormValues) => {
    saveProductMutation.mutate(values);
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  return (
    <>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold">Produtos</h1>
          <p className="text-muted-foreground">
            Gerencie os produtos disponíveis para venda
          </p>
        </div>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            onClick={() => syncProductsMutation.mutate()}
            disabled={syncProductsMutation.isPending}
          >
            <RefreshCw className="mr-2 h-4 w-4" />
            Sincronizar com Stripe
          </Button>
          <Button onClick={() => {
            resetForm();
            setOpenDialog(true);
          }}>
            <Plus className="mr-2 h-4 w-4" />
            Novo Produto
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Lista de Produtos</CardTitle>
          <CardDescription>
            Gerencie todos os produtos disponíveis para venda
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoadingProducts ? (
            <div className="flex justify-center p-8">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary"></div>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Modelo</TableHead>
                    <TableHead>Preço</TableHead>
                    <TableHead>Equipamento Relacionado</TableHead>
                    <TableHead>Quantidade</TableHead>
                    <TableHead>Status Stripe</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {products && products.length > 0 ? (
                    products.map((product) => (
                      <TableRow key={product.id}>
                        <TableCell className="font-medium">{product.name}</TableCell>
                        <TableCell>{product.model || "-"}</TableCell>
                        <TableCell>{formatCurrency(product.price)}</TableCell>
                        <TableCell>
                          {product.equipment ? (
                            <span className="text-sm">{(product.equipment as any).name}</span>
                          ) : (
                            "-"
                          )}
                        </TableCell>
                        <TableCell>{product.quantity || 0}</TableCell>
                        <TableCell>
                          {product.stripe_product_id ? (
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                              Sincronizado
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                              Não sincronizado
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleEditProduct(product)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDeleteProduct(product.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-6 text-muted-foreground">
                        Nenhum produto encontrado
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={openDialog} onOpenChange={setOpenDialog}>
        <DialogContent className="sm:max-w-[550px]">
          <DialogHeader>
            <DialogTitle>{editingProductId ? "Editar Produto" : "Novo Produto"}</DialogTitle>
            <DialogDescription>
              {editingProductId
                ? "Atualize as informações do produto abaixo."
                : "Complete as informações do produto abaixo para criar um novo registro."}
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nome *</FormLabel>
                    <FormControl>
                      <Input placeholder="Nome do produto" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Descrição</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Descrição do produto" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="price"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Preço *</FormLabel>
                      <FormControl>
                        <Input type="number" step="0.01" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="model"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Modelo</FormLabel>
                      <FormControl>
                        <Input placeholder="Modelo do produto" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="quantity"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Quantidade disponível</FormLabel>
                      <FormControl>
                        <Input type="number" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="equipment_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Equipamento relacionado</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                        value={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione um equipamento" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="">Nenhum</SelectItem>
                          {equipment?.map((item) => (
                            <SelectItem key={item.id} value={item.id}>
                              {item.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <DialogFooter>
                <Button
                  variant="outline"
                  type="button"
                  onClick={() => {
                    setOpenDialog(false);
                    resetForm();
                  }}
                >
                  Cancelar
                </Button>
                <Button type="submit" disabled={saveProductMutation.isPending}>
                  {saveProductMutation.isPending ? "Salvando..." : "Salvar"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default AdminProducts;
