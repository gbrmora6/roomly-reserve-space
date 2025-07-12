import React, { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { EquipmentForm } from "@/components/equipment/EquipmentForm";
import { useAuth } from "@/contexts/AuthContext";

const AdminEquipmentForm: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { user } = useAuth();
  
  const { data: equipment, isLoading } = useQuery({
    queryKey: ["equipment", id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("equipment")
        .select("*")
        .eq("id", id)
        .single();
      
      if (error) throw error;
      return data;
    },
  });

  const handleSubmit = async (formData: any) => {
    setIsSubmitting(true);
    try {
      const branchId = user?.user_metadata?.branch_id;
      if (!user || !branchId) {
        throw new Error("Sessão expirada ou usuário sem filial associada. Faça login novamente.");
      }
      if (id) {
        const { error } = await supabase
          .from("equipment")
          .update({
            name: formData.name,
            description: formData.description,
            quantity: formData.quantity,
            price_per_hour: formData.price_per_hour,
            open_time: formData.open_time,
            close_time: formData.close_time,
            open_days: formData.open_days
          })
          .eq("id", id);
        
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("equipment")
          .insert({
            name: formData.name,
            description: formData.description,
            quantity: formData.quantity,
            price_per_hour: formData.price_per_hour,
            open_time: formData.open_time,
            close_time: formData.close_time,
            open_days: formData.open_days,
            branch_id: branchId,
            is_active: true,
          });
        
        if (error) throw error;
      }
      
      toast({
        title: id ? "Equipamento atualizado" : "Equipamento criado",
        description: "As alterações foram salvas com sucesso.",
      });
      
      navigate("/admin/equipment");
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Erro ao salvar",
        description: error.message,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Button variant="ghost" onClick={() => navigate("/admin/equipment")}>
          <ArrowLeft className="h-4 w-4 mr-2" /> Voltar
        </Button>
        <h1 className="text-3xl font-bold">
          {id ? "Editar Equipamento" : "Novo Equipamento"}
        </h1>
      </div>
      
      <EquipmentForm
        initialData={equipment ? {
          name: equipment.name,
          description: equipment.description || "",
          quantity: equipment.quantity,
          price_per_hour: equipment.price_per_hour,
          open_time: equipment.open_time || "09:00",
          close_time: equipment.close_time || "18:00",
          open_days: equipment.open_days || ["monday", "tuesday", "wednesday", "thursday", "friday"]
        } : undefined}
        onSubmit={handleSubmit}
        isSubmitting={isSubmitting}
      />
    </div>
  );
};

export default AdminEquipmentForm;
