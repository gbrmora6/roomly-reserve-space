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
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">{labels.total}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">
                  {isLoading ? <Skeleton className="h-8 w-16" /> : stats.total}
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
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Faturamento</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-green-700">
                    {isLoading ? <Skeleton className="h-8 w-24" /> : `R$ ${stats.faturado.toFixed(2)}`}
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
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">{labels.paid}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-green-600">
                  {isLoading ? <Skeleton className="h-8 w-12" /> : stats.pagas}
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
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">{labels.pending}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-yellow-600">
                  {isLoading ? <Skeleton className="h-8 w-12" /> : stats.pendentes}
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
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">{labels.cancelled}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-red-600">
                  {isLoading ? <Skeleton className="h-8 w-12" /> : stats.canceladas}
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