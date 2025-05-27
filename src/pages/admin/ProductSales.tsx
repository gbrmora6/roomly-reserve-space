
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

// Mapeamento dos status dos pedidos para tradução em português
const STATUS_MAP = {
  all: "Todas",
  paid: "Pago",
  pending: "Falta pagar",
  cancelled: "Cancelado por falta de pagamento",
};

/**
 * Função para traduzir status dos pedidos para português
 * @param status - Status do pedido em inglês
 * @returns Status traduzido para português
 */
function translateStatus(status: string) {
  if (status === "paid") return "Pago";
  if (status === "pending" || status === "awaiting_payment") return "Falta pagar";
  if (status === "cancelled" || status === "cancelled_due_to_payment") return "Cancelado por falta de pagamento";
  return status;
}

/**
 * Função para converter aba selecionada em array de status para filtro
 * @param tab - Aba ativa selecionada
 * @returns Array de status ou null para todos
 */
function statusForTab(tab: string) {
  if (tab === "all") return null;
  if (tab === "paid") return ["paid"];
  if (tab === "pending") return ["pending", "awaiting_payment"];
  if (tab === "cancelled") return ["cancelled", "cancelled_due_to_payment"];
  return null;
}

/**
 * Componente principal da página de vendas de produtos
 * Exibe lista de pedidos, estatísticas e permite gerenciamento para admins
 */
export default function ProductSales() {
  // Estado para controlar qual aba está ativa (todas, pagas, pendentes, canceladas)
  const [activeTab, setActiveTab] = useState("all");
  
  // Hook personalizado para filtrar por filial (branch)
  const { branchId, setBranchId, branches, isSuperAdmin } = useBranchFilter();
  
  // Estado para controlar qual pedido está selecionado no modal de detalhes
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  
  // Estado para controlar se o modal de detalhes está aberto
  const [showDetails, setShowDetails] = useState(false);
  
  // Estado para controlar loading durante ações (cancelar, marcar como pago)
  const [actionLoading, setActionLoading] = useState(false);
  
  // Estado para controlar o termo de busca por cliente
  const [search, setSearch] = useState("");
  
  // Estados para controle de paginação
  const [page, setPage] = useState(1);
  const perPage = 10;
  
  // Estado para armazenar ID do último pedido (para notificação de novos pedidos)
  const [lastOrderId, setLastOrderId] = useState<string | null>(null);

  // Query para buscar pedidos da filial selecionada
  const { data: orders = [], isLoading, error, refetch } = useQuery({
    queryKey: ["admin-product-sales", activeTab, branchId],
    queryFn: async () => {
      // Se não há filial selecionada, retorna array vazio
      if (!branchId) return [];
      
      // Monta query base para buscar pedidos com itens e produtos relacionados
      let query = supabase
        .from("orders")
        .select(`
          id,
          user_id,
          created_at,
          status,
          total_amount,
          branch_id,
          order_items(
            quantity,
            price_per_unit,
            product:products(name)
          )
        `)
        .eq("branch_id", branchId)
        .order("created_at", { ascending: false });
        
      // Aplica filtro de status se não for "all"
      const statusList = statusForTab(activeTab);
      if (statusList) {
        query = query.in("status", statusList);
      }
      
      // Executa query para buscar pedidos
      const { data: ordersData, error: ordersError } = await query;
      if (ordersError) throw ordersError;
      
      if (!ordersData || ordersData.length === 0) return [];

      // Busca dados dos usuários separadamente para evitar problemas de RLS
      const userIds = [...new Set(ordersData.map(order => order.user_id))];
      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("id, first_name, last_name")
        .in("id", userIds);

      if (profilesError) {
        console.error("Error fetching profiles:", profilesError);
        // Retorna pedidos sem dados do usuário se não conseguir buscar perfis
        return ordersData.map(order => ({ ...order, user: null }));
      }

      // Cria mapa de perfis para busca rápida
      const profilesMap = new Map(profiles?.map(profile => [profile.id, profile]) || []);

      // Combina dados dos pedidos com dados dos usuários
      return ordersData.map(order => ({
        ...order,
        user: profilesMap.get(order.user_id) || null
      }));
    },
    enabled: !!branchId, // Só executa se há filial selecionada
    refetchInterval: 30000, // Atualiza automaticamente a cada 30 segundos
  });

  // Efeito para notificar sobre novos pedidos
  React.useEffect(() => {
    if (!orders || orders.length === 0) return;
    if (!lastOrderId) {
      setLastOrderId(orders[0].id);
      return;
    }
    // Se o primeiro pedido mudou, significa que há um novo pedido
    if (orders[0].id !== lastOrderId) {
      setLastOrderId(orders[0].id);
      const user = orders[0].user;
      const userName = user?.first_name || 'um cliente';
      toast({
        title: "Novo pedido recebido!",
        description: `Um novo pedido foi realizado por ${userName}.`,
      });
    }
  }, [orders, lastOrderId]);

  // Cálculo das estatísticas de resumo (total, faturado, pagas, pendentes, canceladas)
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
    
    // Conta pedidos por status e calcula faturamento
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

  // Filtro de busca por nome do cliente
  const filteredOrders = useMemo(() => {
    if (!orders) return [];
    if (!search.trim()) return orders;
    
    const s = search.trim().toLowerCase();
    return orders.filter(order => {
      const user = order.user;
      const name = user?.first_name ? `${user.first_name || ''} ${user.last_name || ''}`.toLowerCase() : "";
      return name.includes(s);
    });
  }, [orders, search]);

  // Paginação dos resultados filtrados
  const totalPages = Math.ceil(filteredOrders.length / perPage) || 1;
  const paginatedOrders = useMemo(() => {
    const start = (page - 1) * perPage;
    return filteredOrders.slice(start, start + perPage);
  }, [filteredOrders, page]);

  // Reseta página ao alterar busca, aba ou filial
  React.useEffect(() => { setPage(1); }, [search, activeTab, branchId]);

  /**
   * Função para exportar relatório em Excel
   * Disponível apenas para super admins
   */
  const downloadReport = () => {
    if (!orders || orders.length === 0) {
      toast({
        title: "Sem dados para exportar",
        description: "Não há vendas de produtos para gerar o relatório."
      });
      return;
    }
    
    try {
      // Prepara dados para exportação
      const exportData = orders.map(order => {
        const produtos = order.order_items && order.order_items.length > 0
          ? order.order_items.map(item => `${item.quantity}x ${item.product?.name || "Produto"}`).join("; ")
          : "-";
        const user = order.user;
        
        return {
          "ID": order.id,
          "Cliente": user?.first_name ? `${user.first_name || ''} ${user.last_name || ''}`.trim() : order.user_id,
          "Data": format(new Date(order.created_at), "dd/MM/yyyy"),
          "Produtos": produtos,
          "Valor Total": `R$ ${order.total_amount?.toFixed(2) || "0.00"}`,
          "Status": translateStatus(order.status)
        };
      });
      
      // Cria planilha Excel
      const worksheet = XLSX.utils.json_to_sheet(exportData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Vendas de Produtos");
      
      // Gera arquivo com data atual no nome
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

  /**
   * Função para cancelar um pedido
   * Disponível apenas para super admins
   * @param orderId - ID do pedido a ser cancelado
   */
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
      // Atualiza lista de pedidos
      await refetch();
    }
  };

  /**
   * Função para marcar pedido como pago
   * Disponível apenas para super admins
   * @param orderId - ID do pedido a ser marcado como pago
   */
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

  /**
   * Função para obter nome do usuário ou fallback
   * @param user - Objeto do usuário
   * @returns Nome formatado ou "Cliente" se não disponível
   */
  const getUserName = (user: any) => {
    if (!user) return "Cliente";
    return user.first_name ? `${user.first_name || ''} ${user.last_name || ''}`.trim() || "Cliente" : "Cliente";
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto px-4 pb-10">
      {/* Seletor de filial - visível apenas para super admins */}
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
      
      {/* Cabeçalho da página com título e botão de exportação */}
      <Card className="shadow-lg rounded-2xl border-0 bg-white p-6 mb-8">
        <CardHeader>
          <CardTitle className="text-2xl font-bold flex items-center gap-2 text-gray-900">
            <ShoppingBag className="h-7 w-7 text-blue-700" /> Vendas de Produtos
          </CardTitle>
          <CardDescription className="text-gray-500">Veja todos os pedidos e vendas de produtos realizados na plataforma</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mt-2">
            <div className="flex items-center gap-3">
              <ShoppingBag className="h-8 w-8 text-primary" />
              <div>
                <h1 className="text-3xl font-bold leading-tight">Vendas de Produtos</h1>
                <p className="text-muted-foreground mt-1 text-base">Acompanhe todos os pedidos e vendas de produtos realizados na plataforma.</p>
              </div>
            </div>
            {/* Botão de exportação - disponível apenas para super admin */}
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
        </CardContent>
      </Card>

      {/* Cards de estatísticas resumidas */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-4">
        {/* Total de vendas */}
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Total de Vendas</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">{isLoading ? <Skeleton className="h-8 w-16" /> : resumo.total}</div>
                </CardContent>
              </Card>
            </TooltipTrigger>
            <TooltipContent>Total de pedidos realizados nesta filial</TooltipContent>
          </Tooltip>
        </TooltipProvider>
        
        {/* Faturamento total */}
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Faturamento</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-green-700">{isLoading ? <Skeleton className="h-8 w-24" /> : `R$ ${resumo.faturado.toFixed(2)}`}</div>
                </CardContent>
              </Card>
            </TooltipTrigger>
            <TooltipContent>Somatório dos valores pagos</TooltipContent>
          </Tooltip>
        </TooltipProvider>
        
        {/* Vendas pagas */}
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Pagas</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-green-600">{isLoading ? <Skeleton className="h-8 w-12" /> : resumo.pagas}</div>
                </CardContent>
              </Card>
            </TooltipTrigger>
            <TooltipContent>Pedidos já pagos e confirmados</TooltipContent>
          </Tooltip>
        </TooltipProvider>
        
        {/* Vendas pendentes */}
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Pendentes</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-yellow-600">{isLoading ? <Skeleton className="h-8 w-12" /> : resumo.pendentes}</div>
                </CardContent>
              </Card>
            </TooltipTrigger>
            <TooltipContent>Pedidos aguardando pagamento</TooltipContent>
          </Tooltip>
        </TooltipProvider>
        
        {/* Vendas canceladas */}
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Canceladas</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-red-600">{isLoading ? <Skeleton className="h-8 w-12" /> : resumo.canceladas}</div>
                </CardContent>
              </Card>
            </TooltipTrigger>
            <TooltipContent>Pedidos cancelados por falta de pagamento</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>

      {/* Barra de busca e controles de paginação */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-4">
        {/* Campo de busca por nome do cliente */}
        <Input
          placeholder="Buscar por nome ou email do cliente..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="max-w-xs"
        />
        
        {/* Controles de paginação */}
        <div className="flex items-center gap-2 mt-2 md:mt-0">
          <span className="text-sm text-muted-foreground">{filteredOrders.length} pedidos</span>
          <Button variant="ghost" size="icon" disabled={page === 1} onClick={() => setPage(1)}>&laquo;</Button>
          <Button variant="ghost" size="icon" disabled={page === 1} onClick={() => setPage(p => Math.max(1, p - 1))}>&lsaquo;</Button>
          <span className="text-sm">Página {page} de {totalPages}</span>
          <Button variant="ghost" size="icon" disabled={page === totalPages} onClick={() => setPage(p => Math.min(totalPages, p + 1))}>&rsaquo;</Button>
          <Button variant="ghost" size="icon" disabled={page === totalPages} onClick={() => setPage(totalPages)}>&raquo;</Button>
        </div>
      </div>

      {/* Abas para filtrar por status dos pedidos */}
      <Tabs defaultValue="all" value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="all">Todas</TabsTrigger>
          <TabsTrigger value="paid">Pago</TabsTrigger>
          <TabsTrigger value="pending">Falta pagar</TabsTrigger>
          <TabsTrigger value="cancelled">Cancelado</TabsTrigger>
        </TabsList>
        
        {/* Conteúdo da aba ativa */}
        <TabsContent value={activeTab} className="mt-6">
          {/* Estado de carregamento */}
          {isLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : error ? (
            /* Estado de erro */
            <div className="rounded-lg bg-destructive/10 p-6 text-center">
              <p className="text-destructive font-medium">Erro ao carregar vendas</p>
              <p className="text-sm text-muted-foreground mt-2">
                {(error as Error).message || "Ocorreu um erro ao carregar as vendas."}
              </p>
            </div>
          ) : !orders || orders.length === 0 ? (
            /* Estado vazio - nenhuma venda encontrada */
            <div className="flex flex-col items-center justify-center py-16 border rounded-lg bg-muted/20">
              <Smile className="h-16 w-16 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">Nenhuma venda de produto encontrada</h3>
              <p className="text-muted-foreground mb-2">Ainda não há vendas de produtos cadastradas na plataforma.</p>
              <span className="text-xs text-muted-foreground">As vendas aparecerão aqui assim que forem realizadas.</span>
            </div>
          ) : (
            /* Tabela de pedidos */
            <div className="border rounded-md overflow-x-auto bg-white">
              <Table className="min-w-[800px]">
                <TableHeader>
                  <TableRow>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Data</TableHead>
                    <TableHead>Produtos</TableHead>
                    <TableHead>Valor Total</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedOrders.map(order => (
                    <TableRow key={order.id}>
                      {/* Nome do cliente */}
                      <TableCell>{getUserName(order.user)}</TableCell>
                      
                      {/* Email/ID do usuário */}
                      <TableCell>{order.user_id || '-'}</TableCell>
                      
                      {/* Data do pedido */}
                      <TableCell>{format(new Date(order.created_at), "dd/MM/yyyy")}</TableCell>
                      
                      {/* Lista de produtos */}
                      <TableCell>
                        {order.order_items && order.order_items.length > 0 ? (
                          <ul className="list-disc list-inside">
                            {order.order_items.map((item, idx) => (
                              <li key={idx} className="text-sm">
                                {item.quantity}x {item.product?.name || "Produto"}
                              </li>
                            ))}
                          </ul>
                        ) : (
                          "-"
                        )}
                      </TableCell>
                      
                      {/* Valor total */}
                      <TableCell>R$ {order.total_amount?.toFixed(2) || "0,00"}</TableCell>
                      
                      {/* Status com cores */}
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
                      
                      {/* Ações disponíveis */}
                      <TableCell>
                        <div className="flex gap-2">
                          {/* Botão para ver detalhes (sempre disponível) */}
                          <Button size="icon" variant="ghost" title="Ver detalhes" onClick={() => { setSelectedOrder(order); setShowDetails(true); }}>
                            <Eye className="h-4 w-4" />
                          </Button>
                          
                          {/* Ações para pedidos pendentes */}
                          {(order.status === "pending" || order.status === "awaiting_payment") && (
                            isSuperAdmin ? (
                              /* Botões para super admin */
                              <>
                                <Button size="icon" variant="ghost" title="Marcar como pago" disabled={actionLoading} onClick={() => handleMarkAsPaid(order.id)}>
                                  {actionLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4 text-green-600" />}
                                </Button>
                                <Button size="icon" variant="ghost" title="Cancelar pedido" disabled={actionLoading} onClick={() => handleCancelOrder(order.id)}>
                                  {actionLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <XCircle className="h-4 w-4 text-red-600" />}
                                </Button>
                              </>
                            ) : (
                              /* Botões desabilitados para não-admin com tooltip explicativo */
                              <TooltipProvider>
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
                              </TooltipProvider>
                            )
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
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
              {/* Informações do cliente */}
              <div>
                <span className="font-semibold">Cliente:</span> {getUserName(selectedOrder.user)}
              </div>
              <div>
                <span className="font-semibold">Email:</span> {selectedOrder.user_id || '-'}
              </div>
              
              {/* Data e hora do pedido */}
              <div>
                <span className="font-semibold">Data:</span> {format(new Date(selectedOrder.created_at), "dd/MM/yyyy HH:mm")}
              </div>
              
              {/* Status atual */}
              <div>
                <span className="font-semibold">Status:</span> {translateStatus(selectedOrder.status)}
              </div>
              
              {/* Lista detalhada de produtos */}
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
              
              {/* Valor total */}
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
