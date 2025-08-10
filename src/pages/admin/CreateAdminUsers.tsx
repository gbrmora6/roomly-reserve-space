import React, { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2, PlusCircle, RefreshCcw, Trash2, KeyRound } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface Branch { id: string; name: string; }
interface AdminUser { id: string; email: string; first_name: string; last_name: string; branch_id: string; branch_name?: string; }

// Prefer env var, fallback to project URL used by Supabase client if not set
const SUPABASE_URL = (import.meta as any)?.env?.VITE_SUPABASE_URL || "https://fgiidcdsvmqxdkclgety.supabase.co";
const API_BASE = `${SUPABASE_URL}/functions/v1/admin-user-mgmt`;

export default function CreateAdminUsers() {
  const { toast } = useToast();
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [usersLoading, setUsersLoading] = useState(false);
  const [admins, setAdmins] = useState<AdminUser[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [form, setForm] = useState({
    first_name: "",
    last_name: "",
    email: "",
    password: "",
    branch_id: "",
  });

  const fetchToken = async () => {
    const { data } = await supabase.auth.getSession();
    return data.session?.access_token || "";
  };

  const fetchData = async () => {
    setLoading(true);
    setErrorMessage(null);
    try {
      const [{ data: branchesData, error: branchesErr }, { data: adminsData, error: adminsErr }] = await Promise.all([
        supabase.from("branches").select("id, name").order("name"),
        supabase.from("profiles").select("id, email, first_name, last_name, branch_id, branches(name)").eq("role", "admin")
      ]);

      if (branchesErr) throw branchesErr;
      if (adminsErr) throw adminsErr;

      setBranches(branchesData || []);
      const adminsList = (adminsData || []).map((admin: any) => ({...admin, branch_name: admin.branches?.name || "-"}));
      setAdmins(adminsList);
      if (branchesData && branchesData.length > 0) {
        setForm((f) => ({ ...f, branch_id: branchesData[0].id }));
      }
    } catch (e: any) {
      console.error("Erro ao carregar dados:", e);
      setErrorMessage(e?.message || "Erro ao carregar dados");
      toast({ variant: "destructive", title: "Erro ao carregar dados", description: e?.message || String(e) });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const parseResponse = async (res: Response) => {
    const status = res.status;
    let text = "";
    try {
      text = await res.text();
    } catch {
      // ignore
    }
    let json: any = null;
    try {
      json = text ? JSON.parse(text) : null;
    } catch {
      // not json
    }
    return { status, text, json };
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setErrorMessage(null);
    try {
      const token = await fetchToken();
      if (!token) throw new Error("Sessão expirada. Faça login novamente.");
      const res = await fetch(`${API_BASE}/create`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(form)
      });
      const { status, text, json } = await parseResponse(res);
      if (!res.ok || (json && json.success === false)) {
        const backendMsg = json?.error || text || "Erro desconhecido";
        const msg = `Falha ao criar usuário (HTTP ${status}). ${backendMsg}`;
        console.error("Create admin error:", { status, backendMsg, json });
        setErrorMessage(msg);
        toast({ variant: "destructive", title: "Erro ao criar usuário", description: backendMsg });
        return;
      }
      toast({ title: json?.message || "Usuário admin criado" });
      setForm({ first_name: "", last_name: "", email: "", password: "", branch_id: form.branch_id });
      await fetchData();
    } catch (e: any) {
      console.error("Erro no handleCreate:", e);
      const msg = e?.message || String(e) || "Erro ao criar usuário";
      setErrorMessage(msg);
      toast({ variant: "destructive", title: "Erro", description: msg });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (userId: string) => {
    if (!confirm("Tem certeza que deseja excluir este usuário?")) return;
    setUsersLoading(true);
    setErrorMessage(null);
    try {
      const token = await fetchToken();
      if (!token) throw new Error("Sessão expirada. Faça login novamente.");
      const res = await fetch(`${API_BASE}/delete`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ userId })
      });
      const { status, text, json } = await parseResponse(res);
      if (!res.ok || (json && json.success === false)) {
        const backendMsg = json?.error || text || "Erro desconhecido";
        const msg = `Falha ao excluir usuário (HTTP ${status}). ${backendMsg}`;
        console.error("Delete admin error:", { status, backendMsg, json });
        setErrorMessage(msg);
        toast({ variant: "destructive", title: "Erro ao excluir usuário", description: backendMsg });
        return;
      }
      toast({ title: json?.message || "Usuário excluído" });
      await fetchData();
    } catch (e: any) {
      console.error("Erro no handleDelete:", e);
      const msg = e?.message || String(e) || "Falha ao excluir usuário";
      setErrorMessage(msg);
      toast({ variant: "destructive", title: "Erro", description: msg });
    } finally {
      setUsersLoading(false);
    }
  };

  const handleResetPassword = async (userId: string) => {
    const newPassword = prompt("Digite a nova senha (mínimo 6 caracteres)");
    if (!newPassword) return;
    if (newPassword.length < 6) { toast({ variant: "destructive", title: "Senha muito curta" }); return; }
    setUsersLoading(true);
    setErrorMessage(null);
    try {
      const token = await fetchToken();
      if (!token) throw new Error("Sessão expirada. Faça login novamente.");
      const res = await fetch(`${API_BASE}/update`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ userId, password: newPassword })
      });
      const { status, text, json } = await parseResponse(res);
      if (!res.ok || (json && json.success === false)) {
        const backendMsg = json?.error || text || "Erro desconhecido";
        const msg = `Falha ao redefinir senha (HTTP ${status}). ${backendMsg}`;
        console.error("Reset password error:", { status, backendMsg, json });
        setErrorMessage(msg);
        toast({ variant: "destructive", title: "Erro ao redefinir senha", description: backendMsg });
        return;
      }
      toast({ title: json?.message || "Senha redefinida com sucesso" });
    } catch (e: any) {
      console.error("Erro no handleResetPassword:", e);
      const msg = e?.message || String(e) || "Falha ao redefinir senha";
      setErrorMessage(msg);
      toast({ variant: "destructive", title: "Erro", description: msg });
    } finally {
      setUsersLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Criar Usuários Admin</CardTitle>
        </CardHeader>
        <CardContent>
          {errorMessage && (
            <div className="mb-4">
              <Alert variant="destructive">
                <AlertDescription>
                  {errorMessage}
                </AlertDescription>
              </Alert>
            </div>
          )}
          <form className="grid grid-cols-1 md:grid-cols-2 gap-4" onSubmit={handleCreate}>
            <div>
              <Label htmlFor="first_name">Nome</Label>
              <Input id="first_name" value={form.first_name} onChange={(e) => setForm({ ...form, first_name: e.target.value })} required />
            </div>
            <div>
              <Label htmlFor="last_name">Sobrenome</Label>
              <Input id="last_name" value={form.last_name} onChange={(e) => setForm({ ...form, last_name: e.target.value })} required />
            </div>
            <div>
              <Label htmlFor="email">E-mail</Label>
              <Input id="email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
            </div>
            <div>
              <Label htmlFor="password">Senha</Label>
              <Input id="password" type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required minLength={6} />
            </div>
            <div>
              <Label htmlFor="branch_id">Filial</Label>
              <Select value={form.branch_id} onValueChange={(value) => setForm({ ...form, branch_id: value })}>
                <SelectTrigger id="branch_id">
                  <SelectValue placeholder="Selecione a filial" />
                </SelectTrigger>
                <SelectContent>
                  {branches.map((b) => (
                    <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="md:col-span-2 flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={fetchData} disabled={saving || loading}>
                <RefreshCcw className="h-4 w-4 mr-2" /> Atualizar
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? (<><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Salvando...</>) : (<><PlusCircle className="h-4 w-4 mr-2" /> Criar Admin</>)}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Administradores</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Filial</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {admins.map((admin) => (
                <TableRow key={admin.id}>
                  <TableCell>{admin.first_name} {admin.last_name}</TableCell>
                  <TableCell>{admin.email}</TableCell>
                  <TableCell>{admin.branch_name}</TableCell>
                  <TableCell className="text-right space-x-2">
                    <Button variant="outline" size="sm" onClick={() => handleResetPassword(admin.id)} disabled={usersLoading}>
                      <KeyRound className="h-4 w-4 mr-1" /> Resetar Senha
                    </Button>
                    <Button variant="destructive" size="sm" onClick={() => handleDelete(admin.id)} disabled={usersLoading}>
                      <Trash2 className="h-4 w-4 mr-1" /> Excluir
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}