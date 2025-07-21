
import React, { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useAdminCRUDLogger } from "@/hooks/useAdminCRUDLogger";
import { WeeklyScheduleForm, WeeklyScheduleItem } from "@/components/admin/shared/WeeklyScheduleForm";

interface Equipment {
  id: string;
  name: string;
  description: string | null;
  quantity: number;
  price_per_hour: number;
}

const AdminEquipmentForm: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isEditing = !!id;
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();
  const { logCreate, logUpdate } = useAdminCRUDLogger();
  
  const [equipment, setEquipment] = useState<Partial<Equipment>>({
    name: "",
    description: "",
    quantity: 1,
    price_per_hour: 0,
  });
  
  const [schedules, setSchedules] = useState<WeeklyScheduleItem[]>([]);
  
  const { data: equipmentData } = useQuery({
    queryKey: ["equipment", id],
    enabled: isEditing,
    queryFn: async () => {
      const { data: equipmentInfo, error: equipmentError } = await supabase
        .from("equipment")
        .select("*")
        .eq("id", id)
        .single();
      
      if (equipmentError) throw equipmentError;
      
      const { data: scheduleData } = await supabase
        .from("equipment_schedules")
        .select("*")
        .eq("equipment_id", id);
      
      setEquipment(equipmentInfo || {});
      
      if (scheduleData) {
        setSchedules(scheduleData.map(s => ({
          weekday: s.weekday,
          start_time: s.start_time,
          end_time: s.end_time
        })));
      }
      
      return { equipment: equipmentInfo, schedules: scheduleData };
    },
  });
  
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setEquipment((prev) => ({ 
      ...prev, 
      [name]: name === 'price_per_hour' || name === 'quantity' ? Number(value) : value 
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    try {
      if (!equipment.name) {
        throw new Error("O nome do equipamento é obrigatório");
      }
      
      const branchId = user?.user_metadata?.branch_id;
      if (!user || !branchId) {
        throw new Error("Sessão expirada ou usuário sem filial associada. Faça login novamente.");
      }
      
      let equipmentId = id;
      let errorEquipment;
      
      if (!isEditing) {
        // Criação: insert
        const { data, error } = await supabase
          .from("equipment")
          .insert({
            name: equipment.name,
            description: equipment.description,
            quantity: equipment.quantity,
            price_per_hour: equipment.price_per_hour,
            branch_id: branchId,
            is_active: true,
          })
          .select("id")
          .single();
        errorEquipment = error;
        equipmentId = data?.id;
        
        // Log da criação
        if (!error && equipmentId) {
          await logCreate('equipment', equipmentId, 'Equipamento criado');
        }
      } else {
        // Edição: update
        const { error } = await supabase
          .from("equipment")
          .update({
            name: equipment.name,
            description: equipment.description,
            quantity: equipment.quantity,
            price_per_hour: equipment.price_per_hour,
          })
          .eq("id", id);
        errorEquipment = error;
        
        // Log da atualização
        if (!error) {
          await logUpdate('equipment', id, 'Equipamento atualizado');
        }
      }
      
      if (errorEquipment || !equipmentId) {
        throw new Error(errorEquipment?.message || "Erro desconhecido ao criar/atualizar equipamento");
      }

      // Gerenciar schedules
      if (isEditing) {
        // Ao editar, primeiro remove os schedules antigos
        const { error: deleteSchedulesError } = await supabase
          .from("equipment_schedules")
          .delete()
          .eq("equipment_id", equipmentId);

        if (deleteSchedulesError) {
          throw new Error(deleteSchedulesError.message || "Erro ao remover horários antigos");
        }
      }

      // Inserir novos schedules (tanto para criação quanto edição)
      if (schedules.length > 0) {
        const schedulesToInsert = schedules.map(schedule => ({
          equipment_id: equipmentId,
          weekday: schedule.weekday,
          start_time: schedule.start_time,
          end_time: schedule.end_time,
          branch_id: branchId,
        }));

        const { error: errorInsertSchedules } = await supabase
          .from("equipment_schedules")
          .insert(schedulesToInsert);

        if (errorInsertSchedules) {
          throw new Error(errorInsertSchedules.message || "Erro ao inserir horários");
        }
      }
      
      toast({
        title: isEditing ? "Equipamento atualizado com sucesso" : "Equipamento criado com sucesso",
      });
      
      navigate("/admin/equipment");
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: isEditing ? "Erro ao atualizar equipamento" : "Erro ao criar equipamento",
        description: error.message || "Erro inesperado",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center gap-4 mb-6">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate("/admin/equipment")}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Voltar
          </Button>
          <h1 className="text-2xl font-bold">
            {isEditing ? "Editar Equipamento" : "Criar Equipamento"}
          </h1>
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Informações Básicas</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="name">Nome do Equipamento *</Label>
                <Input
                  id="name"
                  name="name"
                  value={equipment.name || ''}
                  onChange={handleChange}
                  placeholder="Digite o nome do equipamento"
                  required
                />
              </div>
              
              <div>
                <Label htmlFor="description">Descrição</Label>
                <Textarea
                  id="description"
                  name="description"
                  value={equipment.description || ''}
                  onChange={handleChange}
                  placeholder="Descreva o equipamento"
                  rows={3}
                />
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="quantity">Quantidade Disponível *</Label>
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
                
                <div>
                  <Label htmlFor="price_per_hour">Preço por Hora (R$) *</Label>
                  <Input
                    id="price_per_hour"
                    name="price_per_hour"
                    type="number"
                    min="0"
                    step="0.01"
                    value={equipment.price_per_hour || 0}
                    onChange={handleChange}
                    required
                  />
                </div>
              </div>
            </CardContent>
          </Card>
          
          <WeeklyScheduleForm
            schedules={schedules}
            onChange={setSchedules}
            title="Horários de Disponibilidade"
          />
          
          <div className="flex justify-end gap-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate("/admin/equipment")}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Salvando..." : (isEditing ? "Atualizar" : "Criar")}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AdminEquipmentForm;
