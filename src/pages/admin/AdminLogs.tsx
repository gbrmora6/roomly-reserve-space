
import React, { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { format } from "date-fns";

const ACTIONS = [
  { value: "", label: "Todas" },
  { value: "CANCEL_ORDER", label: "Cancelou pedido" },
  { value: "MARK_PAID", label: "Marcou como pago" },
  { value: "EDIT_PRODUCT", label: "Editou produto" },
  { value: "CREATE_PRODUCT", label: "Criou produto" },
  { value: "DELETE_PRODUCT", label: "Excluiu produto" },
  // Adicione mais ações conforme necessário
];

export default function AdminLogs() {
  const [search, setSearch] = useState("");
  const [action, setAction] = useState("");
  const [adminId, setAdminId] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [page, setPage] = useState(1);
  const perPage = 15;
  const [selectedLog, setSelectedLog] = useState<any>(null);
  const [showDetails, setShowDetails] = useState(false);

  // Buscar admins para filtro
  const { data: admins = [] } = useQuery({
    queryKey: ["admin-logs-admins"],
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles")
        .select("id, first_name, last_name")
        .eq("role", "admin");
      return data || [];
    },
  });

  // Buscar logs
  const { data: logs = [], isLoading } = useQuery({
    queryKey: ["admin-logs", action, adminId, dateFrom, dateTo],
    queryFn: async () => {
      let query = supabase
        .from("admin_logs")
        .select("id, admin_id, admin_email, action, details, created_at")
        .order("created_at", { ascending: false });
      if (action) query = query.eq("action", action);
      if (adminId) query = query.eq("admin_id", adminId);
      if (dateFrom) query = query.gte("created_at", dateFrom);
      if (dateTo) query = query.lte("created_at", dateTo + " 23:59:59");
      const { data } = await query;
      return data || [];
    },
  });

  // Filtro de busca
  const filteredLogs = useMemo(() => {
    if (!search.trim()) return logs;
    const s = search.trim().toLowerCase();
    return logs.filter(log =>
      (log.admin_email || "").toLowerCase().includes(s) ||
      (log.action || "").toLowerCase().includes(s) ||
      JSON.stringify(log.details || {}).toLowerCase().includes(s)
    );
  }, [logs, search]);

  // Paginação
  const totalPages = Math.ceil(filteredLogs.length / perPage) || 1;
  const paginatedLogs = useMemo(() => {
    const start = (page - 1) * perPage;
    return filteredLogs.slice(start, start + perPage);
  }, [filteredLogs, page]);

  React.useEffect(() => { setPage(1); }, [search, action, adminId, dateFrom, dateTo]);

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-8">
      <Card className="shadow-lg rounded-2xl border-0 bg-white p-6 mb-8">
        <CardHeader>
          <CardTitle className="text-2xl font-bold text-gray-900">Logs de Administradores</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row md:items-end gap-4 mb-4">
            <Input
              placeholder="Buscar por email, ação ou palavra-chave..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="max-w-xs"
            />
            <Select value={action} onValueChange={setAction}>
              <SelectTrigger className="w-48"><SelectValue placeholder="Ação" /></SelectTrigger>
              <SelectContent>
                {ACTIONS.map(a => (
                  <SelectItem key={a.value} value={a.value}>{a.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={adminId} onValueChange={setAdminId}>
              <SelectTrigger className="w-56"><SelectValue placeholder="Administrador" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="">Todos</SelectItem>
                {admins.map((a: any) => (
                  <SelectItem key={a.id} value={a.id}>
                    {a.first_name && a.last_name ? `${a.first_name} ${a.last_name}` : a.id}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="flex gap-2">
              <Input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} />
              <span className="text-muted-foreground">até</span>
              <Input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} />
            </div>
          </div>
          <div className="border rounded-md overflow-x-auto bg-white">
            <Table className="min-w-[900px]">
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>Admin</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Ação</TableHead>
                  <TableHead>Detalhes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedLogs.map(log => {
                  const admin = admins.find((a: any) => a.id === log.admin_id);
                  return (
                    <TableRow key={log.id}>
                      <TableCell>{format(new Date(log.created_at), "dd/MM/yyyy HH:mm")}</TableCell>
                      <TableCell>
                        {admin?.first_name && admin?.last_name 
                          ? `${admin.first_name} ${admin.last_name}` 
                          : "-"}
                      </TableCell>
                      <TableCell>{log.admin_email}</TableCell>
                      <TableCell>{ACTIONS.find(a => a.value === log.action)?.label || log.action}</TableCell>
                      <TableCell>
                        <Button size="sm" variant="outline" onClick={() => { setSelectedLog(log); setShowDetails(true); }}>Ver</Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
                {paginatedLogs.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">Nenhum log encontrado</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
          {/* Paginação */}
          <div className="flex items-center gap-2 mt-4">
            <span className="text-sm text-muted-foreground">{filteredLogs.length} logs</span>
            <Button variant="ghost" size="icon" disabled={page === 1} onClick={() => setPage(1)}>&laquo;</Button>
            <Button variant="ghost" size="icon" disabled={page === 1} onClick={() => setPage(p => Math.max(1, p - 1))}>&lsaquo;</Button>
            <span className="text-sm">Página {page} de {totalPages}</span>
            <Button variant="ghost" size="icon" disabled={page === totalPages} onClick={() => setPage(p => Math.min(totalPages, p + 1))}>&rsaquo;</Button>
            <Button variant="ghost" size="icon" disabled={page === totalPages} onClick={() => setPage(totalPages)}>&raquo;</Button>
          </div>
        </CardContent>
      </Card>
      {/* Modal de detalhes */}
      <Dialog open={showDetails} onOpenChange={setShowDetails}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Detalhes do Log</DialogTitle>
          </DialogHeader>
          {selectedLog && (
            <pre className="bg-gray-100 rounded p-4 text-xs overflow-x-auto max-h-96">
              {JSON.stringify(selectedLog.details, null, 2)}
            </pre>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
} 
