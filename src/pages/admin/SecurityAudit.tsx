import React, { useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ShieldAlert, Eye, CheckCircle, AlertTriangle, Info, Calendar, User } from "lucide-react";
import { format } from "date-fns";
import { useSecurityAudit } from "@/hooks/useSecurityAudit";

export default function SecurityAudit() {
  const {
    events: auditEvents,
    loading: isLoading,
    markAsReviewed: reviewEvent,
    fetchEvents
  } = useSecurityAudit();
  
  const [searchTerm, setSearchTerm] = useState("");
  const [severityFilter, setSeverityFilter] = useState("all");
  const [eventTypeFilter, setEventTypeFilter] = useState("all");
  const [selectedEvent, setSelectedEvent] = useState<any>(null);
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);
  const [reviewNotes, setReviewNotes] = useState("");

  // Calculate stats from events data
  const stats = {
    totalEvents: auditEvents.length,
    criticalEvents: auditEvents.filter(e => e.severity === 'critical').length,
    warningEvents: auditEvents.filter(e => e.severity === 'warning').length,
    highRiskEvents: auditEvents.filter(e => e.risk_score >= 70).length,
    pendingReviewEvents: auditEvents.filter(e => e.requires_review && !e.reviewed_at).length
  };

  const filteredEvents = auditEvents.filter(event => {
    const searchMatch = searchTerm === "" || 
      event.user_email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      event.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
      event.event_type.toLowerCase().includes(searchTerm.toLowerCase());
    
    const severityMatch = severityFilter === "all" || event.severity === severityFilter;
    const eventTypeMatch = eventTypeFilter === "all" || event.event_type === eventTypeFilter;
    
    return searchMatch && severityMatch && eventTypeMatch;
  });

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'critical': return <AlertTriangle className="h-4 w-4 text-red-500" />;
      case 'warning': return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      case 'info': return <Info className="h-4 w-4 text-blue-500" />;
      default: return <Info className="h-4 w-4 text-gray-500" />;
    }
  };

  const getSeverityBadgeVariant = (severity: string) => {
    switch (severity) {
      case 'critical': return 'destructive';
      case 'warning': return 'secondary';
      case 'info': return 'outline';
      default: return 'outline';
    }
  };

  const getRiskScoreBadge = (score: number) => {
    if (score >= 70) return { variant: 'destructive' as const, label: 'Alto Risco' };
    if (score >= 30) return { variant: 'secondary' as const, label: 'Médio Risco' };
    return { variant: 'outline' as const, label: 'Baixo Risco' };
  };

  const handleViewDetails = (event: any) => {
    setSelectedEvent(event);
    setShowDetailsDialog(true);
    setReviewNotes("");
  };

  const handleReviewEvent = () => {
    if (selectedEvent) {
      reviewEvent(selectedEvent.id, reviewNotes);
      setShowDetailsDialog(false);
    }
  };

  const uniqueEventTypes = [...new Set(auditEvents.map(event => event.event_type))];

  return (
    <div className="space-y-6">
      {/* Cards de Estatísticas */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total de Eventos</p>
                <p className="text-2xl font-bold">{stats.totalEvents}</p>
              </div>
              <ShieldAlert className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Críticos</p>
                <p className="text-2xl font-bold text-red-500">{stats.criticalEvents}</p>
              </div>
              <AlertTriangle className="h-8 w-8 text-red-500" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Avisos</p>
                <p className="text-2xl font-bold text-yellow-500">{stats.warningEvents}</p>
              </div>
              <AlertTriangle className="h-8 w-8 text-yellow-500" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Alto Risco</p>
                <p className="text-2xl font-bold text-orange-500">{stats.highRiskEvents}</p>
              </div>
              <ShieldAlert className="h-8 w-8 text-orange-500" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Pendente Revisão</p>
                <p className="text-2xl font-bold text-purple-500">{stats.pendingReviewEvents}</p>
              </div>
              <Eye className="h-8 w-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Alertas de Eventos Pendentes */}
      {stats.pendingReviewEvents > 0 && (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            Existem {stats.pendingReviewEvents} eventos de segurança que requerem revisão imediata.
          </AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShieldAlert className="h-6 w-6" />
            Auditoria de Segurança
          </CardTitle>
        </CardHeader>
        <CardContent>
          {/* Filtros */}
          <div className="flex gap-4 mb-6">
            <Input
              placeholder="Buscar por usuário, ação ou tipo..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="flex-1"
            />
            <Select value={severityFilter} onValueChange={setSeverityFilter}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Filtrar por severidade" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as severidades</SelectItem>
                <SelectItem value="critical">Crítico</SelectItem>
                <SelectItem value="warning">Aviso</SelectItem>
                <SelectItem value="info">Informação</SelectItem>
              </SelectContent>
            </Select>
            <Select value={eventTypeFilter} onValueChange={setEventTypeFilter}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Filtrar por tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os tipos</SelectItem>
                {uniqueEventTypes.map((type) => (
                  <SelectItem key={type} value={type}>
                    {type}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Tabela de Eventos */}
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Data/Hora</TableHead>
                <TableHead>Severidade</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Usuário</TableHead>
                <TableHead>Ação</TableHead>
                <TableHead>Risco</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredEvents.map((event) => {
                const riskBadge = getRiskScoreBadge(event.risk_score);
                return (
                  <TableRow key={event.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        {format(new Date(event.created_at), "dd/MM/yyyy HH:mm")}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {getSeverityIcon(event.severity)}
                        <Badge variant={getSeverityBadgeVariant(event.severity)}>
                          {event.severity}
                        </Badge>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{event.event_type}</Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <p className="text-sm">{event.user_email || "Sistema"}</p>
                          {event.user_role && (
                            <p className="text-xs text-muted-foreground">{event.user_role}</p>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="max-w-[200px] truncate">
                      {event.action}
                    </TableCell>
                    <TableCell>
                      <Badge variant={riskBadge.variant}>
                        {riskBadge.label} ({event.risk_score})
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {event.requires_review ? (
                        event.reviewed_at ? (
                          <Badge variant="outline">
                            <CheckCircle className="h-3 w-3 mr-1" />
                            Revisado
                          </Badge>
                        ) : (
                          <Badge variant="secondary">
                            <Eye className="h-3 w-3 mr-1" />
                            Pendente
                          </Badge>
                        )
                      ) : (
                        <Badge variant="outline">Normal</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleViewDetails(event)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>

          {filteredEvents.length === 0 && !isLoading && (
            <div className="text-center py-8 text-muted-foreground">
              Nenhum evento de auditoria encontrado.
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialog de Detalhes */}
      <Dialog open={showDetailsDialog} onOpenChange={setShowDetailsDialog}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Detalhes do Evento de Auditoria</DialogTitle>
          </DialogHeader>
          {selectedEvent && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Data/Hora:</label>
                  <p className="text-sm text-muted-foreground">
                    {format(new Date(selectedEvent.created_at), "dd/MM/yyyy HH:mm:ss")}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium">Tipo de Evento:</label>
                  <Badge variant="outline">{selectedEvent.event_type}</Badge>
                </div>
                <div>
                  <label className="text-sm font-medium">Severidade:</label>
                  <div className="flex items-center gap-2">
                    {getSeverityIcon(selectedEvent.severity)}
                    <Badge variant={getSeverityBadgeVariant(selectedEvent.severity)}>
                      {selectedEvent.severity}
                    </Badge>
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium">Pontuação de Risco:</label>
                  <p className="text-sm">{selectedEvent.risk_score}/100</p>
                </div>
                <div>
                  <label className="text-sm font-medium">Usuário:</label>
                  <p className="text-sm text-muted-foreground">
                    {selectedEvent.user_email || "Sistema"} ({selectedEvent.user_role})
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium">IP Address:</label>
                  <p className="text-sm text-muted-foreground font-mono">
                    {selectedEvent.ip_address || "N/A"}
                  </p>
                </div>
              </div>
              
              <div>
                <label className="text-sm font-medium">Ação:</label>
                <p className="text-sm text-muted-foreground">{selectedEvent.action}</p>
              </div>
              
              <div>
                <label className="text-sm font-medium">Detalhes:</label>
                <pre className="mt-2 p-4 bg-muted rounded-lg text-sm overflow-auto max-h-[300px]">
                  {JSON.stringify(selectedEvent.details, null, 2)}
                </pre>
              </div>

              {selectedEvent.requires_review && !selectedEvent.reviewed_at && (
                <div className="space-y-4 border-t pt-4">
                  <h4 className="font-medium">Revisar Evento</h4>
                  <Textarea
                    placeholder="Adicione suas observações sobre este evento..."
                    value={reviewNotes}
                    onChange={(e) => setReviewNotes(e.target.value)}
                  />
                  <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={() => setShowDetailsDialog(false)}>
                      Cancelar
                    </Button>
                    <Button onClick={handleReviewEvent}>
                      Marcar como Revisado
                    </Button>
                  </div>
                </div>
              )}

              {selectedEvent.reviewed_at && (
                <div className="border-t pt-4">
                  <h4 className="font-medium mb-2">Revisão</h4>
                  <p className="text-sm text-muted-foreground">
                    Revisado em: {format(new Date(selectedEvent.reviewed_at), "dd/MM/yyyy HH:mm")}
                  </p>
                  {selectedEvent.review_notes && (
                    <p className="text-sm mt-2">{selectedEvent.review_notes}</p>
                  )}
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}