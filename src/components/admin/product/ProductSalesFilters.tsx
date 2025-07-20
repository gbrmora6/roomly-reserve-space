import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, Download } from 'lucide-react';
import { formatCurrency } from '@/utils/formatCurrency';

interface ProductSalesFiltersProps {
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  selectedBranch: string | null;
  branchFilter: React.ReactNode;
  downloadReport: () => void;
  stats: {
    total: number;
    paid: number;
    pending: number;
    cancelled: number;
    billed: number;
  };
}

export function ProductSalesFilters({
  searchTerm,
  setSearchTerm,
  selectedBranch,
  branchFilter,
  downloadReport,
  stats
}: ProductSalesFiltersProps) {
  return (
    <div className="space-y-6">
      {/* Branch Filter */}
      {branchFilter}
      
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total de Vendas</CardDescription>
            <CardTitle className="text-2xl">{stats.total}</CardTitle>
          </CardHeader>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Faturadas</CardDescription>
            <CardTitle className="text-2xl text-blue-600">{stats.billed}</CardTitle>
          </CardHeader>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Pagas</CardDescription>
            <CardTitle className="text-2xl text-green-600">{stats.paid}</CardTitle>
          </CardHeader>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Pendentes</CardDescription>
            <CardTitle className="text-2xl text-yellow-600">{stats.pending}</CardTitle>
          </CardHeader>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Canceladas</CardDescription>
            <CardTitle className="text-2xl text-red-600">{stats.cancelled}</CardTitle>
          </CardHeader>
        </Card>
      </div>
      
      {/* Search and Actions */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input
            placeholder="Buscar por cliente ou produto..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        
        <Button onClick={downloadReport} variant="outline">
          <Download className="h-4 w-4 mr-2" />
          Exportar Relatório
        </Button>
      </div>
    </div>
  );
}