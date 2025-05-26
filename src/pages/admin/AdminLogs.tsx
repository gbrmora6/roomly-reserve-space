
import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Search, Download, Filter } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useBranchFilter } from "@/hooks/useBranchFilter";
import { toast } from "@/hooks/use-toast";
import * as XLSX from "xlsx";

const AdminLogs = () => {
  const [search, setSearch] = useState("");
  const [actionFilter, setActionFilter] = useState<string>("all");
  const [page, setPage] = useState(1);
  const itemsPerPage = 20;
  const { branchId, setBranchId, branches, isSuperAdmin } = useBranchFilter();

  const { data: logs = [], isLoading, error } = useQuery({
    queryKey: ["admin-logs", branchId, search, actionFilter],
    queryFn: async () => {
      if (!branchId) return [];
      
      let query = supabase
        .from("admin_logs")
        .select(`
          *,
          admin:profiles!admin_logs_admin_id_fkey(first_name, last_name)
        `)
        .eq("branch_id", branchId)
        .order("created_at", { ascending: false });

      if (search) {
        query = query.or(`admin_email.ilike.%${search}%,action.ilike.%${search}%`);
      }

      if (actionFilter !== "all") {
        query = query.eq("action", actionFilter);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
    enabled: !!branchId,
  });

  const filteredLogs = logs.slice((page - 1) * itemsPerPage, page * itemsPerPage);
  const totalPages = Math.ceil(logs.length / itemsPerPage);

  const uniqueActions = [...new Set(logs.map(log => log.action).filter(Boolean))];

  const downloadReport = () => {
    if (!logs || logs.length === 0) {
      toast({
        title: "Sem dados para exportar",
        description: "Não há logs para gerar o relatório."
      });
      return;
    }

    try {
      const exportData = logs.map(log => ({
        "Data": format(new Date(log.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR }),
        "Admin": log.admin ? `${log.admin.first_name || ''} ${log.admin.last_name || ''}`.trim() : (log.admin_email || 'N/A'),
        "Email": log.admin_email || 'N/A',
        "Ação": log.action || 'N/A',
        "Detalhes": log.details ? JSON.stringify(log.details) : 'N/A'
      }));

      const worksheet = XLSX.utils.json_to_sheet(exportData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Logs de Admin");
      
      const fileName = `Logs_Admin_${format(new Date(), "dd-MM-yyyy")}.xlsx`;
      XLSX.writeFile(workbook, fileName);
      
      toast({
        title: "Relatório gerado com sucesso",
        description: `O arquivo ${fileName} foi baixado.`
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Erro ao gerar relatório",
        description: "Ocorreu um erro durante a geração do relatório. Tente novamente."
      });
    }
  };

  const getAdminName = (log: any) => {
    if (log.admin && log.admin.first_name) {
      return `${log.admin.first_name} ${log.admin.last_name || ''}`.trim();
    }
    return log.admin_email || 'N/A';
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Logs de Administradores</h1>
          <p className="text-muted-foreground">
            Acompanhe todas as ações realizadas pelos administradores do sistema.
          </p>
        </div>
        <Button onClick={downloadReport} disabled={!logs.length}>
          <Download className="mr-2 h-4 w-4" />
          Exportar Relatório
        </Button>
      </div>

      {isSuperAdmin && branches && (
        <div className="mb-4 max-w-xs">
          <Select value={branchId || undefined} onValueChange={setBranchId!}>
            <SelectTrigger>
              <SelectValue placeholder="Selecione uma filial" />
            </SelectTrigger>
            <SelectContent>
              {branches.map((branch) => (
                <SelectItem key={branch.id} value={branch.id}>
                  {branch.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filtros
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Buscar por email ou ação..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="sm:w-48">
              <Select value={actionFilter} onValueChange={setActionFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Filtrar por ação" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas as ações</SelectItem>
                  {uniqueActions.map((action) => (
                    <SelectItem key={action} value={action}>
                      {action}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6 space-y-4">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : error ? (
            <div className="p-6 text-center text-red-600">
              Erro ao carregar logs: {(error as Error).message}
            </div>
          ) : !logs.length ? (
            <div className="p-6 text-center text-gray-500">
              Nenhum log encontrado.
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data/Hora</TableHead>
                    <TableHead>Administrador</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Ação</TableHead>
                    <TableHead>Detalhes</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredLogs.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell>
                        {format(new Date(log.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                      </TableCell>
                      <TableCell>{getAdminName(log)}</TableCell>
                      <TableCell>{log.admin_email || 'N/A'}</TableCell>
                      <TableCell>
                        <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-md text-sm font-medium">
                          {log.action}
                        </span>
                      </TableCell>
                      <TableCell>
                        {log.details ? (
                          <pre className="text-xs bg-gray-100 p-2 rounded max-w-xs overflow-auto">
                            {JSON.stringify(log.details, null, 2)}
                          </pre>
                        ) : (
                          'N/A'
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {totalPages > 1 && (
                <div className="flex items-center justify-between px-6 py-4 border-t">
                  <div className="text-sm text-muted-foreground">
                    Página {page} de {totalPages} ({logs.length} logs no total)
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage(Math.max(1, page - 1))}
                      disabled={page === 1}
                    >
                      Anterior
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage(Math.min(totalPages, page + 1))}
                      disabled={page === totalPages}
                    >
                      Próxima
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminLogs;
