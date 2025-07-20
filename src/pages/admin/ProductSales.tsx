
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
import { useQueryClient } from "@tanstack/react-query";
import { InvoiceUpload } from "@/components/admin/InvoiceUpload";
import { PaymentStatusManager } from "@/components/admin/PaymentStatusManager";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { AdminStatsCards } from "@/components/admin/AdminStatsCards";
import { PaymentCard } from "@/components/orders/PaymentCard";
import { RefundButton } from "@/components/admin/RefundButton";
import { useOrders } from "@/hooks/useOrders";

const STATUS_MAP = {
  all: "Todas",
  paid: "Pago",
  pending: "Falta pagar",
  cancelled: "Cancelado por falta de pagamento",
  in_process: "Em processamento",
  pre_authorized: "Pré-autorizado",
  recused: "Recusado",
};

const STATUS_BADGE = {
  paid: "bg-green-100 text-green-800",
  pending: "bg-yellow-100 text-yellow-800",
  cancelled: "bg-red-100 text-red-800",
};

function translateStatus(status: string) {
  if (status === "paid") return "Pago";
  if (status === "pending" || status === "awaiting_payment" || status === "in_process" || status === "pre_authorized") return "Falta pagar";
  if (status === "recused") return "Cancelado por falta de pagamento";
  return status;
}

function statusForTab(tab: string) {
  if (tab === "all") return null;
  if (tab === "paid") return ["paid"];
  if (tab === "pending") return ["pending", "awaiting_payment", "in_process", "pre_authorized"];
  if (tab === "cancelled") return ["recused"];
  return null;
}

interface OrderWithUser {
  id: string;
  user_id: string;
  created_at: string;
  status: string;
  total_amount: number;
  branch_id: string;
  payment_method?: string;
  payment_data?: any;
  invoice_url?: string;
  invoice_uploaded_at?: string;
  invoice_uploaded_by?: string;
  order_items: {
    quantity: number;
    price_per_unit: number;
    product: {
      name: string;
    } | null;
  }[];
  payment_details?: any[];
  user?: {
    id: string;
    first_name: string | null;
    last_name: string | null;
  } | null;
}

export default function ProductSales() {
  const [activeTab, setActiveTab] = useState("all");
  const { branchId, setBranchId, branches, isSuperAdmin } = useBranchFilter();
  

  const queryClient = useQueryClient();
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
      if (!branchId) {
        return [];
      }
      
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
          invoice_url,
          invoice_uploaded_at,
          invoice_uploaded_by,
          order_items(
            quantity,
            price_per_unit,
            product:products(name)
          ),
          payment_details(*)
        `)
        .eq("branch_id", branchId)
        .order("created_at", { ascending: false });

      // Filtrar por status se não for "all"
      const statusList = statusForTab(activeTab);
      if (statusList) {
        query = query.in("status", statusList);
      }
      
      const { data, error } = await query;
      
      if (error) {
        console.error("ProductSales Query Error:", error);
        throw error;
      }
      
      // Filter only orders that have order_items (product sales)
      const ordersWithProducts = data?.filter(order => 
        order.order_items && order.order_items.length > 0
      ) || [];
      
      // Fetch user profiles separately to avoid relation issues
      if (ordersWithProducts && ordersWithProducts.length > 0) {
        const userIds = [...new Set(ordersWithProducts.map(order => order.user_id))];
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, first_name, last_name")
          .in("id", userIds);
        
        // Attach user profiles to orders
        const finalResult = ordersWithProducts.map(order => ({
          ...order,
          user: profiles?.find(profile => profile.id === order.user_id) || null
        })) as OrderWithUser[];
        
        return finalResult;
      }
      
      return ordersWithProducts as OrderWithUser[] || [];
    },
    enabled: !!branchId,
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
      } else if (order.status === "pending" || order.status === "awaiting_payment" || order.status === "in_process" || order.status === "pre_authorized") {
        pendentes++;
      } else if (order.status === "recused") {
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
      .update({ status: "recused" })
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
    <div className="space-y-6 md:space-y-8 max-w-7xl mx-auto px-2 sm:px-4 pb-8 md:pb-10">
      {isSuperAdmin && branches && (
        <div className="mb-3 md:mb-4 max-w-full sm:max-w-xs">
          <Select value={branchId || undefined} onValueChange={setBranchId}>
            <SelectTrigger className="text-sm md:text-base">
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
      <Card className="shadow-lg rounded-xl md:rounded-2xl border-0 bg-white">
        <CardHeader className="p-4 md:p-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 md:gap-4">
            <div className="flex items-center gap-2 md:gap-3">
              <ShoppingBag className="h-6 w-6 md:h-8 md:w-8 text-primary flex-shrink-0" />
              <div className="min-w-0">
                <CardTitle className="text-xl sm:text-2xl md:text-3xl font-bold leading-tight">Vendas de Produtos</CardTitle>
                <CardDescription className="text-muted-foreground mt-1 text-sm md:text-base">
                  Acompanhe todos os pedidos e vendas de produtos realizados na plataforma.
                </CardDescription>
              </div>
            </div>
            {isSuperAdmin ? (
              <Button variant="outline" onClick={downloadReport} className="h-10 md:h-12 text-sm md:text-base font-semibold flex-shrink-0">
                <Download className="mr-2 h-4 w-4 md:h-5 md:w-5" />
                <span className="hidden sm:inline">Baixar Relatório</span>
                <span className="sm:hidden">Relatório</span>
              </Button>
            ) : (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="outline" className="h-10 md:h-12 text-sm md:text-base font-semibold flex-shrink-0" disabled>
                      <Download className="mr-2 h-4 w-4 md:h-5 md:w-5" />
                      <span className="hidden sm:inline">Baixar Relatório</span>
                      <span className="sm:hidden">Relatório</span>
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
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 md:gap-4 mb-3 md:mb-4">
        <Input
          placeholder="Buscar por nome ou email do cliente..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="max-w-full sm:max-w-xs text-sm md:text-base"
        />
        <div className="flex items-center gap-1 md:gap-2 mt-0">
          <span className="text-xs md:text-sm text-muted-foreground flex-shrink-0">{filteredOrders.length} pedidos</span>
          <Button variant="ghost" size="sm" disabled={page === 1} onClick={() => setPage(1)} className="h-8 w-8 md:h-10 md:w-10">&laquo;</Button>
          <Button variant="ghost" size="sm" disabled={page === 1} onClick={() => setPage(p => Math.max(1, p - 1))} className="h-8 w-8 md:h-10 md:w-10">&lsaquo;</Button>
          <span className="text-xs md:text-sm whitespace-nowrap">Página {page} de {totalPages}</span>
          <Button variant="ghost" size="sm" disabled={page === totalPages} onClick={() => setPage(p => Math.min(totalPages, p + 1))} className="h-8 w-8 md:h-10 md:w-10">&rsaquo;</Button>
          <Button variant="ghost" size="sm" disabled={page === totalPages} onClick={() => setPage(totalPages)} className="h-8 w-8 md:h-10 md:w-10">&raquo;</Button>
        </div>
      </div>

      {/* Tabs e tabela */}
      <Tabs defaultValue="all" value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2 sm:grid-cols-4 gap-1 h-auto p-1">
          <TabsTrigger value="all" className="text-xs sm:text-sm py-2 px-2 sm:px-3">Todas</TabsTrigger>
          <TabsTrigger value="paid" className="text-xs sm:text-sm py-2 px-2 sm:px-3">Pago</TabsTrigger>
          <TabsTrigger value="pending" className="text-xs sm:text-sm py-2 px-2 sm:px-3">Falta pagar</TabsTrigger>
          <TabsTrigger value="cancelled" className="text-xs sm:text-sm py-2 px-2 sm:px-3">Cancelado</TabsTrigger>
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
                    <TableHead className="font-semibold text-xs sm:text-sm min-w-[120px]">Cliente</TableHead>
                    <TableHead className="font-semibold text-xs sm:text-sm min-w-[80px]">Data</TableHead>
                    <TableHead className="font-semibold text-xs sm:text-sm min-w-[100px]">Produtos</TableHead>
                    <TableHead className="font-semibold text-xs sm:text-sm min-w-[90px]">Valor Total</TableHead>
                    <TableHead className="font-semibold text-xs sm:text-sm min-w-[80px]">Status</TableHead>
                    <TableHead className="font-semibold text-xs sm:text-sm text-center min-w-[120px]">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedOrders.map(order => {
                    const user = order.user;
                    const customerName = user ? `${user.first_name || ''} ${user.last_name || ''}`.trim() : order.user_id;
                    
                    return (
                      <TableRow key={order.id} className="hover:bg-muted/30 transition-colors">
                        <TableCell className="p-2 sm:p-4">
                          <div className="font-medium text-xs sm:text-sm truncate">{customerName}</div>
                        </TableCell>
                        <TableCell className="p-2 sm:p-4">
                          <div className="text-xs sm:text-sm">
                            {format(new Date(order.created_at), "dd/MM/yyyy")}
                          </div>
                        </TableCell>
                        <TableCell className="p-2 sm:p-4">
                          {order.order_items && order.order_items.length > 0 ? (
                            <div className="space-y-1">
                              {order.order_items.slice(0, 2).map((item: any, idx: number) => (
                                <div key={idx} className="text-xs sm:text-sm">
                                  {item.quantity}x {item.product?.name || "Produto"}
                                </div>
                              ))}
                              {order.order_items.length > 2 && (
                                <div className="text-xs text-muted-foreground">
                                  +{order.order_items.length - 2} mais
                                </div>
                              )}
                            </div>
                          ) : (
                            "-"
                          )}
                        </TableCell>
                        <TableCell className="p-2 sm:p-4">
                          <div className="font-semibold text-sm sm:text-base">
                            R$ {order.total_amount?.toFixed(2) || "0,00"}
                          </div>
                        </TableCell>
                        <TableCell className="p-2 sm:p-4">
                          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold shadow-sm
                            ${order.status === "paid"
                              ? "bg-green-200 text-green-900"
                              : order.status === "pending" || order.status === "awaiting_payment" || order.status === "in_process" || order.status === "pre_authorized"
                              ? "bg-yellow-200 text-yellow-900"
                              : "bg-red-200 text-red-900"}
                          `}>
                            {translateStatus(order.status)}
                          </span>
                        </TableCell>
                        <TableCell className="p-2 sm:p-4">
                          <div className="flex flex-col sm:flex-row gap-1 sm:gap-2">
                            <Button size="icon" variant="ghost" title="Ver detalhes" onClick={() => { setSelectedOrder(order); setShowDetails(true); }} className="h-8 w-8 sm:h-10 sm:w-10">
                              <Eye className="h-3 w-3 sm:h-4 sm:w-4" />
                            </Button>
                            {(order.status === "pending" || order.status === "awaiting_payment" || order.status === "in_process" || order.status === "pre_authorized") && (
                              isSuperAdmin ? (
                                <>
                                  <Button size="icon" variant="ghost" title="Marcar como pago" disabled={actionLoading} onClick={() => handleMarkAsPaid(order.id)} className="h-8 w-8 sm:h-10 sm:w-10">
                                    {actionLoading ? <Loader2 className="h-3 w-3 sm:h-4 sm:w-4 animate-spin" /> : <CheckCircle className="h-3 w-3 sm:h-4 sm:w-4 text-green-600" />}
                                  </Button>
                                  <Button size="icon" variant="ghost" title="Cancelar pedido" disabled={actionLoading} onClick={() => handleCancelOrder(order.id)} className="h-8 w-8 sm:h-10 sm:w-10">
                                    {actionLoading ? <Loader2 className="h-3 w-3 sm:h-4 sm:w-4 animate-spin" /> : <XCircle className="h-3 w-3 sm:h-4 sm:w-4 text-red-600" />}
                                  </Button>
                                </>
                              ) : (
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <span>
                                      <Button size="icon" variant="ghost" disabled title="Apenas superadmin" className="h-8 w-8 sm:h-10 sm:w-10">
                                        <CheckCircle className="h-3 w-3 sm:h-4 sm:w-4 text-green-600" />
                                      </Button>
                                      <Button size="icon" variant="ghost" disabled title="Apenas superadmin" className="h-8 w-8 sm:h-10 sm:w-10">
                                        <XCircle className="h-3 w-3 sm:h-4 sm:w-4 text-red-600" />
                                      </Button>
                                    </span>
                                  </TooltipTrigger>
                                  <TooltipContent>Somente superadmin pode alterar status de pedidos</TooltipContent>
                                </Tooltip>
                              )
                            )}
                            {/* Botão de estorno para pedidos pagos */}
                            <RefundButton
                              orderId={order.id}
                              paymentMethod={order.payment_method}
                              status={order.status}
                              onRefundSuccess={() => {
                                queryClient.invalidateQueries({ queryKey: ['orders'] });
                              }}
                              size="sm"
                            />
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
        <DialogContent className="max-w-sm sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader className="pb-3">
            <DialogTitle className="text-lg sm:text-xl">Detalhes do Pedido</DialogTitle>
            <DialogDescription className="text-sm sm:text-base">
              Veja informações completas do pedido selecionado.
            </DialogDescription>
          </DialogHeader>
          {selectedOrder && (
            <div className="space-y-3 sm:space-y-4">
              <div className="bg-muted/30 p-3 rounded-lg">
                <span className="font-semibold text-sm sm:text-base">Cliente:</span>
                <div className="text-sm sm:text-base mt-1">{
                  selectedOrder.user 
                    ? `${selectedOrder.user.first_name || ''} ${selectedOrder.user.last_name || ''}`.trim() 
                    : selectedOrder.user_id
                }</div>
              </div>
              <div className="bg-muted/30 p-3 rounded-lg">
                <span className="font-semibold text-sm sm:text-base">Data:</span>
                <div className="text-sm sm:text-base mt-1">{format(new Date(selectedOrder.created_at), "dd/MM/yyyy HH:mm")}</div>
              </div>
              <div className="bg-muted/30 p-3 rounded-lg">
                <span className="font-semibold text-sm sm:text-base">Status:</span>
                <div className="text-sm sm:text-base mt-1">{translateStatus(selectedOrder.status)}</div>
              </div>
              <div className="bg-muted/30 p-3 rounded-lg">
                <span className="font-semibold text-sm sm:text-base">Produtos:</span>
                {selectedOrder.order_items && selectedOrder.order_items.length > 0 ? (
                  <div className="mt-2 space-y-1">
                    {selectedOrder.order_items.map((item: any, idx: number) => (
                      <div key={idx} className="text-sm sm:text-base bg-white p-2 rounded border">
                        {item.quantity}x {item.product?.name || "Produto"} 
                        <span className="text-muted-foreground">(R$ {item.price_per_unit?.toFixed(2) || "-"})</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-sm sm:text-base mt-1">-</div>
                )}
              </div>
              <div className="bg-muted/30 p-3 rounded-lg">
                <span className="font-semibold text-sm sm:text-base">Valor Total:</span>
                <div className="text-lg sm:text-xl font-bold mt-1">R$ {selectedOrder.total_amount?.toFixed(2) || "0,00"}</div>
              </div>
              {selectedOrder.status === 'paid' && (
                <div className="bg-muted/30 p-3 rounded-lg">
                  <span className="font-semibold text-sm sm:text-base">Nota Fiscal:</span>
                  <div className="mt-2">
                    <InvoiceUpload
                      recordId={selectedOrder.id}
                      recordType="order"
                      currentInvoiceUrl={selectedOrder.invoice_url}
                      onSuccess={() => {
                        queryClient.invalidateQueries({ queryKey: ['orders'] });
                        setShowDetails(false);
                      }}
                    />
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
