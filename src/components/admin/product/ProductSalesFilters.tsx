import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, Download } from 'lucide-react';
import { formatCurrency } from '@/utils/formatCurrency';

interface ProductSalesFiltersProps {
  branchId: string | null;
  setBranchId: (id: string | null) => void;
  branches: Array<{ id: string; name: string; }>;
  isSuperAdmin: boolean;
  search: string;
  setSearch: (term: string) => void;
  page: number;
  setPage: (page: number) => void;
  totalPages: number;
  totalOrders: number;
  resumo: {
    total: number;
    paid: number;
    pending: number;
    cancelled: number;
    billed: number;
  } | null;
  isLoading: boolean;
  onDownloadReport: () => void;
}

export function ProductSalesFilters({
  branchId,
  setBranchId,
  branches,
  isSuperAdmin,
  search,
  setSearch,
  page,
  setPage,
  totalPages,
  totalOrders,
  resumo,
  isLoading,
  onDownloadReport
}: ProductSalesFiltersProps) {
  return (
    <div className="space-y-6">
      {/* Branch Filter */}
      {isSuperAdmin && (
        <Card>
          <CardHeader className="pb-4">
            <CardTitle>Filtrar por Filial</CardTitle>
          </CardHeader>
          <CardContent>
            <Select value={branchId || ""} onValueChange={(value) => setBranchId(value || null)}>
              <SelectTrigger>
                <SelectValue placeholder="Todas as filiais" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Todas as filiais</SelectItem>
                {branches.map((branch) => (
                  <SelectItem key={branch.id} value={branch.id}>
                    {branch.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>
      )}
      
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total de Vendas</CardDescription>
            <CardTitle className="text-2xl">{resumo?.total || 0}</CardTitle>
          </CardHeader>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Faturadas</CardDescription>
            <CardTitle className="text-2xl text-blue-600">{resumo?.billed || 0}</CardTitle>
          </CardHeader>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Pagas</CardDescription>
            <CardTitle className="text-2xl text-green-600">{resumo?.paid || 0}</CardTitle>
          </CardHeader>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Pendentes</CardDescription>
            <CardTitle className="text-2xl text-yellow-600">{resumo?.pending || 0}</CardTitle>
          </CardHeader>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Canceladas</CardDescription>
            <CardTitle className="text-2xl text-red-600">{resumo?.cancelled || 0}</CardTitle>
          </CardHeader>
        </Card>
      </div>
      
      {/* Search and Actions */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input
            placeholder="Buscar por cliente ou produto..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        
        <Button onClick={onDownloadReport} variant="outline">
          <Download className="h-4 w-4 mr-2" />
          Exportar Relatório
        </Button>
      </div>
    </div>
  );
}