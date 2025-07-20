import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { v4 as uuidv4 } from "uuid";
import { useAuth } from "@/contexts/AuthContext";
import { useAdminCRUDLogger } from "@/hooks/useAdminCRUDLogger";

interface Room {
  id?: string;
  name: string;
  description: string | null;
  has_wifi: boolean | null;
  has_ac: boolean | null;
  has_chairs: boolean | null;
  has_tables: boolean | null;
  price_per_hour: number;
  open_time: string | null;
  close_time: string | null;
  open_days: number[] | null;
}

interface RoomPhoto {
  id: string;
  room_id: string;
  url: string;
}

interface RoomSchedule {
  weekday: 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday';
  start_time: string;
  end_time: string;
}

const WEEKDAYS_MAP: Record<string, 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday'> = {
  'segunda': 'monday',
  'terça': 'tuesday',
  'quarta': 'wednesday',
  'quinta': 'thursday',
  'sexta': 'friday',
  'sábado': 'saturday',
  'domingo': 'sunday'
};

export const useRoomForm = (id?: string) => {
  const navigate = useNavigate();
  const isEditing = !!id;
  const { user } = useAuth();
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
  
  const [photos, setPhotos] = useState<RoomPhoto[]>([]);
  const [files, setFiles] = useState<File[]>([]);
  const [schedules, setSchedules] = useState<RoomSchedule[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

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

  const handleOpenDaysChange = (days: string[]) => {
    const dayToNumber: Record<string, number> = {
      'sunday': 0,
      'monday': 1,
      'tuesday': 2,
      'wednesday': 3,
      'thursday': 4,
      'friday': 5,
      'saturday': 6
    };
    
    const numberDays = days.map(day => dayToNumber[day]).filter(num => num !== undefined);
    setRoom((prev) => ({ ...prev, open_days: numberDays }));
  };

  const getRoomOpenDaysAsStrings = (): string[] => {
    const numberToDay: Record<number, string> = {
      0: 'sunday',
      1: 'monday',
      2: 'tuesday',
      3: 'wednesday',
      4: 'thursday',
      5: 'friday',
      6: 'saturday'
    };
    
    return (room.open_days || []).map(num => numberToDay[num]).filter(Boolean);
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
    field: keyof RoomSchedule, 
    value: string
  ) => {
    const newSchedules = [...schedules];
    
    if (field === 'weekday') {
      newSchedules[index] = {
        ...newSchedules[index],
        [field]: WEEKDAYS_MAP[value] as RoomSchedule['weekday']
      };
    } else {
      newSchedules[index] = {
        ...newSchedules[index],
        [field]: value
      };
    }
    
    setSchedules(newSchedules);
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
          // await logUpdate('room', id, 'Sala atualizada');
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

  return {
    room,
    photos,
    files,
    schedules,
    isSubmitting,
    isEditing,
    setRoom,
    setPhotos,
    setSchedules,
    handleChange,
    handleCheckboxChange,
    handleOpenDaysChange,
    getRoomOpenDaysAsStrings,
    handleFileChange,
    handleRemoveFile,
    handleRemovePhoto,
    handleAddSchedule,
    handleRemoveSchedule,
    handleScheduleChange,
    handleSubmit,
  };
};