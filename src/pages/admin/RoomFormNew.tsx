import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "@/hooks/use-toast";
import { ArrowLeft, Upload, X } from "lucide-react";
import { v4 as uuidv4 } from "uuid";
import { useAuth } from "@/contexts/AuthContext";
import { WeeklyScheduleManager, WeeklySchedule } from "@/components/shared/WeeklyScheduleManager";
import React, { useState } from "react";

interface Room {
  id: string;
  name: string;
  description: string | null;
  has_wifi: boolean | null;
  has_ac: boolean | null;
  has_chairs: boolean | null;
  has_tables: boolean | null;
  has_tv: boolean | null;
  has_private_bathroom: boolean | null;
  price_per_hour: number;
}

interface RoomPhoto {
  id: string;
  room_id: string;
  url: string;
}

const RoomFormNew: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isEditing = !!id;
  const { user } = useAuth();
  
  const [room, setRoom] = useState({
    name: "",
    description: "",
    has_wifi: false,
    has_ac: false,
    has_chairs: false,
    has_tables: false,
    has_tv: false,
    has_private_bathroom: false,
    price_per_hour: 0,
    minimum_interval_minutes: 60,
    advance_booking_hours: 24,
  });
  
  const [photos, setPhotos] = useState<RoomPhoto[]>([]);
  const [files, setFiles] = useState<File[]>([]);
  const [schedules, setSchedules] = useState<WeeklySchedule[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const { data: roomData } = useQuery({
    queryKey: ["room", id],
    enabled: isEditing,
    queryFn: async () => {
      const { data: roomInfo, error: roomError } = await supabase
        .from("rooms")
        .select("*")
        .eq("id", id)
        .single();
      
      const { data: photoData } = await supabase
        .from("room_photos")
        .select("*")
        .eq("room_id", id);
      
      const { data: scheduleData } = await supabase
        .from("room_schedules")
        .select("*")
        .eq("room_id", id);
      
      setRoom(roomInfo || {});
      setPhotos(photoData || []);
      setSchedules(scheduleData || []);
      
      return { room: roomInfo, photos: photoData, schedules: scheduleData };
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
            has_tv: room.has_tv,
            has_private_bathroom: room.has_private_bathroom,
            price_per_hour: room.price_per_hour,
            minimum_interval_minutes: room.minimum_interval_minutes || 60,
            advance_booking_hours: room.advance_booking_hours || 24,
            branch_id: branchId,
            is_active: true,
          })
          .select("id")
          .single();
        errorRoom = error;
        roomId = data?.id;
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
            has_tv: room.has_tv,
            has_private_bathroom: room.has_private_bathroom,
            price_per_hour: room.price_per_hour,
            minimum_interval_minutes: room.minimum_interval_minutes || 60,
            advance_booking_hours: room.advance_booking_hours || 24,
          })
          .eq("id", id);
        errorRoom = error;
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
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Button variant="ghost" onClick={() => navigate("/admin/rooms")}>
          <ArrowLeft className="h-4 w-4 mr-2" /> Voltar
        </Button>
        <h1 className="text-3xl font-bold">
          {isEditing ? "Editar Sala" : "Nova Sala"}
        </h1>
      </div>
      
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nome da Sala</Label>
              <Input
                id="name"
                name="name"
                value={room.name || ""}
                onChange={handleChange}
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="description">Descrição</Label>
              <Textarea
                id="description"
                name="description"
                value={room.description || ""}
                onChange={handleChange}
                rows={4}
              />
            </div>
            
            <div className="space-y-4">
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

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="has_tv"
                  checked={!!room.has_tv}
                  onCheckedChange={(checked) => 
                    handleCheckboxChange("has_tv", !!checked)
                  }
                />
                <Label htmlFor="has_tv">Possui TV</Label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="has_private_bathroom"
                  checked={!!room.has_private_bathroom}
                  onCheckedChange={(checked) => 
                    handleCheckboxChange("has_private_bathroom", !!checked)
                  }
                />
                <Label htmlFor="has_private_bathroom">Possui Banheiro Privativo</Label>
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="price_per_hour">Preço por Hora</Label>
              <Input
                id="price_per_hour"
                name="price_per_hour"
                type="number"
                step="0.01"
                value={room.price_per_hour || 0}
                onChange={handleChange}
                required
              />
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
                  value={room.minimum_interval_minutes || 60}
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
                  value={room.advance_booking_hours || 24}
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
                        alt="Foto da sala"
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
            {isSubmitting ? "Salvando..." : (isEditing ? "Atualizar Sala" : "Criar Sala")}
          </Button>
        </div>
      </form>
    </div>
  );
};

export default RoomFormNew;