import { useState, useMemo, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useBranchFilter } from '@/hooks/useBranchFilter';
import { formatCurrency } from '@/utils/formatCurrency';
import * as XLSX from 'xlsx';

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

const STATUS_MAP = {
  pending: 'Pendente',
  billed: 'Faturado',
  paid: 'Pago',
  cancelled: 'Cancelado'
};

const statusForTab = (status: string) => {
  switch (status) {
    case 'pending': return 'pending';
    case 'billed': return 'billed';
    case 'paid': return 'paid';
    case 'cancelled': return 'cancelled';
    default: return 'pending';
  }
};

export function useProductSales() {
  const [activeTab, setActiveTab] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedOrder, setSelectedOrder] = useState<ProductOrder | null>(null);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const itemsPerPage = 10;
  const queryClient = useQueryClient();
  
  const { branchId, setBranchId, branches, isSuperAdmin } = useBranchFilter();

  const ordersQuery = useQuery({
    queryKey: ['product-orders', branchId],
    queryFn: async () => {
      let query = supabase
        .from('orders')
        .select(`
          *,
          profiles:user_id (
            full_name,
            email,
            phone
          ),
          order_items (
            id,
            product_id,
            quantity,
            unit_price,
            products:product_id (
              name,
              price
            )
          )
        `)
        .order('created_at', { ascending: false });

      if (branchId) {
        query = query.eq('branch_id', branchId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as ProductOrder[];
    }
  });

  const profilesQuery = useQuery({
    queryKey: ['profiles'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, email, phone');
      if (error) throw error;
      return data;
    }
  });

  const filteredOrders = useMemo(() => {
    if (!ordersQuery.data) return [];
    
    let filtered = ordersQuery.data;
    
    // Filter by tab
    if (activeTab !== 'all') {
      filtered = filtered.filter(order => {
        const tabStatus = statusForTab(order.status);
        return tabStatus === activeTab;
      });
    }
    
    // Filter by search term
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(order => 
        order.profiles?.full_name?.toLowerCase().includes(term) ||
        order.profiles?.email?.toLowerCase().includes(term) ||
        order.order_items?.some(item => 
          item.products?.name?.toLowerCase().includes(term)
        )
      );
    }
    
    return filtered;
  }, [ordersQuery.data, activeTab, searchTerm]);

  const paginatedOrders = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredOrders.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredOrders, currentPage]);

  const totalPages = Math.ceil(filteredOrders.length / itemsPerPage);

  const stats = useMemo(() => {
    if (!ordersQuery.data) return { total: 0, paid: 0, pending: 0, cancelled: 0, billed: 0 };
    
    return {
      total: ordersQuery.data.length,
      paid: ordersQuery.data.filter(o => o.status === 'paid').length,
      pending: ordersQuery.data.filter(o => o.status === 'pending').length,
      cancelled: ordersQuery.data.filter(o => o.status === 'cancelled').length,
      billed: ordersQuery.data.filter(o => o.status === 'billed').length
    };
  }, [ordersQuery.data]);

  const translateStatus = (status: string) => {
    return STATUS_MAP[status as keyof typeof STATUS_MAP] || status;
  };

  const downloadReport = () => {
    if (!filteredOrders.length) {
      toast.error('Nenhuma venda encontrada para exportar');
      return;
    }

    const reportData = filteredOrders.map(order => ({
      'Cliente': order.profiles?.full_name || 'N/A',
      'Email': order.profiles?.email || 'N/A',
      'Telefone': order.profiles?.phone || 'N/A',
      'Data do Pedido': new Date(order.created_at).toLocaleString('pt-BR'),
      'Produtos': order.order_items?.map(item => 
        `${item.quantity}x ${item.products?.name || 'N/A'}`
      ).join('; ') || 'N/A',
      'Valor Total': formatCurrency(order.total_amount),
      'Status': translateStatus(order.status)
    }));

    const ws = XLSX.utils.json_to_sheet(reportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Vendas de Produtos');
    
    const fileName = `vendas-produtos-${new Date().toISOString().split('T')[0]}.xlsx`;
    XLSX.writeFile(wb, fileName);
    
    toast.success('Relatório exportado com sucesso!');
  };

  const handleMarkAsPaid = async (orderId: string) => {
    try {
      const { error } = await supabase
        .from('orders')
        .update({ status: 'paid' })
        .eq('id', orderId);

      if (error) throw error;

      queryClient.invalidateQueries({ queryKey: ['product-orders'] });
      toast.success('Pedido marcado como pago com sucesso!');
    } catch (error) {
      console.error('Erro ao marcar pedido como pago:', error);
      toast.error('Erro ao marcar pedido como pago');
    }
  };

  const handleCancelOrder = async (orderId: string) => {
    try {
      const { error } = await supabase
        .from('orders')
        .update({ status: 'cancelled' })
        .eq('id', orderId);

      if (error) throw error;

      queryClient.invalidateQueries({ queryKey: ['product-orders'] });
      toast.success('Pedido cancelado com sucesso!');
    } catch (error) {
      console.error('Erro ao cancelar pedido:', error);
      toast.error('Erro ao cancelar pedido');
    }
  };

  const handleViewDetails = (order: ProductOrder) => {
    setSelectedOrder(order);
    setIsDetailsModalOpen(true);
  };

  const handleCloseDetails = () => {
    setSelectedOrder(null);
    setIsDetailsModalOpen(false);
  };

  useEffect(() => {
    setCurrentPage(1);
  }, [activeTab, searchTerm, branchId]);

  return {
    activeTab,
    setActiveTab,
    branchId,
    setBranchId,
    branches,
    isSuperAdmin,
    orders: ordersQuery.data || [],
    isLoading: ordersQuery.isLoading,
    error: ordersQuery.error,
    selectedOrder,
    showDetails: isDetailsModalOpen,
    search: searchTerm,
    setSearch: setSearchTerm,
    page: currentPage,
    setPage: setCurrentPage,
    totalPages,
    paginatedOrders,
    resumo: stats,
    downloadReport,
    handleCancelOrder,
    handleMarkAsPaid,
    handleViewDetails,
    handleCloseDetails
  };
}