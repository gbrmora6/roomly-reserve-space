
import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

const BranchesPage = () => {
  const queryClient = useQueryClient();
  const [name, setName] = useState("");
  const [city, setCity] = useState("");

  // Listar filiais
  const { data: branches, isLoading } = useQuery({
    queryKey: ["branches"],
    queryFn: async () => {
      const { data, error } = await supabase.from("branches").select("*").order("created_at");
      if (error) throw error;
      return data;
    },
  });

  // Criar filial
  const createBranch = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("branches").insert({ name, city });
      if (error) throw error;
    },
    onSuccess: () => {
      setName("");
      setCity("");
      queryClient.invalidateQueries({ queryKey: ["branches"] });
    },
  });

  return (
    <div className="max-w-2xl mx-auto py-8">
      <Card>
        <CardHeader>
          <CardTitle>Filiais</CardTitle>
        </CardHeader>
        <CardContent>
          <form
            className="flex gap-2 mb-6"
            onSubmit={e => {
              e.preventDefault();
              createBranch.mutate();
            }}
          >
            <Input
              placeholder="Nome da filial"
              value={name}
              onChange={e => setName(e.target.value)}
              required
            />
            <Input
              placeholder="Cidade"
              value={city}
              onChange={e => setCity(e.target.value)}
              required
            />
            <Button type="submit" disabled={createBranch.isPending}>
              Adicionar
            </Button>
          </form>
          {isLoading ? (
            <div>Carregando...</div>
          ) : (
            <ul className="space-y-2">
              {branches?.map((branch: any) => (
                <li key={branch.id} className="flex justify-between items-center border-b py-2">
                  <span>
                    <b>{branch.name}</b> — {branch.city}
                  </span>
                  {/* Aqui você pode adicionar botões de editar/excluir */}
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default BranchesPage;
