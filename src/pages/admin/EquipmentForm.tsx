
import React, { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";
import { ArrowLeft } from "lucide-react";

interface Equipment {
  id: string;
  name: string;
  description: string | null;
  quantity: number;
}

const EquipmentForm: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isEditing = !!id;
  
  const [equipment, setEquipment] = useState<Partial<Equipment>>({
    name: "",
    description: "",
    quantity: 1,
  });
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Carregar dados do equipamento se estiver editando
  useQuery({
    queryKey: ["equipment", id],
    enabled: isEditing,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("equipment")
        .select("*")
        .eq("id", id)
        .single();
      
      if (error) throw error;
      
      setEquipment(data);
      return data;
    },
  });
  
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setEquipment((prev) => ({ ...prev, [name]: name === "quantity" ? parseInt(value) : value }));
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    try {
      // Verificar se o nome está preenchido
      if (!equipment.name) {
        throw new Error("O nome do equipamento é obrigatório");
      }
      
      // Validar quantidade
      if (equipment.quantity !== undefined && equipment.quantity < 1) {
        throw new Error("A quantidade deve ser maior que zero");
      }
      
      // Criar/atualizar equipamento
      if (isEditing) {
        const { error } = await supabase
          .from("equipment")
          .update({
            name: equipment.name,
            description: equipment.description,
            quantity: equipment.quantity
          })
          .eq("id", id);
        
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("equipment")
          .insert({
            name: equipment.name,
            description: equipment.description,
            quantity: equipment.quantity
          });
        
        if (error) throw error;
      }
      
      toast({
        title: isEditing ? "Equipamento atualizado com sucesso" : "Equipamento criado com sucesso",
      });
      
      navigate("/admin/equipment");
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: isEditing ? "Erro ao atualizar equipamento" : "Erro ao criar equipamento",
        description: error.message,
      });
    } finally {
      setIsSubmitting(false);
    }
  };
  
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Button variant="ghost" onClick={() => navigate("/admin/equipment")}>
          <ArrowLeft className="h-4 w-4 mr-2" /> Voltar
        </Button>
        <h1 className="text-3xl font-bold">
          {isEditing ? "Editar Equipamento" : "Novo Equipamento"}
        </h1>
      </div>
      
      <form onSubmit={handleSubmit} className="space-y-6 max-w-2xl">
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nome do Equipamento</Label>
            <Input
              id="name"
              name="name"
              value={equipment.name || ""}
              onChange={handleChange}
              required
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="description">Descrição</Label>
            <Textarea
              id="description"
              name="description"
              value={equipment.description || ""}
              onChange={handleChange}
              rows={4}
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="quantity">Quantidade Disponível</Label>
            <Input
              id="quantity"
              name="quantity"
              type="number"
              min="1"
              value={equipment.quantity || 1}
              onChange={handleChange}
              required
            />
          </div>
        </div>
        
        <div className="flex justify-end">
          <Button 
            type="submit" 
            disabled={isSubmitting}
          >
            {isSubmitting ? "Salvando..." : isEditing ? "Atualizar Equipamento" : "Criar Equipamento"}
          </Button>
        </div>
      </form>
    </div>
  );
};

export default EquipmentForm;
