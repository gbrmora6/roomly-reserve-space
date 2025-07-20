import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Trash2, Edit, Building2, MapPin, Users, Calendar, TrendingUp } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";

const BranchesPage = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  const [name, setName] = useState("");
  const [city, setCity] = useState("");
  const [street, setStreet] = useState("");
  const [number, setNumber] = useState("");
  const [neighborhood, setNeighborhood] = useState("");
  const [complement, setComplement] = useState("");
  const [zipCode, setZipCode] = useState("");
  const [state, setState] = useState("");
  const [phone, setPhone] = useState("");
  
  const [editingBranch, setEditingBranch] = useState<any>(null);
  const [editName, setEditName] = useState("");
  const [editCity, setEditCity] = useState("");
  const [editStreet, setEditStreet] = useState("");
  const [editNumber, setEditNumber] = useState("");
  const [editNeighborhood, setEditNeighborhood] = useState("");
  const [editComplement, setEditComplement] = useState("");
  const [editZipCode, setEditZipCode] = useState("");
  const [editState, setEditState] = useState("");
  const [editPhone, setEditPhone] = useState("");

  // Listar filiais com estatísticas
  const { data: branches, isLoading } = useQuery({
    queryKey: ["branches-detailed"],
    queryFn: async () => {
      const { data: branchesData, error } = await supabase
        .from("branches")
        .select("*")
        .order("created_at");
      
      if (error) throw error;

      // Buscar estatísticas para cada filial
      const branchesWithStats = await Promise.all(
        branchesData.map(async (branch) => {
          const [roomsCount, equipmentCount, bookingsCount, monthlyRevenue] = await Promise.all([
            supabase.from("rooms").select("*", { count: "exact", head: true }).eq("branch_id", branch.id),
            supabase.from("equipment").select("*", { count: "exact", head: true }).eq("branch_id", branch.id),
            supabase.from("bookings").select("*", { count: "exact", head: true }).eq("branch_id", branch.id),
            supabase.from("bookings")
              .select("total_price")
              .eq("branch_id", branch.id)
              .gte("created_at", new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString())
              .neq("status", "cancelled")
          ]);

          const revenue = monthlyRevenue.data?.reduce((sum, booking) => sum + Number(booking.total_price || 0), 0) || 0;

          return {
            ...branch,
            roomsCount: roomsCount.count || 0,
            equipmentCount: equipmentCount.count || 0,
            bookingsCount: bookingsCount.count || 0,
            monthlyRevenue: revenue
          };
        })
      );

      return branchesWithStats;
    },
  });

  // Criar filial
  const createBranch = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("branches").insert({ 
        name, 
        city,
        street: street || null,
        number: number || null,
        neighborhood: neighborhood || null,
        complement: complement || null,
        zip_code: zipCode || null,
        state: state || null,
        phone: phone || null
      });
      if (error) throw error;
    },
    onSuccess: () => {
      setName("");
      setCity("");
      setStreet("");
      setNumber("");
      setNeighborhood("");
      setComplement("");
      setZipCode("");
      setState("");
      setPhone("");
      queryClient.invalidateQueries({ queryKey: ["branches-detailed"] });
      toast({
        title: "Filial criada",
        description: "Nova filial foi criada com sucesso.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  // Atualizar filial
  const updateBranch = useMutation({
    mutationFn: async ({ id, name, city, street, number, neighborhood, complement, zip_code, state, phone, email, description }: { 
      id: string; 
      name: string; 
      city: string;
      street?: string;
      number?: string;
      neighborhood?: string;
      complement?: string;
      zip_code?: string;
      state?: string;
      phone?: string;
    }) => {
      const { error } = await supabase
        .from("branches")
        .update({ 
          name, 
          city,
          street: street || null,
          number: number || null,
          neighborhood: neighborhood || null,
          complement: complement || null,
          zip_code: zip_code || null,
          state: state || null,
           phone: phone || null
        })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      setEditingBranch(null);
      setEditName("");
      setEditCity("");
      setEditStreet("");
      setEditNumber("");
      setEditNeighborhood("");
      setEditComplement("");
      setEditZipCode("");
      setEditState("");
      setEditPhone("");
      queryClient.invalidateQueries({ queryKey: ["branches-detailed"] });
      toast({
        title: "Filial atualizada",
        description: "Filial foi atualizada com sucesso.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  // Deletar filial
  const deleteBranch = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("branches").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["branches-detailed"] });
      toast({
        title: "Filial excluída",
        description: "Filial foi excluída com sucesso.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  const handleEdit = (branch: any) => {
    setEditingBranch(branch);
    setEditName(branch.name);
    setEditCity(branch.city);
    setEditStreet(branch.street || "");
    setEditNumber(branch.number || "");
    setEditNeighborhood(branch.neighborhood || "");
    setEditComplement(branch.complement || "");
    setEditZipCode(branch.zip_code || "");
    setEditState(branch.state || "");
    setEditPhone(branch.phone || "");
  };

  return (
    <div className="max-w-7xl mx-auto py-8 px-4">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Gestão de Filiais</h1>
          <p className="text-gray-600 mt-2">Gerencie suas filiais e acompanhe o desempenho</p>
        </div>
      </div>

      {/* Formulário de criação */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Nova Filial
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form
            onSubmit={e => {
              e.preventDefault();
              createBranch.mutate();
            }}
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <Label htmlFor="name">Nome da Filial</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Digite o nome da filial"
                  required
                />
              </div>
              <div>
                <Label htmlFor="city">Cidade</Label>
                <Input
                  id="city"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  placeholder="Digite a cidade"
                  required
                />
              </div>
              <div>
                <Label htmlFor="street">Rua</Label>
                <Input
                  id="street"
                  value={street}
                  onChange={(e) => setStreet(e.target.value)}
                  placeholder="Digite a rua"
                />
              </div>
              <div>
                <Label htmlFor="number">Número</Label>
                <Input
                  id="number"
                  value={number}
                  onChange={(e) => setNumber(e.target.value)}
                  placeholder="Digite o número"
                />
              </div>
              <div>
                <Label htmlFor="neighborhood">Bairro</Label>
                <Input
                  id="neighborhood"
                  value={neighborhood}
                  onChange={(e) => setNeighborhood(e.target.value)}
                  placeholder="Digite o bairro"
                />
              </div>
              <div>
                <Label htmlFor="complement">Complemento</Label>
                <Input
                  id="complement"
                  value={complement}
                  onChange={(e) => setComplement(e.target.value)}
                  placeholder="Digite o complemento (opcional)"
                />
              </div>
              <div>
                <Label htmlFor="zipCode">CEP</Label>
                <Input
                  id="zipCode"
                  value={zipCode}
                  onChange={(e) => setZipCode(e.target.value)}
                  placeholder="Digite o CEP"
                />
              </div>
              <div>
                <Label htmlFor="state">Estado</Label>
                <Input
                  id="state"
                  value={state}
                  onChange={(e) => setState(e.target.value)}
                  placeholder="Digite o estado"
                />
              </div>
              <div>
                <Label htmlFor="phone">Telefone</Label>
                <Input
                  id="phone"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="Digite o telefone"
                />
              </div>
            </div>
            <Button type="submit" disabled={createBranch.isPending}>
              {createBranch.isPending ? "Criando..." : "Adicionar Filial"}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Lista de filiais */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map(i => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="h-4 bg-gray-200 rounded mb-4"></div>
                <div className="h-3 bg-gray-200 rounded mb-2"></div>
                <div className="h-3 bg-gray-200 rounded"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {branches?.map((branch: any) => (
            <Card key={branch.id} className="hover:shadow-lg transition-shadow">
              <CardContent className="p-6">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-xl font-bold text-gray-900 mb-1">{branch.name}</h3>
                    <div className="flex items-center text-gray-600 text-sm mb-1">
                      <MapPin className="h-4 w-4 mr-1" />
                      {branch.city}
                    </div>
                    {(branch.street || branch.number) && (
                      <div className="text-gray-500 text-xs">
                        {[branch.street, branch.number].filter(Boolean).join(", ")}
                        {branch.neighborhood && (
                          <div className="text-xs text-gray-500">{branch.neighborhood}</div>
                        )}
                      </div>
                    )}
                    {branch.phone && (
                      <div className="text-gray-500 text-xs mt-1">
                        📞 {branch.phone}
                      </div>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEdit(branch)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => deleteBranch.mutate(branch.id)}
                      disabled={deleteBranch.isPending}
                    >
                      <Trash2 className="h-4 w-4 text-red-500" />
                    </Button>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div className="text-center p-3 bg-blue-50 rounded-lg">
                    <div className="text-2xl font-bold text-blue-600">{branch.roomsCount}</div>
                    <div className="text-xs text-blue-600">Salas</div>
                  </div>
                  <div className="text-center p-3 bg-green-50 rounded-lg">
                    <div className="text-2xl font-bold text-green-600">{branch.equipmentCount}</div>
                    <div className="text-xs text-green-600">Equipamentos</div>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="flex items-center text-gray-600">
                      <Calendar className="h-4 w-4 mr-1" />
                      Reservas
                    </span>
                    <Badge variant="secondary">{branch.bookingsCount}</Badge>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="flex items-center text-gray-600">
                      <TrendingUp className="h-4 w-4 mr-1" />
                      Faturamento
                    </span>
                    <Badge variant="default">
                      R$ {branch.monthlyRevenue.toFixed(2)}
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Dialog de edição */}
      <Dialog open={!!editingBranch} onOpenChange={() => setEditingBranch(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Filial</DialogTitle>
            <DialogDescription>
              Atualize as informações da filial
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="edit-name">Nome da Filial</Label>
                <Input
                  id="edit-name"
                  value={editName}
                  onChange={e => setEditName(e.target.value)}
                  placeholder="Digite o nome da filial"
                />
              </div>
              <div>
                <Label htmlFor="edit-city">Cidade</Label>
                <Input
                  id="edit-city"
                  value={editCity}
                  onChange={e => setEditCity(e.target.value)}
                  placeholder="Digite a cidade"
                />
              </div>
              <div>
                <Label htmlFor="edit-street">Rua</Label>
                <Input
                  id="edit-street"
                  value={editStreet}
                  onChange={e => setEditStreet(e.target.value)}
                  placeholder="Digite a rua"
                />
              </div>
              <div>
                <Label htmlFor="edit-number">Número</Label>
                <Input
                  id="edit-number"
                  value={editNumber}
                  onChange={e => setEditNumber(e.target.value)}
                  placeholder="Digite o número"
                />
              </div>
              <div>
                <Label htmlFor="edit-neighborhood">Bairro</Label>
                <Input
                  id="edit-neighborhood"
                  value={editNeighborhood}
                  onChange={e => setEditNeighborhood(e.target.value)}
                  placeholder="Digite o bairro"
                />
              </div>
              <div>
                <Label htmlFor="edit-complement">Complemento</Label>
                <Input
                  id="edit-complement"
                  value={editComplement}
                  onChange={e => setEditComplement(e.target.value)}
                  placeholder="Digite o complemento (opcional)"
                />
              </div>
              <div>
                <Label htmlFor="edit-zipCode">CEP</Label>
                <Input
                  id="edit-zipCode"
                  value={editZipCode}
                  onChange={e => setEditZipCode(e.target.value)}
                  placeholder="Digite o CEP"
                />
              </div>
              <div>
                <Label htmlFor="edit-state">Estado</Label>
                <Input
                  id="edit-state"
                  value={editState}
                  onChange={e => setEditState(e.target.value)}
                  placeholder="Digite o estado"
                />
              </div>
              <div>
                <Label htmlFor="edit-phone">Telefone</Label>
                <Input
                  id="edit-phone"
                  value={editPhone}
                  onChange={e => setEditPhone(e.target.value)}
                  placeholder="Digite o telefone"
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingBranch(null)}>
              Cancelar
            </Button>
            <Button
              onClick={() => updateBranch.mutate({
                id: editingBranch.id,
                name: editName,
                city: editCity,
                street: editStreet,
                number: editNumber,
                neighborhood: editNeighborhood,
                complement: editComplement,
                zip_code: editZipCode,
                state: editState,
      phone: editPhone
              })}
              disabled={updateBranch.isPending}
            >
              {updateBranch.isPending ? "Salvando..." : "Salvar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default BranchesPage;