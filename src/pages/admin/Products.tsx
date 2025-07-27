import React, { useState } from "react";
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
import { Plus, Trash2, Edit, ShoppingBag } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useBranchFilter } from "@/hooks/useBranchFilter";
import { useAuth } from "@/contexts/AuthContext";
import { useAdminCRUDLogger } from "@/hooks/useAdminCRUDLogger";
import { PhotoManager } from "@/components/admin/shared/PhotoManager";

const productSchema = z.object({
  name: z.string().min(1, "Nome é obrigatório"),
  description: z.string().optional(),
  price: z.coerce.number().min(0.01, "Preço deve ser maior que zero"),
  model: z.string().optional(),
  quantity: z.coerce.number().min(0, "Quantidade não pode ser negativa"),
  equipment_id: z.string().nullable().optional(),
});

type ProductFormValues = z.infer<typeof productSchema>;

const AdminProducts = () => {
  const [openDialog, setOpenDialog] = useState(false);
  const [editingProductId, setEditingProductId] = useState<string | null>(null);
  const { toast } = useToast();
  const { branchId, setBranchId, branches, isSuperAdmin } = useBranchFilter();
  const { user } = useAuth();
  const { logCreate, logUpdate, logDelete } = useAdminCRUDLogger();
  const [photos, setPhotos] = useState<any[]>([]);
  const [photoFiles, setPhotoFiles] = useState<File[]>([]);

  const form = useForm<ProductFormValues>({
    resolver: zodResolver(productSchema),
    defaultValues: {
      name: "",
      description: "",
      price: 0,
      model: "",
      quantity: 0,
      equipment_id: null,
    },
  });

  // Fetch products
  const { data: products, isLoading: isLoadingProducts, refetch: refetchProducts } = useQuery({
    queryKey: ["products", branchId],
    queryFn: async () => {
      if (!branchId) return [];
      const { data, error } = await supabase
        .from("products")
        .select(`*, equipment:equipment(name)`)
        .eq("branch_id", branchId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!branchId
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
      // Verifica sessão e branch_id
      const branchId = user?.user_metadata?.branch_id;
      if (!user || !branchId) {
        throw new Error("Sessão expirada ou usuário sem filial associada. Faça login novamente.");
      }
      const productData = {
        name: values.name,
        description: values.description,
        price: values.price,
        model: values.model,
        quantity: values.quantity,
        equipment_id: values.equipment_id === "null" ? null : values.equipment_id,
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

        // Log da atualização
        await (logUpdate as any)('product', editingProductId, productData, data);
        
        // Upload de fotos para produto editado
        if (photoFiles.length > 0) {
          for (const file of photoFiles) {
            const fileName = `${editingProductId}_${Date.now()}_${file.name}`;
            const { data: uploadData, error: uploadError } = await supabase.storage
              .from('product-photos')
              .upload(fileName, file);

            if (uploadError) {
              console.error('Erro ao fazer upload da foto do produto:', uploadError);
              continue;
            }

            const { data: { publicUrl } } = supabase.storage
              .from('product-photos')
              .getPublicUrl(fileName);

            await supabase
              .from("product_photos")
              .insert({
                product_id: editingProductId,
                url: publicUrl,
                branch_id: branchId,
              });
          }
        }
        
        return data;
      } else {
        // Create new product
        const { data, error } = await supabase
          .from("products")
          .insert({ ...productData, branch_id: branchId, is_active: true })
          .select()
          .single();
        if (error) throw error;

        // Log da criação
        await (logCreate as any)('product', data.id, { ...productData, branch_id: branchId }, data);
        
        // Upload de fotos para novo produto
        if (photoFiles.length > 0) {
          for (const file of photoFiles) {
            const fileName = `${data.id}_${Date.now()}_${file.name}`;
            const { data: uploadData, error: uploadError } = await supabase.storage
              .from('product-photos')
              .upload(fileName, file);

            if (uploadError) {
              console.error('Erro ao fazer upload da foto do produto:', uploadError);
              continue;
            }

            const { data: { publicUrl } } = supabase.storage
              .from('product-photos')
              .getPublicUrl(fileName);

            await supabase
              .from("product_photos")
              .insert({
                product_id: data.id,
                url: publicUrl,
                branch_id: branchId,
              });
          }
        }
        
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


  // Delete product
  const deleteProductMutation = useMutation({
    mutationFn: async (id: string) => {
      // Buscar dados do produto antes de excluir para o log
      const { data: productData } = await supabase
        .from("products")
        .select("*")
        .eq("id", id)
        .single();

      const { error } = await supabase
        .from("products")
        .delete()
        .eq("id", id);

      if (error) throw error;

      // Log da exclusão
      if (productData) {
        await logDelete('product', id, productData);
      }
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


  const resetForm = () => {
    form.reset({
      name: "",
      description: "",
      price: 0,
      model: "",
      quantity: 0,
      equipment_id: null,
    });
    setEditingProductId(null);
    setPhotos([]);
    setPhotoFiles([]);
  };

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setPhotoFiles(prev => [...prev, ...files]);
  };

  const handleRemovePhotoFile = (index: number) => {
    setPhotoFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleRemovePhoto = async (photoId: string) => {
    try {
      const { error } = await supabase
        .from("product_photos")
        .delete()
        .eq("id", photoId);

      if (error) throw error;

      setPhotos(prev => prev.filter(p => p.id !== photoId));
      
      toast({
        title: "Foto removida com sucesso",
      });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Erro ao remover foto",
        description: error.message,
      });
    }
  };

  const handleEditProduct = async (product: any) => {
    form.reset({
      name: product.name,
      description: product.description || "",
      price: product.price,
      model: product.model || "",
      quantity: product.quantity || 0,
      equipment_id: product.equipment_id || null,
    });
    setEditingProductId(product.id);
    
    // Carregar fotos do produto
    try {
      const { data: photoData } = await supabase
        .from("product_photos")
        .select("*")
        .eq("product_id", product.id);
      
      if (photoData) {
        setPhotos(photoData);
      }
    } catch (error) {
      console.error("Erro ao carregar fotos:", error);
    }
    
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
      {isSuperAdmin && branches && (
        <div className="mb-4 max-w-xs">
          <Select value={branchId || undefined} onValueChange={setBranchId!}>
            <SelectTrigger>
              <SelectValue placeholder="Filial" />
            </SelectTrigger>
            <SelectContent>
              {branches.map((b) => (
                <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}
      <Card className="shadow-lg rounded-2xl border-0 bg-white p-6 mb-8">
        <CardHeader>
          <CardTitle className="text-2xl font-bold flex items-center gap-2 text-gray-900">
            <ShoppingBag className="h-7 w-7 text-blue-700" /> Produtos
          </CardTitle>
          <CardDescription className="text-gray-500">Gerencie os produtos disponíveis para venda</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-3xl font-bold">Produtos</h1>
              <p className="text-muted-foreground">
                Gerencie os produtos disponíveis para venda
              </p>
            </div>
            <Button onClick={() => {
              resetForm();
              setOpenDialog(true);
            }}>
              <Plus className="mr-2 h-4 w-4" />
              Novo Produto
            </Button>
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
                          <TableCell colSpan={6} className="text-center py-6 text-muted-foreground">
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
                        defaultValue={field.value || "null"}
                        value={field.value || "null"}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione um equipamento" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="null">Nenhum</SelectItem>
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
               
               <PhotoManager
                 photos={photos}
                 files={photoFiles}
                 onFileChange={handlePhotoChange}
                 onRemoveFile={handleRemovePhotoFile}
                 onRemovePhoto={handleRemovePhoto}
                 title="Fotos do Produto"
               />
               
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
