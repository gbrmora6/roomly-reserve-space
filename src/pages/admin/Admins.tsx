import React, { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogFooter, AlertDialogCancel, AlertDialogAction } from "@/components/ui/alert-dialog";

interface AdminUser {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  branch_id: string;
  branch_name?: string;
}

interface Branch {
  id: string;
  name: string;
}

const AdminsPage: React.FC = () => {
  const [admins, setAdmins] = useState<AdminUser[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    first_name: "",
    last_name: "",
    email: "",
    password: "",
    branch_id: ""
  });
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState<AdminUser | null>(null);
  const [removing, setRemoving] = useState<AdminUser | null>(null);
  const [removingLoading, setRemovingLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      // Buscar filiais
      const { data: branchesData } = await supabase.from("branches").select("id, name");
      setBranches(branchesData || []);
      // Buscar admins
      const { data: adminsData } = await supabase
        .from("profiles")
        .select("id, email, first_name, last_name, branch_id, branches(name)")
        .eq("role", "admin");
      // Mapear branch_name
      const adminsList = (adminsData || []).map((admin: any) => ({
        ...admin,
        branch_name: admin.branches?.name || "-"
      }));
      setAdmins(adminsList);
      setLoading(false);
    };
    fetchData();
  }, []);

  const handleOpen = () => {
    setEditing(null);
    setForm({ first_name: "", last_name: "", email: "", password: "", branch_id: branches[0]?.id || "" });
    setOpen(true);
  };

  const handleEdit = (admin: AdminUser) => {
    setEditing(admin);
    setForm({
      first_name: admin.first_name,
      last_name: admin.last_name,
      email: admin.email,
      password: "",
      branch_id: admin.branch_id
    });
    setOpen(true);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleBranchChange = (value: string) => {
    setForm({ ...form, branch_id: value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (editing) {
        // Edição: atualizar no profiles e no Auth
        // 1. Atualizar tabela profiles
        const { error: profileError } = await supabase.from("profiles").update({
          first_name: form.first_name,
          last_name: form.last_name,
          email: form.email,
          branch_id: form.branch_id
        }).eq("id", editing.id);
        if (profileError) throw profileError;
        // 2. Atualizar no Auth (apenas se e-mail, nome ou branch mudou)
        const { error: userError } = await supabase.auth.admin.updateUserById(editing.id, {
          email: form.email,
          user_metadata: {
            first_name: form.first_name,
            last_name: form.last_name,
            branch_id: form.branch_id,
            role: "admin"
          }
        });
        if (userError) throw userError;
        toast({ title: "Admin atualizado com sucesso!" });
      } else {
        // Criação: 1. Criar usuário no Auth
        const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
          email: form.email,
          password: form.password,
          options: {
            data: {
              first_name: form.first_name,
              last_name: form.last_name,
              branch_id: form.branch_id,
              role: "admin"
            }
          }
        });
        if (signUpError) throw signUpError;
        const userId = signUpData.user?.id;
        if (!userId) throw new Error("Usuário não criado no Auth");
        // 2. Criar perfil na tabela profiles
        const { error: profileError } = await supabase.from("profiles").upsert({
          id: userId,
          email: form.email,
          first_name: form.first_name,
          last_name: form.last_name,
          branch_id: form.branch_id,
          role: "admin"
        });
        if (profileError) throw profileError;
        toast({ title: "Admin criado com sucesso!" });
      }
      setOpen(false);
      setEditing(null);
      // Atualizar lista
      const { data: adminsData } = await supabase
        .from("profiles")
        .select("id, email, first_name, last_name, branch_id, branches(name)")
        .eq("role", "admin");
      const adminsList = (adminsData || []).map((admin: any) => ({
        ...admin,
        branch_name: admin.branches?.name || "-"
      }));
      setAdmins(adminsList);
    } catch (err: any) {
      toast({ title: "Erro ao salvar admin", description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleRemove = (admin: AdminUser) => {
    setRemoving(admin);
  };

  const confirmRemove = async () => {
    if (!removing) return;
    setRemovingLoading(true);
    try {
      // 1. Remover do Auth
      const { error: authError } = await supabase.auth.admin.deleteUser(removing.id);
      if (authError) throw authError;
      // 2. Remover do profiles
      const { error: profileError } = await supabase.from("profiles").delete().eq("id", removing.id);
      if (profileError) throw profileError;
      toast({ title: "Admin removido com sucesso!" });
      setRemoving(null);
      // Atualizar lista
      const { data: adminsData } = await supabase
        .from("profiles")
        .select("id, email, first_name, last_name, branch_id, branches(name)")
        .eq("role", "admin");
      const adminsList = (adminsData || []).map((admin: any) => ({
        ...admin,
        branch_name: admin.branches?.name || "-"
      }));
      setAdmins(adminsList);
    } catch (err: any) {
      toast({ title: "Erro ao remover admin", description: err.message, variant: "destructive" });
    } finally {
      setRemovingLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto py-8">
      <Card>
        <CardHeader>
          <CardTitle>Usuários Admin</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex justify-end mb-4">
            <Button onClick={handleOpen}>Adicionar Admin</Button>
          </div>
          {loading ? (
            <div>Carregando...</div>
          ) : (
            <table className="min-w-full border text-sm">
              <thead>
                <tr className="bg-gray-100">
                  <th className="p-2 text-left">Nome</th>
                  <th className="p-2 text-left">E-mail</th>
                  <th className="p-2 text-left">Filial</th>
                  <th className="p-2 text-left">Ações</th>
                </tr>
              </thead>
              <tbody>
                {admins.map((admin) => (
                  <tr key={admin.id} className="border-b">
                    <td className="p-2">{admin.first_name} {admin.last_name}</td>
                    <td className="p-2">{admin.email}</td>
                    <td className="p-2">{admin.branch_name}</td>
                    <td className="p-2">
                      <Button variant="outline" size="sm" className="mr-2" onClick={() => handleEdit(admin)}>Editar</Button>
                      <Button variant="destructive" size="sm" onClick={() => handleRemove(admin)}>Remover</Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? "Editar Admin" : "Novo Admin"}</DialogTitle>
          </DialogHeader>
          <form className="space-y-4" onSubmit={handleSubmit}>
            <div>
              <Label htmlFor="first_name">Nome</Label>
              <Input id="first_name" name="first_name" value={form.first_name} onChange={handleChange} required />
            </div>
            <div>
              <Label htmlFor="last_name">Sobrenome</Label>
              <Input id="last_name" name="last_name" value={form.last_name} onChange={handleChange} required />
            </div>
            <div>
              <Label htmlFor="email">E-mail</Label>
              <Input id="email" name="email" type="email" value={form.email} onChange={handleChange} required />
            </div>
            {!editing && (
              <div>
                <Label htmlFor="password">Senha</Label>
                <Input id="password" name="password" type="password" value={form.password} onChange={handleChange} required minLength={6} />
              </div>
            )}
            <div>
              <Label htmlFor="branch_id">Filial</Label>
              <Select value={form.branch_id} onValueChange={handleBranchChange}>
                <SelectTrigger id="branch_id">
                  <SelectValue placeholder="Selecione a filial" />
                </SelectTrigger>
                <SelectContent>
                  {branches.map((branch) => (
                    <SelectItem key={branch.id} value={branch.id}>{branch.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => { setOpen(false); setEditing(null); }} disabled={saving}>Cancelar</Button>
              <Button type="submit" disabled={saving}>{saving ? "Salvando..." : "Salvar"}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
      <AlertDialog open={!!removing} onOpenChange={open => { if (!open) setRemoving(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover admin</AlertDialogTitle>
          </AlertDialogHeader>
          <div>Tem certeza que deseja remover o admin <b>{removing?.first_name} {removing?.last_name}</b>? Esta ação não pode ser desfeita.</div>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={removingLoading}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmRemove} disabled={removingLoading} className="bg-destructive text-white">{removingLoading ? "Removendo..." : "Remover"}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default AdminsPage; 