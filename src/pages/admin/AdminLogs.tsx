
import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { FileText, Eye, Calendar, User } from "lucide-react";
import { format } from "date-fns";
import { useBranchFilter } from "@/hooks/useBranchFilter";

export default function AdminLogs() {
  const { branchId } = useBranchFilter();
  const [searchTerm, setSearchTerm] = useState("");
  const [actionFilter, setActionFilter] = useState("all");
  const [selectedLog, setSelectedLog] = useState<any>(null);
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);

  const { data: logs = [], isLoading } = useQuery({
    queryKey: ["admin-logs", searchTerm, actionFilter],
    queryFn: async () => {
      let query = supabase
        .from("admin_logs")
        .select("*")
        .order("created_at", { ascending: false });

      if (searchTerm) {
        query = query.or(`admin_email.ilike.%${searchTerm}%,action.ilike.%${searchTerm}%`);
      }

      if (actionFilter !== "all") {
        query = query.eq("action", actionFilter);
      }

      const { data, error } = await query;
      if (error) {
        console.error("Erro ao buscar logs:", error);
        throw error;
      }
      return data || [];
    },
  });

  // Função para criar log de administrador
  const createLogMutation = useMutation({
    mutationFn: async (logData: {
      action: string;
      details: any;
      admin_email?: string;
    }) => {
      const { error } = await supabase
        .from("admin_logs")
        .insert({
          admin_id: (await supabase.auth.getUser()).data.user?.id,
          action: logData.action,
          details: logData.details,
          admin_email: logData.admin_email,
          branch_id: branchId
        });

      if (error) throw error;
    },
  });

  // Função para registrar ação do administrador
  const logAdminAction = (action: string, details: any, adminEmail?: string) => {
    createLogMutation.mutate({
      action,
      details,
      admin_email: adminEmail
    });
  };

  const getActionBadgeVariant = (action: string) => {
    switch (action.toLowerCase()) {
      case "create":
      case "created":
        return "default";
      case "update":
      case "updated":
        return "secondary";
      case "delete":
      case "deleted":
        return "destructive";
      case "login":
        return "outline";
      default:
        return "secondary";
    }
  };

  const uniqueActions = [...new Set(logs.map(log => log.action))];

  const handleViewDetails = (log: any) => {
    setSelectedLog(log);
    setShowDetailsDialog(true);
  };

  React.useEffect(() => {
    // Registrar acesso à página de logs
    logAdminAction("view_admin_logs", { page: "admin_logs" });
  }, []);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-6 w-6" />
            Logs de Administradores
          </CardTitle>
        </CardHeader>
        <CardContent>
          {/* Filtros */}
          <div className="flex gap-4 mb-6">
            <div className="flex-1">
              <Input
                placeholder="Buscar por email do admin ou ação..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <Select value={actionFilter} onValueChange={setActionFilter}>
              <SelectTrigger className="w-[200px]">
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

          {/* Tabela de logs */}
          {isLoading ? (
            <div className="text-center py-8">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <p className="mt-2 text-muted-foreground">Carregando logs...</p>
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data/Hora</TableHead>
                    <TableHead>Administrador</TableHead>
                    <TableHead>Ação</TableHead>
                    <TableHead>Detalhes</TableHead>
                    <TableHead>Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {logs.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-muted-foreground" />
                          {format(new Date(log.created_at), "dd/MM/yyyy HH:mm")}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4 text-muted-foreground" />
                          {log.admin_email || "Sistema"}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={getActionBadgeVariant(log.action)}>
                          {log.action}
                        </Badge>
                      </TableCell>
                      <TableCell className="max-w-[300px] truncate">
                        {typeof log.details === "object" 
                          ? JSON.stringify(log.details).substring(0, 100) + "..."
                          : log.details?.toString().substring(0, 100) + "..."
                        }
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleViewDetails(log)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {logs.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Nenhum log encontrado.</p>
                  <p className="text-sm mt-2">Os logs aparecerão aqui conforme as ações administrativas forem realizadas.</p>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Dialog de detalhes */}
      <Dialog open={showDetailsDialog} onOpenChange={setShowDetailsDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Detalhes do Log</DialogTitle>
          </DialogHeader>
          {selectedLog && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Data/Hora:</label>
                  <p className="text-sm text-muted-foreground">
                    {format(new Date(selectedLog.created_at), "dd/MM/yyyy HH:mm:ss")}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium">Administrador:</label>
                  <p className="text-sm text-muted-foreground">
                    {selectedLog.admin_email || "Sistema"}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium">Ação:</label>
                  <Badge variant={getActionBadgeVariant(selectedLog.action)}>
                    {selectedLog.action}
                  </Badge>
                </div>
                <div>
                  <label className="text-sm font-medium">ID do Log:</label>
                  <p className="text-sm text-muted-foreground font-mono">
                    {selectedLog.id}
                  </p>
                </div>
              </div>
              <div>
                <label className="text-sm font-medium">Detalhes:</label>
                <pre className="mt-2 p-4 bg-muted rounded-lg text-sm overflow-auto max-h-[300px]">
                  {JSON.stringify(selectedLog.details, null, 2)}
                </pre>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
