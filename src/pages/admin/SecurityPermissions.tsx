import React, { useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Shield, Plus, Eye, Trash2, Calendar } from "lucide-react";
import { format } from "date-fns";
import { usePermissions, PermissionType, ResourceType } from "@/hooks/usePermissions";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useBranchFilter } from "@/hooks/useBranchFilter";

export default function SecurityPermissions() {
  const { branchId } = useBranchFilter();
  const { allPermissions, loadingAllPermissions, grantPermission, revokePermission } = usePermissions();
  const [showGrantDialog, setShowGrantDialog] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterResource, setFilterResource] = useState("all");
  const [grantForm, setGrantForm] = useState({
    userId: "",
    resourceType: "" as ResourceType,
    permissionType: "" as PermissionType,
    expiresAt: "",
    notes: "",
  });

  // Buscar usuários para o formulário
  const { data: users = [] } = useQuery({
    queryKey: ['users-for-permissions', branchId],
    queryFn: async () => {
      if (!branchId) return [];

      const { data, error } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, email, role')
        .eq('branch_id', branchId)
        .order('first_name');

      if (error) throw error;
      return data;
    },
    enabled: !!branchId,
  });

  const resources: ResourceType[] = [
    'rooms', 'equipment', 'bookings', 'clients', 'products',
    'financial', 'reports', 'users', 'branches', 'coupons',
    'inventory', 'notifications', 'logs', 'backups'
  ];

  const permissions: PermissionType[] = ['read', 'write', 'delete', 'admin', 'super_admin'];

  const filteredPermissions = allPermissions.filter(permission => {
    const searchMatch = searchTerm === "" || 
      permission.profiles?.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      permission.resource_type.includes(searchTerm.toLowerCase());
    
    const resourceMatch = filterResource === "all" || permission.resource_type === filterResource;
    
    return searchMatch && resourceMatch;
  });

  const handleGrantPermission = () => {
    if (!grantForm.userId || !grantForm.resourceType || !grantForm.permissionType) {
      return;
    }

    grantPermission({
      userId: grantForm.userId,
      resourceType: grantForm.resourceType,
      permissionType: grantForm.permissionType,
      branchId: "default-branch", // Will be set automatically by the function
      expiresAt: grantForm.expiresAt || undefined,
      notes: grantForm.notes || undefined,
    });

    setGrantForm({
      userId: "",
      resourceType: "" as ResourceType,
      permissionType: "" as PermissionType,
      expiresAt: "",
      notes: "",
    });
    setShowGrantDialog(false);
  };

  const getPermissionBadgeVariant = (permission: PermissionType) => {
    switch (permission) {
      case 'read': return 'outline';
      case 'write': return 'default';
      case 'delete': return 'destructive';
      case 'admin': return 'secondary';
      case 'super_admin': return 'destructive';
      default: return 'outline';
    }
  };

  const getResourceBadgeVariant = (resource: ResourceType): "default" | "secondary" | "destructive" | "outline" => {
    return 'secondary';
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-6 w-6" />
            Controle de Permissões
          </CardTitle>
        </CardHeader>
        <CardContent>
          {/* Filtros e Ações */}
          <div className="flex justify-between items-center mb-6">
            <div className="flex gap-4">
              <Input
                placeholder="Buscar por usuário ou recurso..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-80"
              />
              <Select value={filterResource} onValueChange={setFilterResource}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Filtrar por recurso" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os recursos</SelectItem>
                  {resources.map((resource) => (
                    <SelectItem key={resource} value={resource}>
                      {resource}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <Dialog open={showGrantDialog} onOpenChange={setShowGrantDialog}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Conceder Permissão
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Conceder Nova Permissão</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="user">Usuário</Label>
                    <Select value={grantForm.userId} onValueChange={(value) => 
                      setGrantForm({ ...grantForm, userId: value })
                    }>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione um usuário" />
                      </SelectTrigger>
                      <SelectContent>
                        {users.map((user) => (
                          <SelectItem key={user.id} value={user.id}>
                            {user.first_name} {user.last_name} ({user.email})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="resource">Recurso</Label>
                    <Select value={grantForm.resourceType} onValueChange={(value) => 
                      setGrantForm({ ...grantForm, resourceType: value as ResourceType })
                    }>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione um recurso" />
                      </SelectTrigger>
                      <SelectContent>
                        {resources.map((resource) => (
                          <SelectItem key={resource} value={resource}>
                            {resource}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="permission">Permissão</Label>
                    <Select value={grantForm.permissionType} onValueChange={(value) => 
                      setGrantForm({ ...grantForm, permissionType: value as PermissionType })
                    }>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione uma permissão" />
                      </SelectTrigger>
                      <SelectContent>
                        {permissions.map((permission) => (
                          <SelectItem key={permission} value={permission}>
                            {permission}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="expires">Data de Expiração (opcional)</Label>
                    <Input
                      type="datetime-local"
                      value={grantForm.expiresAt}
                      onChange={(e) => setGrantForm({ ...grantForm, expiresAt: e.target.value })}
                    />
                  </div>

                  <div>
                    <Label htmlFor="notes">Observações (opcional)</Label>
                    <Textarea
                      value={grantForm.notes}
                      onChange={(e) => setGrantForm({ ...grantForm, notes: e.target.value })}
                      placeholder="Motivo da concessão, contexto, etc."
                    />
                  </div>

                  <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={() => setShowGrantDialog(false)}>
                      Cancelar
                    </Button>
                    <Button onClick={handleGrantPermission}>
                      Conceder Permissão
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          {/* Tabela de Permissões */}
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Usuário</TableHead>
                <TableHead>Recurso</TableHead>
                <TableHead>Permissão</TableHead>
                <TableHead>Concedido por</TableHead>
                <TableHead>Expira em</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredPermissions.map((permission) => (
                <TableRow key={permission.id}>
                  <TableCell>
                    <div>
                      <p className="font-medium">
                        {permission.profiles?.first_name} {permission.profiles?.last_name}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {permission.profiles?.email}
                      </p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={getResourceBadgeVariant(permission.resource_type)}>
                      {permission.resource_type}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={getPermissionBadgeVariant(permission.permission_type)}>
                      {permission.permission_type}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">
                      {permission.granted_by_profile?.first_name} {permission.granted_by_profile?.last_name}
                      <div className="text-muted-foreground">
                        {format(new Date(permission.granted_at), "dd/MM/yyyy")}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    {permission.expires_at ? (
                      <div className="flex items-center gap-1 text-sm">
                        <Calendar className="h-3 w-3" />
                        {format(new Date(permission.expires_at), "dd/MM/yyyy")}
                      </div>
                    ) : (
                      <span className="text-muted-foreground text-sm">Nunca</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant={permission.is_active ? "default" : "secondary"}>
                      {permission.is_active ? "Ativa" : "Inativa"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      {permission.is_active && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => revokePermission(permission.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {filteredPermissions.length === 0 && !loadingAllPermissions && (
            <div className="text-center py-8 text-muted-foreground">
              Nenhuma permissão encontrada.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}