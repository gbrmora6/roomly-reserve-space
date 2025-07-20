
import React from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Users } from "lucide-react";
import { useBranchFilter } from "@/hooks/useBranchFilter";

export default function AdminUsers() {
  const { branchId, isSuperAdmin } = useBranchFilter();

  const { data: adminUsers = [], isLoading } = useQuery({
    queryKey: ["admin-users", branchId],
    queryFn: async () => {
      if (!branchId) return [];
      const { data, error } = await supabase
        .from("profiles")
        .select("*, branches(name)")
        .eq("role", "admin")
        .eq("branch_id", branchId);
      if (error) throw error;
      return data;
    },
    enabled: !!branchId,
  });



  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <Users className="mx-auto h-12 w-12 text-muted-foreground animate-pulse" />
          <p className="mt-4 text-sm text-muted-foreground">Carregando administradores...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-6 w-6" />
            Administradores
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Filial</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {adminUsers.map((admin) => (
                <TableRow key={admin.id}>
                  <TableCell>
                    {admin.first_name} {admin.last_name}
                  </TableCell>
                  <TableCell>{admin.email}</TableCell>
                  <TableCell>{admin.branches?.name}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
