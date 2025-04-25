
import React, { useState } from "react";
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

interface Room {
  id: string;
  name: string;
  description: string | null;
  has_wifi: boolean | null;
  has_ac: boolean | null;
  has_chairs: boolean | null;
  has_tables: boolean | null;
}

interface RoomPhoto {
  id: string;
  room_id: string;
  url: string;
}

const RoomForm: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isEditing = !!id;
  
  const [room, setRoom] = useState<Partial<Room>>({
    name: "",
    description: "",
    has_wifi: false,
    has_ac: false,
    has_chairs: false,
    has_tables: false,
  });
  
  const [photos, setPhotos] = useState<RoomPhoto[]>([]);
  const [files, setFiles] = useState<File[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Carregar dados da sala se estiver editando
  useQuery({
    queryKey: ["room", id],
    enabled: isEditing,
    queryFn: async () => {
      // Buscar dados da sala
      const { data: roomData, error: roomError } = await supabase
        .from("rooms")
        .select("*")
        .eq("id", id)
        .single();
      
      if (roomError) throw roomError;
      
      // Buscar fotos da sala
      const { data: photoData, error: photoError } = await supabase
        .from("room_photos")
        .select("*")
        .eq("room_id", id);
      
      if (photoError) throw photoError;
      
      setRoom(roomData);
      setPhotos(photoData || []);
      
      return { room: roomData, photos: photoData };
    },
  });
  
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setRoom((prev) => ({ ...prev, [name]: value }));
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
      let roomId = id;
      
      // Verificar se o nome está preenchido
      if (!room.name) {
        throw new Error("O nome da sala é obrigatório");
      }
      
      // Criar/atualizar sala
      if (isEditing) {
        const { error } = await supabase
          .from("rooms")
          .update({
            name: room.name,
            description: room.description,
            has_wifi: room.has_wifi,
            has_ac: room.has_ac,
            has_chairs: room.has_chairs,
            has_tables: room.has_tables
          })
          .eq("id", id);
        
        if (error) throw error;
      } else {
        const { data, error } = await supabase
          .from("rooms")
          .insert({
            name: room.name,
            description: room.description,
            has_wifi: room.has_wifi,
            has_ac: room.has_ac,
            has_chairs: room.has_chairs,
            has_tables: room.has_tables
          })
          .select("id")
          .single();
        
        if (error) throw error;
        roomId = data.id;
      }
      
      // Fazer upload das fotos
      if (files.length > 0) {
        for (const file of files) {
          const fileExt = file.name.split('.').pop();
          const fileName = `${uuidv4()}.${fileExt}`;
          const filePath = `${roomId}/${fileName}`;
          
          // Upload para o storage
          const { error: uploadError } = await supabase
            .storage
            .from('room-photos')
            .upload(filePath, file);
          
          if (uploadError) throw uploadError;
          
          // Obter URL pública
          const { data: publicURL } = supabase
            .storage
            .from('room-photos')
            .getPublicUrl(filePath);
          
          // Salvar referência na tabela room_photos
          const { error: photoError } = await supabase
            .from('room_photos')
            .insert({
              room_id: roomId,
              url: publicURL.publicUrl
            });
          
          if (photoError) throw photoError;
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
        description: error.message,
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
            </div>
          </div>
          
          <div className="space-y-4">
            <div>
              <Label>Fotos da Sala</Label>
              
              {/* Exibir fotos atuais */}
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
              
              {/* Exibir arquivos selecionados */}
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
