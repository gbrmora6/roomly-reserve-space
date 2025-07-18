
import React, { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Download, ShoppingBag, Smile, Eye, XCircle, CheckCircle, Loader2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import * as XLSX from "xlsx";
import { format } from "date-fns";
import { useBranchFilter } from "@/hooks/useBranchFilter";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { PaymentStatusManager } from "@/components/admin/PaymentStatusManager";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { AdminStatsCards } from "@/components/admin/AdminStatsCards";
import { PaymentCard } from "@/components/orders/PaymentCard";
import { useOrders } from "@/hooks/useOrders";

const STATUS_MAP = {
  all: "Todas",
  paid: "Pago",
  pending: "Falta pagar",
  cancelled: "Cancelado por falta de pagamento",
};

const STATUS_BADGE = {
  paid: "bg-green-100 text-green-800",
  pending: "bg-yellow-100 text-yellow-800",
  cancelled: "bg-red-100 text-red-800",
};

function translateStatus(status: string) {
  if (status === "paid") return "Pago";
  if (status === "pending" || status === "awaiting_payment") return "Falta pagar";
  if (status === "cancelled" || status === "cancelled_due_to_payment") return "Cancelado por falta de pagamento";
  return status;
}

function statusForTab(tab: string) {
  if (tab === "all") return null;
  if (tab === "paid") return ["paid"];
  if (tab === "pending") return ["pending", "awaiting_payment"];
  if (tab === "cancelled") return ["cancelled", "cancelled_due_to_payment"];
  return null;
}

interface OrderWithUser {
  id: string;
  user_id: string;
  created_at: string;
  status: string;
  total_amount: number;
  branch_id: string;
  order_items: {
    quantity: number;
    price_per_unit: number;
    product: {
      name: string;
    } | null;
  }[];
  user?: {
    id: string;
    first_name: string | null;
    last_name: string | null;
  } | null;
}

export default function ProductSales() {
  const [activeTab, setActiveTab] = useState("all");
  const { branchId, setBranchId, branches, isSuperAdmin } = useBranchFilter();
  const [selectedOrder, setSelectedOrder] = useState<OrderWithUser | null>(null);
  const [showDetails, setShowDetails] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const perPage = 10;
  const [lastOrderId, setLastOrderId] = useState<string | null>(null);

  const { data: orders = [], isLoading, error, refetch } = useQuery({
    queryKey: ["admin-product-sales", activeTab, branchId],
    queryFn: async () => {
      if (!branchId) return [];
      let query = supabase
        .from("orders")
        .select(`
          id,
          user_id,
          created_at,
          status,
          total_amount,
          branch_id,
          payment_method,
          payment_data,
          order_items(
            quantity,
            price_per_unit,
            product:products(name)
          ),
          payment_details(*)
        `)
        .eq("branch_id", branchId)
        .order("created_at", { ascending: false });
      const statusList = statusForTab(activeTab);
      if (statusList) {
        query = query.in("status", statusList);
      }
      const { data, error } = await query;
      if (error) throw error;
      
      // Fetch user profiles separately to avoid relation issues
      if (data && data.length > 0) {
        const userIds = [...new Set(data.map(order => order.user_id))];
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, first_name, last_name")
          .in("id", userIds);
        
        // Attach user profiles to orders
        return data.map(order => ({
          ...order,
          user: profiles?.find(profile => profile.id === order.user_id) || null
        })) as OrderWithUser[];
      }
      
      return data as OrderWithUser[] || [];
    },
    enabled: !!branchId,
    refetchInterval: 30000, // 30 segundos
  });

  const { checkPaymentStatus, requestRefund } = useOrders(undefined);

  // Notificação de novo pedido
  React.useEffect(() => {
    if (!orders || orders.length === 0) return;
    if (!lastOrderId) {
      setLastOrderId(orders[0].id);
      return;
    }
    if (orders[0].id !== lastOrderId) {
      setLastOrderId(orders[0].id);
      const userName = orders[0].user?.first_name || 'um cliente';
      toast({
        title: "Novo pedido recebido!",
        description: `Um novo pedido foi realizado por ${userName}.`,
      });
    }
  }, [orders]);

  // Cálculos de resumo
  const resumo = useMemo(() => {
    if (!orders) return {
      total: 0,
      faturado: 0,
      pagas: 0,
      pendentes: 0,
      canceladas: 0,
    };
    let total = orders.length;
    let faturado = 0;
    let pagas = 0;
    let pendentes = 0;
    let canceladas = 0;
    orders.forEach(order => {
      if (order.status === "paid") {
        pagas++;
        faturado += order.total_amount || 0;
      } else if (order.status === "pending" || order.status === "awaiting_payment") {
        pendentes++;
      } else if (order.status === "cancelled" || order.status === "cancelled_due_to_payment") {
        canceladas++;
      }
    });
    return {
      total,
      faturado,
      pagas,
      pendentes,
      canceladas,
    };
  }, [orders]);

  // Filtro de busca
  const filteredOrders = useMemo(() => {
    if (!orders) return [];
    if (!search.trim()) return orders;
    const s = search.trim().toLowerCase();
    return orders.filter(order => {
      const user = order.user;
      const name = user ? `${user.first_name || ''} ${user.last_name || ''}`.toLowerCase() : "";
      return name.includes(s);
    });
  }, [orders, search]);

  // Paginação
  const totalPages = Math.ceil(filteredOrders.length / perPage) || 1;
  const paginatedOrders = useMemo(() => {
    const start = (page - 1) * perPage;
    return filteredOrders.slice(start, start + perPage);
  }, [filteredOrders, page]);

  // Resetar página ao buscar
  React.useEffect(() => { setPage(1); }, [search, activeTab, branchId]);

  const downloadReport = () => {
    if (!orders || orders.length === 0) {
      toast({
        title: "Sem dados para exportar",
        description: "Não há vendas de produtos para gerar o relatório."
      });
      return;
    }
    try {
      const exportData = orders.map(order => {
        const produtos = order.order_items && order.order_items.length > 0
          ? order.order_items.map((item: any) => `${item.quantity}x ${item.product?.name || "Produto"}`).join("; ")
          : "-";
        const user = order.user;
        const customerName = user ? `${user.first_name || ''} ${user.last_name || ''}`.trim() : order.user_id;
        return {
          "ID": order.id,
          "Cliente": customerName,
          "Data": format(new Date(order.created_at), "dd/MM/yyyy"),
          "Produtos": produtos,
          "Valor Total": `R$ ${order.total_amount?.toFixed(2) || "0.00"}`,
          "Status": translateStatus(order.status)
        };
      });
      const worksheet = XLSX.utils.json_to_sheet(exportData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Vendas de Produtos");
      const fileName = `Relatorio_Vendas_Produtos_${format(new Date(), "dd-MM-yyyy")}.xlsx`;
      XLSX.writeFile(workbook, fileName);
      toast({
        title: "Relatório gerado com sucesso",
        description: `O arquivo ${fileName} foi baixado.`
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Erro ao gerar relatório",
        description: "Ocorreu um erro durante a geração do relatório. Tente novamente."
      });
    }
  };

  // Função para cancelar pedido
  const handleCancelOrder = async (orderId: string) => {
    if (!window.confirm("Tem certeza que deseja cancelar este pedido?")) return;
    setActionLoading(true);
    const { error } = await supabase
      .from("orders")
      .update({ status: "cancelled_due_to_payment" })
      .eq("id", orderId);
    setActionLoading(false);
    if (error) {
      toast({ variant: "destructive", title: "Erro ao cancelar", description: error.message });
    } else {
      toast({ title: "Pedido cancelado", description: "O pedido foi cancelado com sucesso." });
      // Refetch
      await refetch();
    }
  };

  // Função para marcar como pago
  const handleMarkAsPaid = async (orderId: string) => {
    if (!window.confirm("Marcar este pedido como pago?")) return;
    setActionLoading(true);
    const { error } = await supabase
      .from("orders")
      .update({ status: "paid" })
      .eq("id", orderId);
    setActionLoading(false);
    if (error) {
      toast({ variant: "destructive", title: "Erro ao marcar como pago", description: error.message });
    } else {
      toast({ title: "Pedido marcado como pago", description: "O status foi atualizado." });
      await refetch();
    }
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto px-4 pb-10">
      {isSuperAdmin && branches && (
        <div className="mb-4 max-w-xs">
          <Select value={branchId || undefined} onValueChange={setBranchId}>
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
      {/* Título e ação */}
      <Card className="shadow-lg rounded-2xl border-0 bg-white">
        <CardHeader>
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="flex items-center gap-3">
              <ShoppingBag className="h-8 w-8 text-primary" />
              <div>
                <CardTitle className="text-3xl font-bold leading-tight">Vendas de Produtos</CardTitle>
                <CardDescription className="text-muted-foreground mt-1 text-base">
                  Acompanhe todos os pedidos e vendas de produtos realizados na plataforma.
                </CardDescription>
              </div>
            </div>
            {isSuperAdmin ? (
              <Button variant="outline" onClick={downloadReport} className="h-12 text-base font-semibold">
                <Download className="mr-2 h-5 w-5" />
                Baixar Relatório
              </Button>
            ) : (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="outline" className="h-12 text-base font-semibold" disabled>
                      <Download className="mr-2 h-5 w-5" />
                      Baixar Relatório
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Somente superadmin pode exportar relatórios</TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
          </div>
        </CardHeader>
      </Card>

      {/* Cards de resumo */}
      <AdminStatsCards stats={resumo} isLoading={isLoading} type="orders" />

      {/* Campo de busca e paginação */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-4">
        <Input
          placeholder="Buscar por nome ou email do cliente..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="max-w-xs"
        />
        <div className="flex items-center gap-2 mt-2 md:mt-0">
          <span className="text-sm text-muted-foreground">{filteredOrders.length} pedidos</span>
          <Button variant="ghost" size="icon" disabled={page === 1} onClick={() => setPage(1)}>&laquo;</Button>
          <Button variant="ghost" size="icon" disabled={page === 1} onClick={() => setPage(p => Math.max(1, p - 1))}>&lsaquo;</Button>
          <span className="text-sm">Página {page} de {totalPages}</span>
          <Button variant="ghost" size="icon" disabled={page === totalPages} onClick={() => setPage(p => Math.min(totalPages, p + 1))}>&rsaquo;</Button>
          <Button variant="ghost" size="icon" disabled={page === totalPages} onClick={() => setPage(totalPages)}>&raquo;</Button>
        </div>
      </div>

      {/* Tabs e tabela */}
      <Tabs defaultValue="all" value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="all">Todas</TabsTrigger>
          <TabsTrigger value="paid">Pago</TabsTrigger>
          <TabsTrigger value="pending">Falta pagar</TabsTrigger>
          <TabsTrigger value="cancelled">Cancelado</TabsTrigger>
        </TabsList>
        <TabsContent value={activeTab} className="mt-6">
          {isLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : error ? (
            <div className="rounded-lg bg-destructive/10 p-6 text-center">
              <p className="text-destructive font-medium">Erro ao carregar vendas</p>
              <p className="text-sm text-muted-foreground mt-2">
                {(error as Error).message || "Ocorreu um erro ao carregar as vendas."}
              </p>
            </div>
          ) : !orders || orders.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 border rounded-lg bg-muted/20">
              <Smile className="h-16 w-16 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">Nenhuma venda de produto encontrada</h3>
              <p className="text-muted-foreground mb-2">Ainda não há vendas de produtos cadastradas na plataforma.</p>
              <span className="text-xs text-muted-foreground">As vendas aparecerão aqui assim que forem realizadas.</span>
            </div>
          ) : (
            <div className="border rounded-md overflow-x-auto bg-white">
              <Table className="min-w-[800px]">
                <TableHeader>
                  <TableRow>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Data</TableHead>
                    <TableHead>Produtos</TableHead>
                    <TableHead>Valor Total</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedOrders.map(order => {
                    const user = order.user;
                    const customerName = user ? `${user.first_name || ''} ${user.last_name || ''}`.trim() : order.user_id;
                    
                    return (
                      <TableRow key={order.id}>
                        <TableCell>{customerName}</TableCell>
                        <TableCell>{format(new Date(order.created_at), "dd/MM/yyyy")}</TableCell>
                        <TableCell>
                          {order.order_items && order.order_items.length > 0 ? (
                            <ul className="list-disc list-inside">
                              {order.order_items.map((item: any, idx: number) => (
                                <li key={idx} className="text-sm">
                                  {item.quantity}x {item.product?.name || "Produto"}
                                </li>
                              ))}
                            </ul>
                          ) : (
                            "-"
                          )}
                        </TableCell>
                        <TableCell>R$ {order.total_amount?.toFixed(2) || "0,00"}</TableCell>
                        <TableCell>
                          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold shadow-sm
                            ${order.status === "paid"
                              ? "bg-green-200 text-green-900"
                              : order.status === "pending" || order.status === "awaiting_payment"
                              ? "bg-yellow-200 text-yellow-900"
                              : "bg-red-200 text-red-900"}
                          `}>
                            {translateStatus(order.status)}
                          </span>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button size="icon" variant="ghost" title="Ver detalhes" onClick={() => { setSelectedOrder(order); setShowDetails(true); }}>
                              <Eye className="h-4 w-4" />
                            </Button>
                            {(order.status === "pending" || order.status === "awaiting_payment") && (
                              isSuperAdmin ? (
                                <>
                                  <Button size="icon" variant="ghost" title="Marcar como pago" disabled={actionLoading} onClick={() => handleMarkAsPaid(order.id)}>
                                    {actionLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4 text-green-600" />}
                                  </Button>
                                  <Button size="icon" variant="ghost" title="Cancelar pedido" disabled={actionLoading} onClick={() => handleCancelOrder(order.id)}>
                                    {actionLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <XCircle className="h-4 w-4 text-red-600" />}
                                  </Button>
                                </>
                              ) : (
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <span>
                                      <Button size="icon" variant="ghost" disabled title="Apenas superadmin">
                                        <CheckCircle className="h-4 w-4 text-green-600" />
                                      </Button>
                                      <Button size="icon" variant="ghost" disabled title="Apenas superadmin">
                                        <XCircle className="h-4 w-4 text-red-600" />
                                      </Button>
                                    </span>
                                  </TooltipTrigger>
                                  <TooltipContent>Somente superadmin pode alterar status de pedidos</TooltipContent>
                                </Tooltip>
                              )
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Modal de detalhes do pedido */}
      <Dialog open={showDetails} onOpenChange={setShowDetails}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Detalhes do Pedido</DialogTitle>
            <DialogDescription>
              Veja informações completas do pedido selecionado.
            </DialogDescription>
          </DialogHeader>
          {selectedOrder && (
            <div className="space-y-3">
              <div>
                <span className="font-semibold">Cliente:</span> {
                  selectedOrder.user 
                    ? `${selectedOrder.user.first_name || ''} ${selectedOrder.user.last_name || ''}`.trim() 
                    : selectedOrder.user_id
                }
              </div>
              <div>
                <span className="font-semibold">Data:</span> {format(new Date(selectedOrder.created_at), "dd/MM/yyyy HH:mm")}
              </div>
              <div>
                <span className="font-semibold">Status:</span> {translateStatus(selectedOrder.status)}
              </div>
              <div>
                <span className="font-semibold">Produtos:</span>
                {selectedOrder.order_items && selectedOrder.order_items.length > 0 ? (
                  <ul className="list-disc list-inside ml-4">
                    {selectedOrder.order_items.map((item: any, idx: number) => (
                      <li key={idx}>{item.quantity}x {item.product?.name || "Produto"} (R$ {item.price_per_unit?.toFixed(2) || "-"})</li>
                    ))}
                  </ul>
                ) : (
                  <span> - </span>
                )}
              </div>
              <div>
                <span className="font-semibold">Valor Total:</span> R$ {selectedOrder.total_amount?.toFixed(2) || "0,00"}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
