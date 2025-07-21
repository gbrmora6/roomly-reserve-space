
import React, { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useAdminCRUDLogger } from "@/hooks/useAdminCRUDLogger";
import { WeeklyScheduleForm, WeeklyScheduleItem } from "@/components/admin/shared/WeeklyScheduleForm";
import { PhotoManager } from "@/components/admin/shared/PhotoManager";
import { v4 as uuidv4 } from "uuid";

interface Room {
  id: string;
  name: string;
  description: string | null;
  has_wifi: boolean | null;
  has_ac: boolean | null;
  has_chairs: boolean | null;
  has_tables: boolean | null;
  price_per_hour: number;
}

interface RoomPhoto {
  id: string;
  url: string;
}

const AdminRoomForm: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isEditing = !!id;
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();
  const { logCreate, logUpdate } = useAdminCRUDLogger();
  
  const [room, setRoom] = useState<Partial<Room>>({
    name: "",
    description: "",
    has_wifi: false,
    has_ac: false,
    has_chairs: false,
    has_tables: false,
    price_per_hour: 0,
  });
  
  const [schedules, setSchedules] = useState<WeeklyScheduleItem[]>([]);
  const [photos, setPhotos] = useState<RoomPhoto[]>([]);
  const [files, setFiles] = useState<File[]>([]);
  
  const { data: roomData } = useQuery({
    queryKey: ["room", id],
    enabled: isEditing,
    queryFn: async () => {
      const { data: roomInfo, error: roomError } = await supabase
        .from("rooms")
        .select("*")
        .eq("id", id)
        .single();
      
      if (roomError) throw roomError;
      
      const { data: scheduleData } = await supabase
        .from("room_schedules")
        .select("*")
        .eq("room_id", id);
      
      const { data: photoData } = await supabase
        .from("room_photos")
        .select("*")
        .eq("room_id", id);
      
      setRoom(roomInfo || {});
      
      if (scheduleData) {
        setSchedules(scheduleData.map(s => ({
          weekday: s.weekday,
          start_time: s.start_time,
          end_time: s.end_time
        })));
      }
      
      if (photoData) {
        setPhotos(photoData.map(p => ({
          id: p.id,
          url: p.url
        })));
      }
      
      return { room: roomInfo, schedules: scheduleData, photos: photoData };
    },
  });
  
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setRoom((prev) => ({ 
      ...prev, 
      [name]: name === 'price_per_hour' ? Number(value) : value 
    }));
  };
  
  const handleCheckboxChange = (name: string, checked: boolean) => {
    setRoom((prev) => ({ ...prev, [name]: checked }));
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
      .from("room_photos")
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
      if (!room.name) {
        throw new Error("O nome da sala é obrigatório");
      }
      
      const branchId = user?.user_metadata?.branch_id;
      if (!user || !branchId) {
        throw new Error("Sessão expirada ou usuário sem filial associada. Faça login novamente.");
      }
      
      let roomId = id;
      let errorRoom;
      
      if (!isEditing) {
        // Criação: insert
        const { data, error } = await supabase
          .from("rooms")
          .insert({
            name: room.name,
            description: room.description,
            has_wifi: room.has_wifi,
            has_ac: room.has_ac,
            has_chairs: room.has_chairs,
            has_tables: room.has_tables,
            price_per_hour: room.price_per_hour,
            branch_id: branchId,
            is_active: true,
          })
          .select("id")
          .single();
        
        errorRoom = error;
        roomId = data?.id;

        // Log da criação
        if (!error && roomId) {
          await logCreate('room', roomId, 'Sala criada');
        }
      } else {
        // Edição: update
        const { error } = await supabase
          .from("rooms")
          .update({
            name: room.name,
            description: room.description,
            has_wifi: room.has_wifi,
            has_ac: room.has_ac,
            has_chairs: room.has_chairs,
            has_tables: room.has_tables,
            price_per_hour: room.price_per_hour,
          })
          .eq("id", id);
        
        errorRoom = error;

        // Log da atualização
        if (!error) {
          await logUpdate('room', id, 'Sala atualizada');
        }
      }
      
      if (errorRoom || !roomId) {
        throw new Error(errorRoom?.message || "Erro desconhecido ao criar/atualizar sala");
      }

      // Gerenciar schedules
      if (isEditing) {
        // Ao editar, primeiro remove os schedules antigos
        const { error: deleteSchedulesError } = await supabase
          .from("room_schedules")
          .delete()
          .eq("room_id", roomId);

        if (deleteSchedulesError) {
          throw new Error(deleteSchedulesError.message || "Erro ao remover horários antigos");
        }
      }

      // Inserir novos schedules (tanto para criação quanto edição)
      if (schedules.length > 0) {
        const schedulesToInsert = schedules.map(schedule => ({
          room_id: roomId,
          weekday: schedule.weekday,
          start_time: schedule.start_time,
          end_time: schedule.end_time,
          branch_id: branchId,
        }));

        const { error: errorInsertSchedules } = await supabase
          .from("room_schedules")
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
          const filePath = `${roomId}/${fileName}`;

          const { error: uploadError } = await supabase
            .storage
            .from("room-photos")
            .upload(filePath, file);

          if (uploadError) {
            throw new Error(uploadError.message || "Erro ao fazer upload da imagem");
          }

          const { data: publicURLData } = supabase
            .storage
            .from("room-photos")
            .getPublicUrl(filePath);

          const { error: photoInsertError } = await supabase
            .from("room_photos")
            .insert({
              room_id: roomId,
              url: publicURLData.publicUrl,
              branch_id: branchId,
            });

          if (photoInsertError) {
            throw new Error(photoInsertError.message || "Erro ao salvar imagem da sala");
          }
        }
      }

      toast({
        title: isEditing ? "Sala atualizada com sucesso" : "Sala criada com sucesso",
      });

      navigate("/admin/rooms");

    } catch (error: any) {
      toast({
        variant: "destructive",
        title: isEditing ? "Erro ao atualizar sala" : "Erro ao criar sala",
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
            onClick={() => navigate("/admin/rooms")}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Voltar
          </Button>
          <h1 className="text-2xl font-bold">
            {isEditing ? "Editar Sala" : "Criar Sala"}
          </h1>
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Informações Básicas</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="name">Nome da Sala *</Label>
                <Input
                  id="name"
                  name="name"
                  value={room.name || ''}
                  onChange={handleChange}
                  placeholder="Digite o nome da sala"
                  required
                />
              </div>
              
              <div>
                <Label htmlFor="description">Descrição</Label>
                <Textarea
                  id="description"
                  name="description"
                  value={room.description || ''}
                  onChange={handleChange}
                  placeholder="Descreva a sala"
                  rows={3}
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
                  value={room.price_per_hour || 0}
                  onChange={handleChange}
                  required
                />
              </div>
              
              <div className="space-y-4">
                <Label>Características da Sala</Label>
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="has_wifi"
                      checked={!!room.has_wifi}
                      onCheckedChange={(checked) => 
                        handleCheckboxChange("has_wifi", !!checked)
                      }
                    />
                    <Label htmlFor="has_wifi">Possui Wi-Fi</Label>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="has_ac"
                      checked={!!room.has_ac}
                      onCheckedChange={(checked) => 
                        handleCheckboxChange("has_ac", !!checked)
                      }
                    />
                    <Label htmlFor="has_ac">Possui Ar-Condicionado</Label>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="has_chairs"
                      checked={!!room.has_chairs}
                      onCheckedChange={(checked) => 
                        handleCheckboxChange("has_chairs", !!checked)
                      }
                    />
                    <Label htmlFor="has_chairs">Possui Cadeiras</Label>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="has_tables"
                      checked={!!room.has_tables}
                      onCheckedChange={(checked) => 
                        handleCheckboxChange("has_tables", !!checked)
                      }
                    />
                    <Label htmlFor="has_tables">Possui Mesas</Label>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <WeeklyScheduleForm
            schedules={schedules}
            onChange={setSchedules}
            title="Horários de Funcionamento"
          />
          
          <PhotoManager
            photos={photos}
            files={files}
            onFileChange={handleFileChange}
            onRemoveFile={handleRemoveFile}
            onRemovePhoto={handleRemovePhoto}
            title="Fotos da Sala"
          />
          
          <div className="flex justify-end gap-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate("/admin/rooms")}
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

export default AdminRoomForm;
