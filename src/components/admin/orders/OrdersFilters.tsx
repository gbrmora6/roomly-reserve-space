import React from "react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, X } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";

interface OrdersFiltersProps {
  clientSearch: string;
  setClientSearch: (value: string) => void;
  orderIdSearch: string;
  setOrderIdSearch: (value: string) => void;
  statusFilter: string;
  setStatusFilter: (value: string) => void;
  paymentMethodFilter: string;
  setPaymentMethodFilter: (value: string) => void;
  dateFilter: Date | null;
  setDateFilter: (value: Date | null) => void;
  onClearFilters: () => void;
}

export const OrdersFilters: React.FC<OrdersFiltersProps> = ({
  clientSearch,
  setClientSearch,
  orderIdSearch,
  setOrderIdSearch,
  statusFilter,
  setStatusFilter,
  paymentMethodFilter,
  setPaymentMethodFilter,
  dateFilter,
  setDateFilter,
  onClearFilters
}) => {
  return (
    <div className="bg-card border rounded-lg p-4 space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium">Filtros</h3>
        <Button variant="outline" size="sm" onClick={onClearFilters}>
          <X className="h-4 w-4 mr-2" />
          Limpar Filtros
        </Button>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="space-y-2">
          <label className="text-sm font-medium">Cliente</label>
          <Input
            placeholder="Nome ou email..."
            value={clientSearch}
            onChange={(e) => setClientSearch(e.target.value)}
          />
        </div>
        
        <div className="space-y-2">
          <label className="text-sm font-medium">ID do Pedido</label>
          <Input
            placeholder="ID do pedido..."
            value={orderIdSearch}
            onChange={(e) => setOrderIdSearch(e.target.value)}
          />
        </div>
        
        <div className="space-y-2">
          <label className="text-sm font-medium">Status</label>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger>
              <SelectValue placeholder="Todos os status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os status</SelectItem>
              <SelectItem value="paid">Pago</SelectItem>
              <SelectItem value="pending">Pendente</SelectItem>
              <SelectItem value="cancelled">Cancelado</SelectItem>
              <SelectItem value="processing">Processando</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        <div className="space-y-2">
          <label className="text-sm font-medium">Forma de Pagamento</label>
          <Select value={paymentMethodFilter} onValueChange={setPaymentMethodFilter}>
            <SelectTrigger>
              <SelectValue placeholder="Todas as formas" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as formas</SelectItem>
              <SelectItem value="pix">PIX</SelectItem>
              <SelectItem value="cartao">Cartão de Crédito</SelectItem>
              <SelectItem value="boleto">Boleto</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        <div className="space-y-2">
          <label className="text-sm font-medium">Data</label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "w-full justify-start text-left font-normal",
                  !dateFilter && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {dateFilter ? format(dateFilter, "dd/MM/yyyy", { locale: ptBR }) : "Selecionar data"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={dateFilter || undefined}
                onSelect={(date) => setDateFilter(date || null)}
                initialFocus
                locale={ptBR}
              />
            </PopoverContent>
          </Popover>
        </div>
      </div>
    </div>
  );
};