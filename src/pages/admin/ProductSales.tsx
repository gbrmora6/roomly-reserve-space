
import React from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ShoppingBag, Smile } from "lucide-react";
import { ProductSalesFilters } from "@/components/admin/product/ProductSalesFilters";
import { ProductSalesTable } from "@/components/admin/product/ProductSalesTable";
import { ProductSalesDetailsModal } from "@/components/admin/product/ProductSalesDetailsModal";
import { useProductSales } from "@/hooks/useProductSales";



export default function ProductSales() {
  const {
    activeTab,
    setActiveTab,
    branchId,
    setBranchId,
    branches,
    isSuperAdmin,
    orders,
    isLoading,
    error,
    selectedOrder,
    showDetails,
    search,
    setSearch,
    page,
    setPage,
    totalPages,
    paginatedOrders,
    resumo,
    downloadReport,
    handleCancelOrder,
    handleMarkAsPaid,
    handleViewDetails,
    handleCloseDetails
  } = useProductSales();

  return (
    <div className="space-y-6 md:space-y-8 max-w-7xl mx-auto px-2 sm:px-4 pb-8 md:pb-10">
      {/* Título */}
      <Card className="shadow-lg rounded-xl md:rounded-2xl border-0 bg-white">
        <CardHeader className="p-4 md:p-6">
          <div className="flex items-center gap-2 md:gap-3">
            <ShoppingBag className="h-6 w-6 md:h-8 md:w-8 text-primary flex-shrink-0" />
            <div className="min-w-0">
              <CardTitle className="text-xl sm:text-2xl md:text-3xl font-bold leading-tight">Vendas de Produtos</CardTitle>
              <CardDescription className="text-muted-foreground mt-1 text-sm md:text-base">
                Acompanhe todos os pedidos e vendas de produtos realizados na plataforma.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Filtros e estatísticas */}
      <ProductSalesFilters
        branchId={branchId}
        setBranchId={setBranchId}
        branches={branches}
        isSuperAdmin={isSuperAdmin}
        search={search}
        setSearch={setSearch}
        page={page}
        setPage={setPage}
        totalPages={totalPages}
        totalOrders={paginatedOrders.length}
        resumo={resumo}
        isLoading={isLoading}
        onDownloadReport={downloadReport}
      />

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
            <ProductSalesTable
              orders={paginatedOrders}
              isSuperAdmin={isSuperAdmin}
              onViewDetails={handleViewDetails}
              onMarkAsPaid={handleMarkAsPaid}
              onCancelOrder={handleCancelOrder}
            />
          )}
        </TabsContent>
      </Tabs>

      {/* Modal de detalhes */}
      <ProductSalesDetailsModal
        order={selectedOrder}
        isOpen={showDetails}
        onClose={handleCloseDetails}
      />
    </div>
  );
}
