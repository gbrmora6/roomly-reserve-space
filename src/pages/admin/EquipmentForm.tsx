import React, { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useAdminCRUDLogger } from "@/hooks/useAdminCRUDLogger";

interface Equipment {
  id: string;
  name: string;
  description: string | null;
  quantity: number;
  price_per_hour: number;
}

interface EquipmentSchedule {
  weekday: 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday';
  start_time: string;
  end_time: string;
}

const WEEKDAYS = [
  { value: 'monday', label: 'Segunda-feira' },
  { value: 'tuesday', label: 'Terça-feira' },
  { value: 'wednesday', label: 'Quarta-feira' },
  { value: 'thursday', label: 'Quinta-feira' },
  { value: 'friday', label: 'Sexta-feira' },
  { value: 'saturday', label: 'Sábado' },
  { value: 'sunday', label: 'Domingo' }
] as const;

const WEEKDAYS_MAP: Record<string, EquipmentSchedule['weekday']> = {
  'monday': 'monday',
  'tuesday': 'tuesday',
  'wednesday': 'wednesday',
  'thursday': 'thursday',
  'friday': 'friday',
  'saturday': 'saturday',
  'sunday': 'sunday'
};

const WEEKDAYS_MAP_REVERSE: Record<EquipmentSchedule['weekday'], string> = {
  'monday': 'monday',
  'tuesday': 'tuesday',
  'wednesday': 'wednesday',
  'thursday': 'thursday',
  'friday': 'friday',
  'saturday': 'saturday',
  'sunday': 'sunday'
};

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
  
  const [schedules, setSchedules] = useState<EquipmentSchedule[]>([]);
  
  const { data: equipmentData } = useQuery({
    queryKey: ["equipment", id],
    enabled: isEditing,
    queryFn: async () => {
      const { data: equipmentInfo, error: equipmentError } = await supabase
        .from("equipment")
        .select("*")
        .eq("id", id)
        .single();
      
      const { data: scheduleData } = await supabase
        .from("equipment_schedules")
        .select("*")
        .eq("equipment_id", id);
      
      setEquipment(equipmentInfo || {});
      
      if (scheduleData) {
        setSchedules(scheduleData);
      }
      
      return { equipment: equipmentInfo, schedules: scheduleData };
    },
  });

  const handleAddSchedule = () => {
    setSchedules([...schedules, {
      weekday: 'monday',
      start_time: '08:00',
      end_time: '17:00'
    }]);
  };
  
  const handleRemoveSchedule = (index: number) => {
    const newSchedules = schedules.filter((_, i) => i !== index);
    setSchedules(newSchedules);
  };
  
  const handleScheduleChange = (
    index: number, 
    field: keyof EquipmentSchedule, 
    value: string
  ) => {
    const newSchedules = [...schedules];
    
    if (field === 'weekday') {
      newSchedules[index] = {
        ...newSchedules[index],
        [field]: WEEKDAYS_MAP[value] as EquipmentSchedule['weekday']
      };
    } else {
      newSchedules[index] = {
        ...newSchedules[index],
        [field]: value
      };
    }
    
    setSchedules(newSchedules);
  };
  
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
          await logCreate('equipment', {
            name: equipment.name,
            description: equipment.description,
            quantity: equipment.quantity,
            price_per_hour: equipment.price_per_hour,
            branch_id: branchId,
          }, equipmentId);
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
          await logUpdate('equipment', id!, equipmentData?.equipment || {}, {
            name: equipment.name,
            description: equipment.description,
            quantity: equipment.quantity,
            price_per_hour: equipment.price_per_hour,
          });
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
                  <Label htmlFor="quantity">Quantidade</Label>
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
                  <Label htmlFor="price_per_hour">Preço por Hora (R$)</Label>
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
          
          <Card>
            <CardHeader>
              <CardTitle>Horários de Disponibilidade</CardTitle>
              <p className="text-sm text-gray-600">
                Configure os horários específicos em que o equipamento estará disponível para cada dia da semana.
              </p>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {schedules.map((schedule, index) => (
                  <div key={index} className="flex items-center gap-4 p-4 border rounded-lg">
                    <div className="flex-1">
                      <Label>Dia da Semana</Label>
                      <Select
                        value={WEEKDAYS_MAP_REVERSE[schedule.weekday] || 'monday'}
                        onValueChange={(value) => handleScheduleChange(index, 'weekday', value)}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {WEEKDAYS.map((day) => (
                            <SelectItem key={day.value} value={day.value}>
                              {day.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div className="flex-1">
                      <Label>Horário de Início</Label>
                      <Input
                        type="time"
                        value={schedule.start_time}
                        onChange={(e) => handleScheduleChange(index, 'start_time', e.target.value)}
                      />
                    </div>
                    
                    <div className="flex-1">
                      <Label>Horário de Fim</Label>
                      <Input
                        type="time"
                        value={schedule.end_time}
                        onChange={(e) => handleScheduleChange(index, 'end_time', e.target.value)}
                      />
                    </div>
                    
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => handleRemoveSchedule(index)}
                      className="mt-6"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
                
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleAddSchedule}
                  className="w-full"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Adicionar Horário
                </Button>
              </div>
            </CardContent>
          </Card>
          
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
