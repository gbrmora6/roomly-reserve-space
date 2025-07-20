import React from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Download } from "lucide-react";

interface EquipmentBookingFiltersProps {
  search: string;
  setSearch: (value: string) => void;
  branchId: string | null;
  setBranchId: (value: string | null) => void;
  branches: Array<{ id: string; name: string }> | null;
  isSuperAdmin: boolean;
  filteredBookingsCount: number;
  page: number;
  totalPages: number;
  setPage: (page: number | ((prev: number) => number)) => void;
  onDownloadReport: () => void;
}

export const EquipmentBookingFilters: React.FC<EquipmentBookingFiltersProps> = ({
  search,
  setSearch,
  branchId,
  setBranchId,
  branches,
  isSuperAdmin,
  filteredBookingsCount,
  page,
  totalPages,
  setPage,
  onDownloadReport,
}) => {
  return (
    <>
      {/* Filtro de filial */}
      {isSuperAdmin && branches && (
        <div className="mb-4 max-w-xs">
          <Select value={branchId || undefined} onValueChange={setBranchId}>
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

      {/* Campo de busca e paginação */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-4">
        <Input
          placeholder="Buscar por cliente ou equipamento..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="max-w-xs"
        />
        <div className="flex items-center gap-2 mt-2 md:mt-0">
          <span className="text-sm text-muted-foreground">{filteredBookingsCount} reservas</span>
          <Button variant="ghost" size="icon" disabled={page === 1} onClick={() => setPage(1)}>&laquo;</Button>
          <Button variant="ghost" size="icon" disabled={page === 1} onClick={() => setPage(p => Math.max(1, p - 1))}>&lsaquo;</Button>
          <span className="text-sm">Página {page} de {totalPages}</span>
          <Button variant="ghost" size="icon" disabled={page === totalPages} onClick={() => setPage(p => Math.min(totalPages, p + 1))}>&rsaquo;</Button>
          <Button variant="ghost" size="icon" disabled={page === totalPages} onClick={() => setPage(totalPages)}>&raquo;</Button>
        </div>
      </div>

      {/* Botão de download */}
      <div className="mb-6">
        <Button variant="outline" onClick={onDownloadReport} className="h-12 text-base font-semibold">
          <Download className="mr-2 h-5 w-5" />
          Baixar Relatório
        </Button>
      </div>
    </>
  );
};