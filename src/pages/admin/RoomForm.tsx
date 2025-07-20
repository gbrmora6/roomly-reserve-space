import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "@/hooks/use-toast";
import { ArrowLeft, Upload, X } from "lucide-react";
import { v4 as uuidv4 } from "uuid";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { useAuth } from "@/contexts/AuthContext";
import { WeekdaySelector } from "@/components/shared/WeekdaySelector";
import { useAdminCRUDLogger } from "@/hooks/useAdminCRUDLogger";
import React, { useState } from "react";

interface Room {
  id: string;
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

const WEEKDAYS = [
  'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado', 'domingo'
] as const;

const WEEKDAYS_MAP: Record<string, 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday'> = {
  'segunda': 'monday',
  'terça': 'tuesday',
  'quarta': 'wednesday',
  'quinta': 'thursday',
  'sexta': 'friday',
  'sábado': 'saturday',
  'domingo': 'sunday'
};

const WEEKDAYS_MAP_REVERSE: Record<'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday', string> = {
  'monday': 'segunda',
  'tuesday': 'terça',
  'wednesday': 'quarta',
  'thursday': 'quinta',
  'friday': 'sexta',
  'saturday': 'sábado',
  'sunday': 'domingo'
};

const RoomForm: React.FC = () => {
  const { id } = useParams<{ id: string }>();
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
  
  const { data: roomData } = useQuery({
    queryKey: ["room", id],
    enabled: isEditing,
    queryFn: async () => {
      console.log("=== CARREGANDO DADOS DA SALA PARA EDIÇÃO ===");
      console.log("ID da sala:", id);
      
      const { data: roomInfo, error: roomError } = await supabase
        .from("rooms")
        .select("*")
        .eq("id", id)
        .single();
      
      console.log("Dados da sala carregados:", { roomInfo, roomError });
      
      const { data: photoData } = await supabase
        .from("room_photos")
        .select("*")
        .eq("room_id", id);
      
      console.log("Fotos carregadas:", photoData);
      
      const { data: scheduleData } = await supabase
        .from("room_schedules")
        .select("*")
        .eq("room_id", id);
      
      console.log("Horários carregados:", scheduleData);
      
      setRoom(roomInfo || {});
      setPhotos(photoData || []);
      
      // Traduzir os dias da semana ao carregar os horários
      if (scheduleData) {
        setSchedules(scheduleData);
      }
      
      console.log("Estado atualizado - room:", roomInfo);
      console.log("Estado atualizado - photos:", photoData);
      console.log("Estado atualizado - schedules:", scheduleData);
      
      return { room: roomInfo, photos: photoData, schedules: scheduleData };
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
    field: keyof RoomSchedule, 
    value: string
  ) => {
    const newSchedules = [...schedules];
    
    if (field === 'weekday') {
      // Converte o dia da semana em português para inglês (para o banco de dados)
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
    // Converter strings do WeekdaySelector para números
    // WeekdaySelector retorna: ['monday', 'tuesday', ...]
    // Rooms precisa de números: [1, 2, ...] onde 0=domingo, 1=segunda, etc.
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
    // Converter números para strings para o WeekdaySelector
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
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    console.log("=== INÍCIO DO SUBMIT DA SALA ===");
    console.log("Modo de edição:", isEditing);
    console.log("ID da sala:", id);
    console.log("Dados da sala:", room);
    console.log("Usuário:", user);
    console.log("Branch ID:", user?.user_metadata?.branch_id);
    console.log("Horários:", schedules);
    console.log("Arquivos:", files);

    try {
      if (!room.name) {
        console.error("Nome da sala é obrigatório");
        throw new Error("O nome da sala é obrigatório");
      }
      // Verifica sessão e branch_id
      const branchId = user?.user_metadata?.branch_id;
      if (!user || !branchId) {
        console.error("Usuário ou branch_id inválido:", { user, branchId });
        throw new Error("Sessão expirada ou usuário sem filial associada. Faça login novamente.");
      }
      let roomId = id;
      let errorRoom;
      if (!isEditing) {
        console.log("=== CRIANDO NOVA SALA ===");
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
        console.log("Resultado da criação:", { data, error });
        errorRoom = error;
        roomId = data?.id;

        // Log da criação
        if (!error && roomId) {
          await logCreate('room', roomId, {
            name: room.name,
            description: room.description,
            has_wifi: room.has_wifi,
            has_ac: room.has_ac,
            has_chairs: room.has_chairs,
            has_tables: room.has_tables,
            price_per_hour: room.price_per_hour,
            branch_id: branchId,
          });
        }
      } else {
        console.log("=== EDITANDO SALA EXISTENTE ===");
        console.log("Dados para atualização:", {
          name: room.name,
          description: room.description,
          has_wifi: room.has_wifi,
          has_ac: room.has_ac,
          has_chairs: room.has_chairs,
          has_tables: room.has_tables,
          price_per_hour: room.price_per_hour,
        });
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
        console.log("Resultado da edição:", { error });
        errorRoom = error;

        // Log da atualização
        if (!error) {
          await logUpdate('room', id, {
            name: room.name,
            description: room.description,
            has_wifi: room.has_wifi,
            has_ac: room.has_ac,
            has_chairs: room.has_chairs,
            has_tables: room.has_tables,
            price_per_hour: room.price_per_hour,
          });
        }
      }
      if (errorRoom || !roomId) {
        console.error("Erro ao criar/atualizar sala:", { errorRoom, roomId });
        throw new Error(errorRoom?.message || "Erro desconhecido ao criar/atualizar sala");
      }

      console.log("=== GERENCIANDO HORÁRIOS ===");
      // Gerenciar schedules
      if (isEditing) {
        console.log("Removendo horários antigos para sala:", roomId);
        // Ao editar, primeiro remove os schedules antigos
        const { error: deleteSchedulesError } = await supabase
          .from("room_schedules")
          .delete()
          .eq("room_id", roomId);

        console.log("Resultado da remoção de horários:", { deleteSchedulesError });
        if (deleteSchedulesError) {
          console.error("Erro ao remover horários antigos:", deleteSchedulesError);
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

        console.log("Inserindo novos horários:", schedulesToInsert);
        const { error: errorInsertSchedules } = await supabase
          .from("room_schedules")
          .insert(schedulesToInsert);

        console.log("Resultado da inserção de horários:", { errorInsertSchedules });
        if (errorInsertSchedules) {
          console.error("Erro ao inserir horários:", errorInsertSchedules);
          throw new Error(errorInsertSchedules.message || "Erro ao inserir horários");
        }
      } else {
        console.log("Nenhum horário para inserir");
      }

      console.log("=== GERENCIANDO FOTOS ===");
      if (files.length > 0) {
        console.log("Fazendo upload de", files.length, "arquivos");
        for (const file of files) {
          console.log("Processando arquivo:", file.name);
          const fileExt = file.name.split(".").pop();
          const fileName = `${uuidv4()}.${fileExt}`;
          const filePath = `${roomId}/${fileName}`;

          console.log("Fazendo upload para:", filePath);
          const { error: uploadError } = await supabase
            .storage
            .from("room-photos")
            .upload(filePath, file);

          console.log("Resultado do upload:", { uploadError });
          if (uploadError) {
            console.error("Erro no upload:", uploadError);
            throw new Error(uploadError.message || "Erro ao fazer upload da imagem");
          }

          const { data: publicURLData } = supabase
            .storage
            .from("room-photos")
            .getPublicUrl(filePath);

          console.log("URL pública gerada:", publicURLData.publicUrl);
          const { error: photoInsertError } = await supabase
            .from("room_photos")
            .insert({
              room_id: roomId,
              url: publicURLData.publicUrl,
              branch_id: branchId,
            });

          console.log("Resultado da inserção da foto:", { photoInsertError });
          if (photoInsertError) {
            console.error("Erro ao salvar foto:", photoInsertError);
            throw new Error(photoInsertError.message || "Erro ao salvar imagem da sala");
          }
        }
      } else {
        console.log("Nenhum arquivo para upload");
      }

      console.log("=== SUCESSO ===");
      toast({
        title: isEditing ? "Sala atualizada com sucesso" : "Sala criada com sucesso",
      });

      console.log("Navegando para /admin/rooms");
      navigate("/admin/rooms");

    } catch (error: any) {
      console.error("=== ERRO NO SUBMIT ===", error);
      console.error("Stack trace:", error.stack);
      toast({
        variant: "destructive",
        title: isEditing ? "Erro ao atualizar sala" : "Erro ao criar sala",
        description: error.message || "Erro inesperado",
      });
    } finally {
      console.log("=== FIM DO SUBMIT ===");
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
                <Label htmlFor="open_time">Horário de Abertura</Label>
                <Input
                  id="open_time"
                  name="open_time"
                  type="time"
                  value={room.open_time?.substring(0, 5) || "08:00"}
                  onChange={handleChange}
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="close_time">Horário de Fechamento</Label>
                <Input
                  id="close_time"
                  name="close_time"
                  type="time"
                  value={room.close_time?.substring(0, 5) || "18:00"}
                  onChange={handleChange}
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Dias de Funcionamento</Label>
              <WeekdaySelector 
                selectedDays={getRoomOpenDaysAsStrings()} 
                onChange={handleOpenDaysChange}
              />
            </div>
          </div>
          
          <div className="space-y-4">
            <div>
              <Label>Fotos da Sala</Label>
              
              {photos.length > 0 && (
                <div className="grid grid-cols-2 gap-4 mt-2 mb-4">
                  {photos.map((photo) => (
                    <div key={photo.id} className="relative group">
                      <img 
                        src={photo.url} 
                        alt="Foto da sala" 
                        className="w-full h-32 object-cover rounded-md"
                      />
                      <Button
                        variant="destructive"
                        size="icon"
                        className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={() => handleRemovePhoto(photo.id)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
              
              {files.length > 0 && (
                <div className="grid grid-cols-2 gap-4 mt-2 mb-4">
                  {files.map((file, index) => (
                    <div key={index} className="relative group">
                      <img 
                        src={URL.createObjectURL(file)} 
                        alt={`Pré-visualização ${index}`} 
                        className="w-full h-32 object-cover rounded-md"
                      />
                      <Button
                        variant="destructive"
                        size="icon"
                        className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={() => handleRemoveFile(index)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
              
              <div className="mt-2">
                <Label htmlFor="photos" className="cursor-pointer">
                  <div className="border-2 border-dashed border-gray-300 rounded-md p-6 flex flex-col items-center justify-center">
                    <Upload className="h-8 w-8 text-gray-400" />
                    <p className="mt-2 text-sm text-gray-500">
                      Clique para selecionar ou arraste as fotos aqui
                    </p>
                    <p className="text-xs text-gray-400 mt-1">
                      PNG, JPG, GIF até 10MB
                    </p>
                  </div>
                  <Input
                    id="photos"
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handleFileChange}
                    className="hidden"
                  />
                </Label>
              </div>
            </div>
          </div>
        </div>
        
        <div className="space-y-4">
          <h2 className="text-xl font-bold">Horários de Disponibilidade</h2>
          {schedules.map((schedule, index) => (
            <div key={index} className="grid grid-cols-4 gap-4 items-center">
              <Select 
                value={WEEKDAYS_MAP_REVERSE[schedule.weekday] || 'segunda'}
                onValueChange={(value) => 
                  handleScheduleChange(index, 'weekday', value)
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Dia da semana" />
                </SelectTrigger>
                <SelectContent>
                  {WEEKDAYS.map(day => (
                    <SelectItem key={day} value={day}>
                      {day.charAt(0).toUpperCase() + day.slice(1)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              <Input 
                type="time" 
                value={schedule.start_time}
                onChange={(e) => 
                  handleScheduleChange(index, 'start_time', e.target.value)
                }
                placeholder="Início" 
              />
              
              <Input 
                type="time" 
                value={schedule.end_time}
                onChange={(e) => 
                  handleScheduleChange(index, 'end_time', e.target.value)
                }
                placeholder="Término" 
              />
              
              <Button 
                type="button" 
                variant="destructive" 
                onClick={() => handleRemoveSchedule(index)}
              >
                Remover
              </Button>
            </div>
          ))}
          
          <Button 
            type="button" 
            variant="secondary" 
            onClick={handleAddSchedule}
          >
            Adicionar Horário
          </Button>
        </div>
        
        <div className="flex justify-end">
          <Button 
            type="submit" 
            disabled={isSubmitting}
          >
            {isSubmitting ? "Salvando..." : isEditing ? "Atualizar Sala" : "Criar Sala"}
          </Button>
        </div>
      </form>
    </div>
  );
};

export default RoomForm;
