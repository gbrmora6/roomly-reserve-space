
import React from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatCurrency } from '@/utils/formatCurrency';
import { InvoiceUpload } from '@/components/admin/InvoiceUpload';

interface ProductOrder {
  id: string;
  user_id: string;
  total_amount: number;
  status: 'pending' | 'billed' | 'paid' | 'cancelled';
  created_at: string;
  updated_at: string;
  profiles: {
    full_name: string;
    email: string;
    phone: string;
  };
  order_items: Array<{
    id: string;
    product_id: string;
    quantity: number;
    unit_price: number;
    products: {
      name: string;
      price: number;
    };
  }>;
}

interface ProductSalesDetailsModalProps {
  order: ProductOrder | null;
  isOpen: boolean;
  onClose: () => void;
  translateStatus: (status: string) => string;
}

const STATUS_BADGE = {
  pending: 'bg-yellow-100 text-yellow-800',
  billed: 'bg-blue-100 text-blue-800',
  paid: 'bg-green-100 text-green-800',
  cancelled: 'bg-red-100 text-red-800'
};

export function ProductSalesDetailsModal({
  order,
  isOpen,
  onClose,
  translateStatus
}: ProductSalesDetailsModalProps) {
  if (!order) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Detalhes da Venda</DialogTitle>
          <DialogDescription>
            Informações completas sobre a venda selecionada
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Customer Information */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Informações do Cliente</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div>
                <span className="font-medium">Nome:</span> {order.profiles?.full_name || 'N/A'}
              </div>
              <div>
                <span className="font-medium">Email:</span> {order.profiles?.email || 'N/A'}
              </div>
              <div>
                <span className="font-medium">Telefone:</span> {order.profiles?.phone || 'N/A'}
              </div>
            </CardContent>
          </Card>
          
          {/* Order Information */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Detalhes da Venda</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div>
                <span className="font-medium">Data do Pedido:</span>{' '}
                {new Date(order.created_at).toLocaleString('pt-BR')}
              </div>
              <div className="flex items-center gap-2">
                <span className="font-medium">Status:</span>
                <Badge className={STATUS_BADGE[order.status as keyof typeof STATUS_BADGE]}>
                  {translateStatus(order.status)}
                </Badge>
              </div>
              <div>
                <span className="font-medium">Valor Total:</span>{' '}
                <span className="text-lg font-bold text-green-600">
                  {formatCurrency(order.total_amount)}
                </span>
              </div>
            </CardContent>
          </Card>
          
          {/* Products */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Produtos Comprados</CardTitle>
            </CardHeader>
            <CardContent>
              {order.order_items && order.order_items.length > 0 ? (
                <div className="space-y-4">
                  {order.order_items.map((item, index) => (
                    <div key={index} className="border rounded-lg p-4">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                          <span className="font-medium">Produto:</span>
                          <div>{item.products?.name || 'N/A'}</div>
                        </div>
                        <div>
                          <span className="font-medium">Quantidade:</span>
                          <div>{item.quantity}x</div>
                        </div>
                        <div>
                          <span className="font-medium">Preço Unitário:</span>
                          <div>{formatCurrency(item.unit_price)}</div>
                        </div>
                      </div>
                      <div className="mt-2 pt-2 border-t">
                        <span className="font-medium">Subtotal:</span>{' '}
                        <span className="font-bold">
                          {formatCurrency(item.quantity * item.unit_price)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground">Nenhum produto encontrado</p>
              )}
            </CardContent>
          </Card>
          
          {/* Invoice Upload for paid orders */}
          {order.status === 'paid' && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Nota Fiscal</CardTitle>
              </CardHeader>
              <CardContent>
                <InvoiceUpload
                  recordId={order.id}
                  recordType="order"
                  currentInvoiceUrl={null}
                  onSuccess={() => window.location.reload()}
                />
              </CardContent>
            </Card>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
