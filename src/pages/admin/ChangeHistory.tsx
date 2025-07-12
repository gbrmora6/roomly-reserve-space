import React, { useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { History, Eye, Calendar, User, Database, BarChart3 } from "lucide-react";
import { format } from "date-fns";
import { useChangeHistory } from "@/hooks/useChangeHistory";
import ReactDiffViewer from 'react-diff-viewer-continued';

export default function ChangeHistory() {
  const { changeHistory, isLoading, getChangeStats } = useChangeHistory();
  const [searchTerm, setSearchTerm] = useState("");
  const [tableFilter, setTableFilter] = useState("all");
  const [operationFilter, setOperationFilter] = useState("all");
  const [selectedChange, setSelectedChange] = useState<any>(null);
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);

  const stats = getChangeStats();

  const filteredChanges = changeHistory.filter(change => {
    const searchMatch = searchTerm === "" || 
      change.user_email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      change.table_name.toLowerCase().includes(searchTerm.toLowerCase());
    
    const tableMatch = tableFilter === "all" || change.table_name === tableFilter;
    const operationMatch = operationFilter === "all" || change.operation === operationFilter;
    
    return searchMatch && tableMatch && operationMatch;
  });

  const getOperationBadgeVariant = (operation: string) => {
    switch (operation) {
      case 'INSERT': return 'default';
      case 'UPDATE': return 'secondary';
      case 'DELETE': return 'destructive';
      default: return 'outline';
    }
  };

  const getOperationIcon = (operation: string) => {
    switch (operation) {
      case 'INSERT': return '➕';
      case 'UPDATE': return '✏️';
      case 'DELETE': return '🗑️';
      default: return '❓';
    }
  };

  const handleViewDetails = (change: any) => {
    setSelectedChange(change);
    setShowDetailsDialog(true);
  };

  const formatJsonForDiff = (data: any) => {
    if (!data) return "";
    return JSON.stringify(data, null, 2);
  };

  const uniqueTables = [...new Set(changeHistory.map(change => change.table_name))];

  return (
    <div className="space-y-6">
      {/* Cards de Estatísticas */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total de Alterações</p>
                <p className="text-2xl font-bold">{stats.totalChanges}</p>
              </div>
              <History className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Inserções</p>
                <p className="text-2xl font-bold text-green-500">{stats.insertions}</p>
              </div>
              <span className="text-2xl">➕</span>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Atualizações</p>
                <p className="text-2xl font-bold text-blue-500">{stats.updates}</p>
              </div>
              <span className="text-2xl">✏️</span>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Exclusões</p>
                <p className="text-2xl font-bold text-red-500">{stats.deletions}</p>
              </div>
              <span className="text-2xl">🗑️</span>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="changes" className="space-y-4">
        <TabsList>
          <TabsTrigger value="changes">Histórico de Alterações</TabsTrigger>
          <TabsTrigger value="stats">Estatísticas</TabsTrigger>
        </TabsList>

        <TabsContent value="changes" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <History className="h-6 w-6" />
                Histórico de Alterações
              </CardTitle>
            </CardHeader>
            <CardContent>
              {/* Filtros */}
              <div className="flex gap-4 mb-6">
                <Input
                  placeholder="Buscar por usuário ou tabela..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="flex-1"
                />
                <Select value={tableFilter} onValueChange={setTableFilter}>
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder="Filtrar por tabela" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas as tabelas</SelectItem>
                    {uniqueTables.map((table) => (
                      <SelectItem key={table} value={table}>
                        {table}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={operationFilter} onValueChange={setOperationFilter}>
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder="Filtrar por operação" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas as operações</SelectItem>
                    <SelectItem value="INSERT">Inserção</SelectItem>
                    <SelectItem value="UPDATE">Atualização</SelectItem>
                    <SelectItem value="DELETE">Exclusão</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Tabela de Alterações */}
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data/Hora</TableHead>
                    <TableHead>Tabela</TableHead>
                    <TableHead>Operação</TableHead>
                    <TableHead>Usuário</TableHead>
                    <TableHead>Campos Alterados</TableHead>
                    <TableHead>Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredChanges.map((change) => (
                    <TableRow key={change.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-muted-foreground" />
                          {format(new Date(change.created_at), "dd/MM/yyyy HH:mm")}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Database className="h-4 w-4 text-muted-foreground" />
                          <Badge variant="outline">{change.table_name}</Badge>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span className="text-lg">{getOperationIcon(change.operation)}</span>
                          <Badge variant={getOperationBadgeVariant(change.operation)}>
                            {change.operation}
                          </Badge>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4 text-muted-foreground" />
                          <div>
                            <p className="text-sm">{change.user_email || "Sistema"}</p>
                            {change.user_role && (
                              <p className="text-xs text-muted-foreground">{change.user_role}</p>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        {change.changed_fields && change.changed_fields.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {change.changed_fields.slice(0, 3).map((field, index) => (
                              <Badge key={index} variant="secondary" className="text-xs">
                                {field}
                              </Badge>
                            ))}
                            {change.changed_fields.length > 3 && (
                              <Badge variant="secondary" className="text-xs">
                                +{change.changed_fields.length - 3}
                              </Badge>
                            )}
                          </div>
                        ) : (
                          <span className="text-muted-foreground text-sm">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleViewDetails(change)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {filteredChanges.length === 0 && !isLoading && (
                <div className="text-center py-8 text-muted-foreground">
                  Nenhuma alteração encontrada.
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="stats" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  Alterações por Tabela
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {Object.entries(stats.changesByTable)
                    .sort(([,a], [,b]) => b - a)
                    .slice(0, 10)
                    .map(([table, count]) => (
                      <div key={table} className="flex justify-between items-center">
                        <span className="text-sm">{table}</span>
                        <Badge variant="outline">{count}</Badge>
                      </div>
                    ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Alterações por Usuário
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {Object.entries(stats.changesByUser)
                    .sort(([,a], [,b]) => b - a)
                    .slice(0, 10)
                    .map(([user, count]) => (
                      <div key={user} className="flex justify-between items-center">
                        <span className="text-sm">{user}</span>
                        <Badge variant="outline">{count}</Badge>
                      </div>
                    ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Dialog de Detalhes */}
      <Dialog open={showDetailsDialog} onOpenChange={setShowDetailsDialog}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Detalhes da Alteração</DialogTitle>
          </DialogHeader>
          {selectedChange && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Data/Hora:</label>
                  <p className="text-sm text-muted-foreground">
                    {format(new Date(selectedChange.created_at), "dd/MM/yyyy HH:mm:ss")}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium">Tabela:</label>
                  <Badge variant="outline">{selectedChange.table_name}</Badge>
                </div>
                <div>
                  <label className="text-sm font-medium">Operação:</label>
                  <Badge variant={getOperationBadgeVariant(selectedChange.operation)}>
                    {selectedChange.operation}
                  </Badge>
                </div>
                <div>
                  <label className="text-sm font-medium">ID do Registro:</label>
                  <p className="text-sm text-muted-foreground font-mono">{selectedChange.record_id}</p>
                </div>
                <div>
                  <label className="text-sm font-medium">Usuário:</label>
                  <p className="text-sm text-muted-foreground">
                    {selectedChange.user_email || "Sistema"} ({selectedChange.user_role})
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium">IP Address:</label>
                  <p className="text-sm text-muted-foreground font-mono">
                    {selectedChange.ip_address || "N/A"}
                  </p>
                </div>
              </div>

              {selectedChange.changed_fields && selectedChange.changed_fields.length > 0 && (
                <div>
                  <label className="text-sm font-medium">Campos Alterados:</label>
                  <div className="flex flex-wrap gap-1 mt-2">
                    {selectedChange.changed_fields.map((field: string, index: number) => (
                      <Badge key={index} variant="secondary">
                        {field}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {selectedChange.operation === 'UPDATE' && selectedChange.old_data && selectedChange.new_data && (
                <div>
                  <label className="text-sm font-medium mb-2 block">Comparação de Dados:</label>
                  <div className="border rounded-lg overflow-hidden">
                    <ReactDiffViewer
                      oldValue={formatJsonForDiff(selectedChange.old_data)}
                      newValue={formatJsonForDiff(selectedChange.new_data)}
                      splitView={true}
                      leftTitle="Dados Anteriores"
                      rightTitle="Dados Novos"
                      showDiffOnly={false}
                    />
                  </div>
                </div>
              )}

              {selectedChange.operation === 'INSERT' && selectedChange.new_data && (
                <div>
                  <label className="text-sm font-medium">Dados Inseridos:</label>
                  <pre className="mt-2 p-4 bg-muted rounded-lg text-sm overflow-auto max-h-[300px]">
                    {formatJsonForDiff(selectedChange.new_data)}
                  </pre>
                </div>
              )}

              {selectedChange.operation === 'DELETE' && selectedChange.old_data && (
                <div>
                  <label className="text-sm font-medium">Dados Removidos:</label>
                  <pre className="mt-2 p-4 bg-muted rounded-lg text-sm overflow-auto max-h-[300px]">
                    {formatJsonForDiff(selectedChange.old_data)}
                  </pre>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}