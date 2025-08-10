
import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Eye, CreditCard, X } from 'lucide-react';
import { formatCurrency } from '@/utils/formatCurrency';

import { useAuth } from '@/contexts/AuthContext';

interface ProductOrder {
  id: string;
  user_id: string;
  total_amount: number;
  status: 'pending' | 'billed' | 'paid' | 'cancelled';
  payment_method?: string;
  created_at: string;
  updated_at: string;
  profiles: {
    first_name: string;
    last_name: string;
    email: string;
    phone: string;
  };
  order_items: Array<{
    id: string;
    product_id: string;
    quantity: number;
    price_per_unit: number;
    products: {
      name: string;
      price: number;
    };
  }>;
}

interface ProductSalesTableProps {
  orders: ProductOrder[];
  currentPage: number;
  totalPages: number;
  setCurrentPage: (page: number) => void;
  onViewDetails: (order: ProductOrder) => void;
  onMarkAsPaid: (orderId: string) => void;
  onCancelOrder: (orderId: string) => void;
  translateStatus: (status: string) => string;
}

const STATUS_BADGE = {
  pending: 'bg-yellow-100 text-yellow-800',
  billed: 'bg-blue-100 text-blue-800',
  paid: 'bg-green-100 text-green-800',
  cancelled: 'bg-red-100 text-red-800'
};

export function ProductSalesTable({
  orders,
  currentPage,
  totalPages,
  setCurrentPage,
  onViewDetails,
  onMarkAsPaid,
  onCancelOrder,
  translateStatus
}: ProductSalesTableProps) {
  const { user } = useAuth();
  const isSuperAdmin = user?.user_metadata?.role === 'super_admin';

  const getCustomerName = (profiles: ProductOrder['profiles']) => {
    if (!profiles) return 'N/A';
    return `${profiles.first_name || ''} ${profiles.last_name || ''}`.trim() || 'N/A';
  };

  if (orders.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-16">
          <div className="text-center">
            <h3 className="text-lg font-semibold mb-2">Nenhuma venda encontrada</h3>
            <p className="text-muted-foreground">
              Não há vendas de produtos para exibir no momento.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
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
                {orders.map((order) => (
                  <TableRow key={order.id}>
                    <TableCell>
                      <div>
                        <div className="font-medium">
                          {getCustomerName(order.profiles)}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {order.profiles?.email || 'N/A'}
                        </div>
                      </div>
                    </TableCell>
                    
                    <TableCell>
                      <div className="text-sm">
                        {new Date(order.created_at).toLocaleDateString('pt-BR')}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {new Date(order.created_at).toLocaleTimeString('pt-BR')}
                      </div>
                    </TableCell>
                    
                    <TableCell>
                      <div className="text-sm">
                        {order.order_items?.length || 0} item(s)
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {order.order_items?.[0]?.products?.name}
                        {order.order_items?.length > 1 && ` +${order.order_items.length - 1} mais`}
                      </div>
                    </TableCell>
                    
                    <TableCell>
                      <div className="font-medium">
                        {formatCurrency(order.total_amount)}
                      </div>
                    </TableCell>
                    
                    <TableCell>
                      <Badge 
                        className={STATUS_BADGE[order.status as keyof typeof STATUS_BADGE]}
                      >
                        {translateStatus(order.status)}
                      </Badge>
                    </TableCell>
                    
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => onViewDetails(order)}
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          Ver detalhes
                        </Button>
                        
                        {order.status === 'billed' && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => onMarkAsPaid(order.id)}
                            className="text-green-600 hover:text-green-700"
                          >
                            <CreditCard className="h-4 w-4 mr-1" />
                            Marcar como pago
                          </Button>
                        )}
                        
                        {/* Cancelamento removido desta página conforme regra: disponível apenas em Pedidos Completos */}
                        
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
      
      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
            disabled={currentPage === 1}
          >
            Anterior
          </Button>
          
          <span className="text-sm text-muted-foreground">
            Página {currentPage} de {totalPages}
          </span>
          
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
            disabled={currentPage === totalPages}
          >
            Próxima
          </Button>
        </div>
      )}
    </div>
  );
}
