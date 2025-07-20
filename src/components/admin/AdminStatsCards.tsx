import React from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface AdminStatsCardsProps {
  stats: {
    total: number;
    faturado?: number;
    pagas: number;
    pendentes: number;
    canceladas: number;
  };
  isLoading: boolean;
  type: "orders" | "bookings" | "equipment";
}

export const AdminStatsCards: React.FC<AdminStatsCardsProps> = ({ stats, isLoading, type }) => {
  const getLabels = () => {
    switch (type) {
      case "orders":
        return {
          total: "Total de Vendas",
          paid: "Vendas Pagas",
          pending: "Vendas Pendentes",
          cancelled: "Vendas Canceladas"
        };
      case "bookings":
        return {
          total: "Total de Reservas",
          paid: "Reservas Pagas", 
          pending: "Reservas Pendentes",
          cancelled: "Reservas Canceladas"
        };
      case "equipment":
        return {
          total: "Total de Equipamentos",
          paid: "Equipamentos Pagos",
          pending: "Equipamentos Pendentes", 
          cancelled: "Equipamentos Cancelados"
        };
      default:
        return {
          total: "Total",
          paid: "Pagas",
          pending: "Pendentes",
          cancelled: "Canceladas"
        };
    }
  };

  const labels = getLabels();

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-3 sm:gap-4">
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Card className="rounded-xl md:rounded-2xl">
              <CardHeader className="pb-1 sm:pb-2 p-3 sm:p-6">
                <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground truncate">{labels.total}</CardTitle>
              </CardHeader>
              <CardContent className="p-3 sm:p-6 pt-0">
                <div className="text-xl sm:text-2xl md:text-3xl font-bold">
                  {isLoading ? <Skeleton className="h-6 sm:h-8 w-12 sm:w-16" /> : stats.total}
                </div>
              </CardContent>
            </Card>
          </TooltipTrigger>
          <TooltipContent>Total de registros</TooltipContent>
        </Tooltip>
      </TooltipProvider>

      {stats.faturado !== undefined && (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Card className="rounded-xl md:rounded-2xl">
                <CardHeader className="pb-1 sm:pb-2 p-3 sm:p-6">
                  <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground truncate">Faturamento</CardTitle>
                </CardHeader>
                <CardContent className="p-3 sm:p-6 pt-0">
                  <div className="text-lg sm:text-xl md:text-2xl lg:text-3xl font-bold text-green-700 truncate">
                    {isLoading ? <Skeleton className="h-6 sm:h-8 w-16 sm:w-24" /> : `R$ ${stats.faturado.toFixed(2)}`}
                  </div>
                </CardContent>
              </Card>
            </TooltipTrigger>
            <TooltipContent>Somatório dos valores pagos</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )}

      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Card className="rounded-xl md:rounded-2xl">
              <CardHeader className="pb-1 sm:pb-2 p-3 sm:p-6">
                <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground truncate">{labels.paid}</CardTitle>
              </CardHeader>
              <CardContent className="p-3 sm:p-6 pt-0">
                <div className="text-xl sm:text-2xl md:text-3xl font-bold text-green-600">
                  {isLoading ? <Skeleton className="h-6 sm:h-8 w-8 sm:w-12" /> : stats.pagas}
                </div>
              </CardContent>
            </Card>
          </TooltipTrigger>
          <TooltipContent>Registros já pagos e confirmados</TooltipContent>
        </Tooltip>
      </TooltipProvider>

      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Card className="rounded-xl md:rounded-2xl">
              <CardHeader className="pb-1 sm:pb-2 p-3 sm:p-6">
                <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground truncate">{labels.pending}</CardTitle>
              </CardHeader>
              <CardContent className="p-3 sm:p-6 pt-0">
                <div className="text-xl sm:text-2xl md:text-3xl font-bold text-yellow-600">
                  {isLoading ? <Skeleton className="h-6 sm:h-8 w-8 sm:w-12" /> : stats.pendentes}
                </div>
              </CardContent>
            </Card>
          </TooltipTrigger>
          <TooltipContent>Registros aguardando pagamento</TooltipContent>
        </Tooltip>
      </TooltipProvider>

      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Card className="rounded-xl md:rounded-2xl">
              <CardHeader className="pb-1 sm:pb-2 p-3 sm:p-6">
                <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground truncate">{labels.cancelled}</CardTitle>
              </CardHeader>
              <CardContent className="p-3 sm:p-6 pt-0">
                <div className="text-xl sm:text-2xl md:text-3xl font-bold text-red-600">
                  {isLoading ? <Skeleton className="h-6 sm:h-8 w-8 sm:w-12" /> : stats.canceladas}
                </div>
              </CardContent>
            </Card>
          </TooltipTrigger>
          <TooltipContent>Registros cancelados por falta de pagamento</TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </div>
  );
};