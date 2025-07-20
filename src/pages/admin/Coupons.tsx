import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { toast } from "@/hooks/use-toast";
import { Ticket, Plus, Edit, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { useBranchFilter } from "@/hooks/useBranchFilter";
import { useAdminLogger } from "@/hooks/useAdminLogger";

export default function Coupons() {
  const { branchId } = useBranchFilter();
  const { logAction } = useAdminLogger();
  const queryClient = useQueryClient();
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [editingCoupon, setEditingCoupon] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState("");

  const [formData, setFormData] = useState({
    code: "",
    name: "",
    description: "",
    discountType: "percentage",
    discountValue: "",
    minimumAmount: "",
    minimumItems: "",
    maxUses: "",
    maxUsesPerUser: "1",
    applicableTo: "all",
    validFrom: "",
    validUntil: "",
    validDays: [0, 1, 2, 3, 4, 5, 6],
    validHoursStart: "",
    validHoursEnd: "",
    firstPurchaseOnly: false,
    cumulativeWithPromotions: true,
    isActive: true,
  });

  const { data: coupons = [], isLoading } = useQuery({
    queryKey: ["coupons", branchId],
    queryFn: async () => {
      if (!branchId) return [];
      const { data, error } = await supabase
        .from("coupons")
        .select("*")
        .eq("branch_id", branchId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!branchId,
  });

  const { data: couponUsage = [] } = useQuery({
    queryKey: ["coupon-usage", branchId],
    queryFn: async () => {
      if (!branchId) return [];
      const { data, error } = await supabase
        .from("coupon_usage")
        .select("coupon_id")
        .eq("branch_id", branchId);
      if (error) throw error;
      
      // Contar uso por cupom
      const usageCount = data.reduce((acc: Record<string, number>, usage) => {
        acc[usage.coupon_id] = (acc[usage.coupon_id] || 0) + 1;
        return acc;
      }, {});
      
      return Object.entries(usageCount).map(([coupon_id, count]) => ({
        coupon_id,
        count
      }));
    },
    enabled: !!branchId,
  });

  const createCouponMutation = useMutation({
    mutationFn: async (couponData: typeof formData) => {
      const { error } = await supabase
        .from("coupons")
        .insert({
          code: couponData.code.toUpperCase(),
          name: couponData.name,
          description: couponData.description,
          discount_type: couponData.discountType,
          discount_value: parseFloat(couponData.discountValue),
          minimum_amount: couponData.minimumAmount ? parseFloat(couponData.minimumAmount) : 0,
          minimum_items: couponData.minimumItems ? parseInt(couponData.minimumItems) : 0,
          max_uses: couponData.maxUses ? parseInt(couponData.maxUses) : null,
          max_uses_per_user: parseInt(couponData.maxUsesPerUser),
          applicable_to: couponData.applicableTo,
          valid_from: new Date(couponData.validFrom).toISOString(),
          valid_until: new Date(couponData.validUntil).toISOString(),
          valid_days: couponData.validDays,
          valid_hours_start: couponData.validHoursStart || null,
          valid_hours_end: couponData.validHoursEnd || null,
          first_purchase_only: couponData.firstPurchaseOnly,
          cumulative_with_promotions: couponData.cumulativeWithPromotions,
          is_active: couponData.isActive,
          created_by: (await supabase.auth.getUser()).data.user?.id,
          branch_id: branchId,
        });

      if (error) throw error;
    },
    onSuccess: () => {
      toast({
        title: "Cupom criado",
        description: "O cupom foi criado com sucesso.",
      });
      logAction("create_coupon", { code: formData.code, name: formData.name });
      setShowCreateDialog(false);
      resetForm();
      queryClient.invalidateQueries({ queryKey: ["coupons"] });
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Erro ao criar cupom",
        description: error.message || "Ocorreu um erro ao criar o cupom.",
      });
    },
  });

  const updateCouponMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const { error } = await supabase
        .from("coupons")
        .update(data)
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      toast({
        title: "Cupom atualizado",
        description: "O cupom foi atualizado com sucesso.",
      });
      queryClient.invalidateQueries({ queryKey: ["coupons"] });
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Erro ao atualizar cupom",
        description: error.message || "Ocorreu um erro ao atualizar o cupom.",
      });
    },
  });

  const deleteCouponMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("coupons")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      toast({
        title: "Cupom excluído",
        description: "O cupom foi excluído com sucesso.",
      });
      logAction("delete_coupon", { id: editingCoupon?.id });
      queryClient.invalidateQueries({ queryKey: ["coupons"] });
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Erro ao excluir cupom",
        description: error.message || "Ocorreu um erro ao excluir o cupom.",
      });
    },
  });

  const resetForm = () => {
    setFormData({
      code: "",
      name: "",
      description: "",
      discountType: "percentage",
      discountValue: "",
      minimumAmount: "",
      minimumItems: "",
      maxUses: "",
      maxUsesPerUser: "1",
      applicableTo: "all",
      validFrom: "",
      validUntil: "",
      validDays: [0, 1, 2, 3, 4, 5, 6],
      validHoursStart: "",
      validHoursEnd: "",
      firstPurchaseOnly: false,
      cumulativeWithPromotions: true,
      isActive: true,
    });
    setEditingCoupon(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.code || !formData.name || !formData.discountValue || !formData.validFrom || !formData.validUntil) {
      toast({
        variant: "destructive",
        title: "Campos obrigatórios",
        description: "Preencha todos os campos obrigatórios.",
      });
      return;
    }
    createCouponMutation.mutate(formData);
  };

  const handleToggleActive = (coupon: any) => {
    updateCouponMutation.mutate({
      id: coupon.id,
      data: { is_active: !coupon.is_active }
    });
    logAction("toggle_coupon_status", { couponId: coupon.id, newStatus: !coupon.is_active });
  };

  const generateRandomCode = () => {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    let result = "";
    for (let i = 0; i < 8; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setFormData(prev => ({ ...prev, code: result }));
  };

  const filteredCoupons = coupons.filter(coupon =>
    coupon.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
    coupon.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getCouponUsageCount = (couponId: string) => {
    const usage = couponUsage.find(u => u.coupon_id === couponId);
    return usage?.count || 0;
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Ticket className="h-6 w-6" />
              Sistema de Cupons
            </CardTitle>
            <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
              <DialogTrigger asChild>
                <Button onClick={() => resetForm()}>
                  <Plus className="h-4 w-4 mr-2" />
                  Criar Cupom
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Criar Novo Cupom</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="code">Código do Cupom *</Label>
                      <div className="flex gap-2">
                        <Input
                          id="code"
                          value={formData.code}
                          onChange={(e) => setFormData(prev => ({ ...prev, code: e.target.value.toUpperCase() }))}
                          placeholder="DESCONTO10"
                          required
                        />
                        <Button type="button" variant="outline" onClick={generateRandomCode}>
                          Gerar
                        </Button>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="name">Nome do Cupom *</Label>
                      <Input
                        id="name"
                        value={formData.name}
                        onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                        placeholder="Desconto de 10%"
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="description">Descrição</Label>
                    <Textarea
                      id="description"
                      value={formData.description}
                      onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                      placeholder="Descrição do cupom..."
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="discountType">Tipo de Desconto *</Label>
                      <Select
                        value={formData.discountType}
                        onValueChange={(value) => setFormData(prev => ({ ...prev, discountType: value }))}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="percentage">Percentual (%)</SelectItem>
                          <SelectItem value="fixed">Valor Fixo (R$)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="discountValue">
                        Valor do Desconto * {formData.discountType === "percentage" ? "(%)" : "(R$)"}
                      </Label>
                      <Input
                        id="discountValue"
                        type="number"
                        step="0.01"
                        value={formData.discountValue}
                        onChange={(e) => setFormData(prev => ({ ...prev, discountValue: e.target.value }))}
                        required
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="validFrom">Válido De *</Label>
                      <Input
                        id="validFrom"
                        type="datetime-local"
                        value={formData.validFrom}
                        onChange={(e) => setFormData(prev => ({ ...prev, validFrom: e.target.value }))}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="validUntil">Válido Até *</Label>
                      <Input
                        id="validUntil"
                        type="datetime-local"
                        value={formData.validUntil}
                        onChange={(e) => setFormData(prev => ({ ...prev, validUntil: e.target.value }))}
                        required
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="minimumAmount">Valor Mínimo (R$)</Label>
                      <Input
                        id="minimumAmount"
                        type="number"
                        step="0.01"
                        value={formData.minimumAmount}
                        onChange={(e) => setFormData(prev => ({ ...prev, minimumAmount: e.target.value }))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="maxUses">Usos Totais</Label>
                      <Input
                        id="maxUses"
                        type="number"
                        value={formData.maxUses}
                        onChange={(e) => setFormData(prev => ({ ...prev, maxUses: e.target.value }))}
                        placeholder="Ilimitado"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="maxUsesPerUser">Usos por Usuário</Label>
                      <Input
                        id="maxUsesPerUser"
                        type="number"
                        value={formData.maxUsesPerUser}
                        onChange={(e) => setFormData(prev => ({ ...prev, maxUsesPerUser: e.target.value }))}
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="applicableTo">Aplicável a</Label>
                    <Select
                      value={formData.applicableTo}
                      onValueChange={(value) => setFormData(prev => ({ ...prev, applicableTo: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todos os itens</SelectItem>
                        <SelectItem value="rooms">Apenas salas</SelectItem>
                        <SelectItem value="equipment">Apenas equipamentos</SelectItem>
                        <SelectItem value="products">Apenas produtos</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex items-center space-x-4">
                    <div className="flex items-center space-x-2">
                      <Switch
                        id="firstPurchaseOnly"
                        checked={formData.firstPurchaseOnly}
                        onCheckedChange={(checked) => setFormData(prev => ({ ...prev, firstPurchaseOnly: checked }))}
                      />
                      <Label htmlFor="firstPurchaseOnly">Apenas primeira compra</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Switch
                        id="isActive"
                        checked={formData.isActive}
                        onCheckedChange={(checked) => setFormData(prev => ({ ...prev, isActive: checked }))}
                      />
                      <Label htmlFor="isActive">Ativo</Label>
                    </div>
                  </div>

                  <div className="flex justify-end gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setShowCreateDialog(false)}
                    >
                      Cancelar
                    </Button>
                    <Button
                      type="submit"
                      disabled={createCouponMutation.isPending}
                    >
                      {createCouponMutation.isPending ? "Criando..." : "Criar Cupom"}
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          <div className="mb-6">
            <Input
              placeholder="Buscar cupons por código ou nome..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="max-w-md"
            />
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Código</TableHead>
                <TableHead>Nome</TableHead>
                <TableHead>Desconto</TableHead>
                <TableHead>Válido Até</TableHead>
                <TableHead>Usos</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredCoupons.map((coupon) => (
                <TableRow key={coupon.id}>
                  <TableCell>
                    <code className="bg-muted px-2 py-1 rounded text-sm">
                      {coupon.code}
                    </code>
                  </TableCell>
                  <TableCell>{coupon.name}</TableCell>
                  <TableCell>
                    {coupon.discount_type === "percentage" 
                      ? `${coupon.discount_value}%`
                      : `R$ ${coupon.discount_value.toFixed(2)}`
                    }
                  </TableCell>
                  <TableCell>
                    {format(new Date(coupon.valid_until), "dd/MM/yyyy HH:mm")}
                  </TableCell>
                  <TableCell>
                    {String(getCouponUsageCount(coupon.id as string))}{(coupon as any).max_uses ? `/${(coupon as any).max_uses}` : ""}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Badge variant={coupon.is_active ? "default" : "secondary"}>
                        {coupon.is_active ? "Ativo" : "Inativo"}
                      </Badge>
                      {new Date(coupon.valid_until) < new Date() && (
                        <Badge variant="destructive">Expirado</Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleToggleActive(coupon)}
                      >
                        {coupon.is_active ? "Desativar" : "Ativar"}
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => {
                          if (window.confirm("Tem certeza que deseja excluir este cupom?")) {
                            setEditingCoupon(coupon);
                            deleteCouponMutation.mutate(coupon.id);
                          }
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {filteredCoupons.length === 0 && !isLoading && (
            <div className="text-center py-8 text-muted-foreground">
              Nenhum cupom encontrado.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
