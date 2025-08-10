import React, { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";
import { ArrowLeft, Upload, X } from "lucide-react";
import { v4 as uuidv4 } from "uuid";
import { useAuth } from "@/contexts/AuthContext";
import { WeeklyScheduleManager, WeeklySchedule } from "@/components/shared/WeeklyScheduleManager";

interface Equipment {
  id: string;
  name: string;
  description: string | null;
  quantity: number;
  price_per_hour: number;
}

interface EquipmentPhoto {
  id: string;
  equipment_id: string;
  url: string;
}

const EquipmentFormNew: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isEditing = !!id;
  const { user } = useAuth();
  
  const [equipment, setEquipment] = useState({
    name: "",
    description: "",
    quantity: 1,
    price_per_hour: 0,
    minimum_interval_minutes: 60,
    advance_booking_hours: 24,
  });
  
  const [photos, setPhotos] = useState<EquipmentPhoto[]>([]);
  const [files, setFiles] = useState<File[]>([]);
  const [schedules, setSchedules] = useState<WeeklySchedule[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const { data: equipmentData } = useQuery({
    queryKey: ["equipment", id],
    enabled: isEditing,
    queryFn: async () => {
      const { data: equipmentInfo, error: equipmentError } = await supabase
        .from("equipment")
        .select("*")
        .eq("id", id)
        .single();
      
      const { data: photoData } = await supabase
        .from("equipment_photos")
        .select("*")
        .eq("equipment_id", id);
      
      const { data: scheduleData } = await supabase
        .from("equipment_schedules")
        .select("*")
        .eq("equipment_id", id);
      
      setEquipment(equipmentInfo || {});
      setPhotos(photoData || []);
      setSchedules(scheduleData || []);
      
      return { equipment: equipmentInfo, photos: photoData, schedules: scheduleData };
    },
  });
  
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setEquipment((prev) => ({ 
      ...prev, 
      [name]: name === 'price_per_hour' || name === 'quantity' ? Number(value) : value 
    }));
  };
  
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    
    const newFiles = Array.from(e.target.files);
    setFiles((prev) => [...prev, ...newFiles]);
  };
  
  const handleRemoveFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };
  
  const handleRemovePhoto = async (photoId: string) => {
    const { error } = await supabase
      .from("equipment_photos")
      .delete()
      .eq("id", photoId);
    
    if (error) {
      toast({
        variant: "destructive",
        title: "Erro ao remover foto",
        description: error.message,
      });
      return;
    }
    
    setPhotos((prev) => prev.filter((photo) => photo.id !== photoId));
    
    toast({
      title: "Foto removida com sucesso",
    });
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
            minimum_interval_minutes: equipment.minimum_interval_minutes || 60,
            advance_booking_hours: equipment.advance_booking_hours || 24,
            branch_id: branchId,
            is_active: true,
          })
          .select("id")
          .single();
        errorEquipment = error;
        equipmentId = data?.id;
      } else {
        // Edição: update
        const { error } = await supabase
          .from("equipment")
          .update({
            name: equipment.name,
            description: equipment.description,
            quantity: equipment.quantity,
            price_per_hour: equipment.price_per_hour,
            minimum_interval_minutes: equipment.minimum_interval_minutes || 60,
            advance_booking_hours: equipment.advance_booking_hours || 24,
          })
          .eq("id", id);
        errorEquipment = error;
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

      // Upload de fotos
      if (files.length > 0) {
        for (const file of files) {
          const fileExt = file.name.split(".").pop();
          const fileName = `${uuidv4()}.${fileExt}`;
          const filePath = `${equipmentId}/${fileName}`;

          const { error: uploadError } = await supabase
            .storage
            .from("equipment-photos")
            .upload(filePath, file);

          if (uploadError) {
            throw new Error(uploadError.message || "Erro ao fazer upload da imagem");
          }

          const { data: publicURLData } = supabase
            .storage
            .from("equipment-photos")
            .getPublicUrl(filePath);

          const { error: photoInsertError } = await supabase
            .from("equipment_photos")
            .insert({
              equipment_id: equipmentId,
              url: publicURLData.publicUrl,
              branch_id: branchId,
            });

          if (photoInsertError) {
            throw new Error(photoInsertError.message || "Erro ao salvar imagem do equipamento");
          }
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
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Button variant="ghost" onClick={() => navigate("/admin/equipment")}>
          <ArrowLeft className="h-4 w-4 mr-2" /> Voltar
        </Button>
        <h1 className="text-3xl font-bold">
          {isEditing ? "Editar Equipamento" : "Novo Equipamento"}
        </h1>
      </div>
      
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
              
              <div className="space-y-2">
                <Label htmlFor="price_per_hour">Preço por Hora</Label>
                <Input
                  id="price_per_hour"
                  name="price_per_hour"
                  type="number"
                  step="0.01"
                  min="0"
                  value={equipment.price_per_hour || 0}
                  onChange={handleChange}
                  required
                />
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="minimum_interval_minutes">Intervalo Mínimo (minutos)</Label>
                <Input
                  id="minimum_interval_minutes"
                  name="minimum_interval_minutes"
                  type="number"
                  min="15"
                  step="15"
                  value={equipment.minimum_interval_minutes || 60}
                  onChange={handleChange}
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="advance_booking_hours">Antecedência Mínima (horas)</Label>
                <Input
                  id="advance_booking_hours"
                  name="advance_booking_hours"
                  type="number"
                  min="1"
                  value={equipment.advance_booking_hours || 24}
                  onChange={handleChange}
                  required
                />
              </div>
            </div>
          </div>

          <div className="space-y-4">
            {/* Fotos existentes */}
            {photos.length > 0 && (
              <div className="space-y-2">
                <Label>Fotos Atuais</Label>
                <div className="grid grid-cols-2 gap-2">
                  {photos.map((photo) => (
                    <div key={photo.id} className="relative">
                      <img
                        src={photo.url}
                        alt="Foto do equipamento"
                        className="w-full h-32 object-cover rounded-lg"
                      />
                      <Button
                        type="button"
                        variant="destructive"
                        size="sm"
                        className="absolute top-1 right-1"
                        onClick={() => handleRemovePhoto(photo.id)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Upload de novas fotos */}
            <div className="space-y-2">
              <Label htmlFor="photos">Adicionar Fotos</Label>
              <Input
                id="photos"
                type="file"
                accept="image/*"
                multiple
                onChange={handleFileChange}
              />
              
              {files.length > 0 && (
                <div className="space-y-2">
                  <Label>Novas fotos selecionadas:</Label>
                  <div className="space-y-1">
                    {files.map((file, index) => (
                      <div key={index} className="flex items-center justify-between bg-secondary p-2 rounded">
                        <span className="text-sm">{file.name}</span>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => handleRemoveFile(index)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Gerenciador de horários */}
        <WeeklyScheduleManager
          schedules={schedules}
          onChange={setSchedules}
        />

        <div className="flex justify-end">
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Salvando..." : (isEditing ? "Atualizar Equipamento" : "Criar Equipamento")}
          </Button>
        </div>
      </form>
    </div>
  );
};

export default EquipmentFormNew;