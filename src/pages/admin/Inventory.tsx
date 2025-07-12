import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { 
  Package, 
  AlertTriangle, 
  TrendingDown, 
  TrendingUp,
  Search,
  Filter,
  Plus,
  Edit,
  Trash2,
  History
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useBranchFilter } from "@/hooks/useBranchFilter";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface InventoryItem {
  id: string;
  name: string;
  description: string;
  quantity: number;
  min_stock: number;
  unit_price: number;
  category: string;
  last_updated: string;
  supplier?: string;
}

interface StockMovement {
  id: string;
  item_id: string;
  type: 'in' | 'out' | 'adjustment';
  quantity: number;
  reason: string;
  created_at: string;
  created_by: string;
}

const Inventory = () => {
  const { branchId } = useBranchFilter();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [stockFilter, setStockFilter] = useState("all");
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);
  const [showMovementDialog, setShowMovementDialog] = useState(false);

  // Estados do formulário
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    quantity: 0,
    min_stock: 0,
    unit_price: 0,
    category: "",
    supplier: ""
  });

  // Estados para movimentação de estoque
  const [movementData, setMovementData] = useState({
    type: "in" as "in" | "out" | "adjustment",
    quantity: 0,
    reason: ""
  });

  // Buscar produtos com estoque
  const { data: inventory, isLoading } = useQuery({
    queryKey: ["inventory", branchId, searchTerm, categoryFilter, stockFilter],
    queryFn: async () => {
      if (!branchId) return [];

      let query = supabase
        .from("products")
        .select("*")
        .eq("branch_id", branchId);

      if (searchTerm) {
        query = query.ilike("name", `%${searchTerm}%`);
      }

      if (categoryFilter !== "all") {
        // Adicionar filtro por categoria quando implementado
      }

      const { data, error } = await query.order("name");
      
      if (error) throw error;

      let filteredData = data || [];

      // Filtrar por nível de estoque
      if (stockFilter === "low") {
        filteredData = filteredData.filter(item => item.quantity <= 5); // Assumindo estoque baixo = 5 ou menos
      } else if (stockFilter === "out") {
        filteredData = filteredData.filter(item => item.quantity === 0);
      }

      return filteredData.map(item => ({
        id: item.id,
        name: item.name,
        description: item.description || "",
        quantity: item.quantity,
        min_stock: 5, // Default, implementar campo no banco
        unit_price: item.price,
        category: "Geral", // Implementar categorias
        last_updated: item.updated_at,
        supplier: "" // Implementar fornecedores
      })) as InventoryItem[];
    },
    enabled: !!branchId
  });

  // Buscar movimentações de estoque
  const { data: movements } = useQuery({
    queryKey: ["stock-movements", selectedItem?.id],
    queryFn: async () => {
      if (!selectedItem) return [];
      
      // Implementar busca de movimentações quando tiver a tabela
      const mockMovements: StockMovement[] = [
        {
          id: "1",
          item_id: selectedItem.id,
          type: "in",
          quantity: 10,
          reason: "Compra inicial",
          created_at: new Date().toISOString(),
          created_by: "Admin"
        }
      ];
      
      return mockMovements;
    },
    enabled: !!selectedItem
  });

  // Atualizar estoque
  const updateStock = useMutation({
    mutationFn: async ({ itemId, newQuantity }: { itemId: string; newQuantity: number }) => {
      const { error } = await supabase
        .from("products")
        .update({ quantity: newQuantity })
        .eq("id", itemId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["inventory", branchId] });
      setShowMovementDialog(false);
      setMovementData({ type: "in", quantity: 0, reason: "" });
      toast({
        title: "Estoque atualizado",
        description: "A quantidade em estoque foi atualizada com sucesso.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  const handleMovement = () => {
    if (!selectedItem) return;
    
    let newQuantity = selectedItem.quantity;
    
    switch (movementData.type) {
      case "in":
        newQuantity += movementData.quantity;
        break;
      case "out":
        newQuantity -= movementData.quantity;
        break;
      case "adjustment":
        newQuantity = movementData.quantity;
        break;
    }
    
    if (newQuantity < 0) {
      toast({
        title: "Erro",
        description: "Quantidade não pode ser negativa.",
        variant: "destructive",
      });
      return;
    }
    
    updateStock.mutate({ itemId: selectedItem.id, newQuantity });
  };

  const getStockStatus = (item: InventoryItem) => {
    if (item.quantity === 0) {
      return { label: "Sem estoque", color: "bg-red-100 text-red-800", icon: AlertTriangle };
    } else if (item.quantity <= item.min_stock) {
      return { label: "Estoque baixo", color: "bg-yellow-100 text-yellow-800", icon: TrendingDown };
    } else {
      return { label: "Em estoque", color: "bg-green-100 text-green-800", icon: TrendingUp };
    }
  };

  // Estatísticas do inventário
  const stats = inventory ? {
    totalItems: inventory.length,
    lowStockItems: inventory.filter(item => item.quantity <= item.min_stock).length,
    outOfStockItems: inventory.filter(item => item.quantity === 0).length,
    totalValue: inventory.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0)
  } : { totalItems: 0, lowStockItems: 0, outOfStockItems: 0, totalValue: 0 };

  if (!branchId) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-gray-500">Selecione uma filial para visualizar o inventário</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto py-8 px-4">
      <div className="flex justify-between items-start mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Gestão de Inventário</h1>
          <p className="text-gray-600 mt-2">Controle de estoque e movimentações</p>
        </div>
      </div>

      {/* Estatísticas */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total de Itens</p>
                <p className="text-2xl font-bold text-gray-900">{stats.totalItems}</p>
              </div>
              <Package className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Estoque Baixo</p>
                <p className="text-2xl font-bold text-yellow-600">{stats.lowStockItems}</p>
              </div>
              <TrendingDown className="h-8 w-8 text-yellow-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Sem Estoque</p>
                <p className="text-2xl font-bold text-red-600">{stats.outOfStockItems}</p>
              </div>
              <AlertTriangle className="h-8 w-8 text-red-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Valor Total</p>
                <p className="text-2xl font-bold text-green-600">R$ {stats.totalValue.toFixed(2)}</p>
              </div>
              <TrendingUp className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filtros */}
      <Card className="mb-8">
        <CardContent className="p-6">
          <div className="flex gap-4 items-center">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Buscar produtos..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={stockFilter} onValueChange={setStockFilter}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Filtrar por estoque" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os itens</SelectItem>
                <SelectItem value="low">Estoque baixo</SelectItem>
                <SelectItem value="out">Sem estoque</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Lista de produtos */}
      <Card>
        <CardHeader>
          <CardTitle>Produtos em Estoque</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8">Carregando inventário...</div>
          ) : inventory?.length === 0 ? (
            <div className="text-center py-12">
              <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Nenhum produto encontrado</h3>
              <p className="text-gray-500">Adicione produtos para começar a controlar o estoque.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {inventory?.map((item) => {
                const status = getStockStatus(item);
                const StatusIcon = status.icon;
                
                return (
                  <div key={item.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50">
                    <div className="flex items-center gap-4 flex-1">
                      <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center">
                        <Package className="h-6 w-6 text-gray-600" />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-medium text-gray-900">{item.name}</h3>
                        <p className="text-sm text-gray-500">{item.description}</p>
                        <div className="flex items-center gap-4 mt-2">
                          <Badge className={status.color}>
                            <StatusIcon className="h-3 w-3 mr-1" />
                            {status.label}
                          </Badge>
                          <span className="text-sm text-gray-500">
                            Categoria: {item.category}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="text-right mr-4">
                      <p className="text-lg font-bold text-gray-900">{item.quantity}</p>
                      <p className="text-sm text-gray-500">unidades</p>
                      <p className="text-sm text-gray-500">R$ {item.unit_price.toFixed(2)}/un</p>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSelectedItem(item);
                          setShowMovementDialog(true);
                        }}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSelectedItem(item);
                          // Mostrar histórico de movimentações
                        }}
                      >
                        <History className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialog de movimentação de estoque */}
      <Dialog open={showMovementDialog} onOpenChange={setShowMovementDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Movimentar Estoque</DialogTitle>
            <DialogDescription>
              {selectedItem?.name} - Estoque atual: {selectedItem?.quantity} unidades
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="movement-type">Tipo de Movimentação</Label>
              <Select
                value={movementData.type}
                onValueChange={(value: "in" | "out" | "adjustment") => 
                  setMovementData(prev => ({ ...prev, type: value }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="in">Entrada</SelectItem>
                  <SelectItem value="out">Saída</SelectItem>
                  <SelectItem value="adjustment">Ajuste</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="quantity">
                {movementData.type === "adjustment" ? "Nova Quantidade" : "Quantidade"}
              </Label>
              <Input
                id="quantity"
                type="number"
                value={movementData.quantity}
                onChange={(e) => setMovementData(prev => ({ ...prev, quantity: parseInt(e.target.value) || 0 }))}
                min="0"
              />
            </div>
            <div>
              <Label htmlFor="reason">Motivo</Label>
              <Input
                id="reason"
                value={movementData.reason}
                onChange={(e) => setMovementData(prev => ({ ...prev, reason: e.target.value }))}
                placeholder="Ex: Compra, Venda, Correção de inventário..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowMovementDialog(false)}>
              Cancelar
            </Button>
            <Button
              onClick={handleMovement}
              disabled={updateStock.isPending || !movementData.reason}
            >
              {updateStock.isPending ? "Salvando..." : "Confirmar Movimentação"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Inventory;