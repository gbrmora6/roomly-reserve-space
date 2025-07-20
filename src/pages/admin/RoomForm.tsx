import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { ArrowLeft } from "lucide-react";
import { WeekdaySelector } from "@/components/shared/WeekdaySelector";
import { RoomBasicFields } from "@/components/admin/room/RoomBasicFields";
import { RoomPhotoManager } from "@/components/admin/room/RoomPhotoManager";
import { RoomScheduleManager } from "@/components/admin/room/RoomScheduleManager";
import { useRoomForm } from "@/hooks/useRoomForm";
import React from "react";



const RoomForm: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  
  const {
    formData,
    setFormData,
    photos,
    newPhotos,
    schedules,
    isSubmitting,
    handlePhotoUpload,
    removePhoto,
    removeNewPhoto,
    addSchedule,
    removeSchedule,
    updateSchedule,
    handleSubmit
  } = useRoomForm(id);
  

  


  return (
    <div className="container mx-auto p-6">
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
          {id ? "Editar Sala" : "Nova Sala"}
        </h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <RoomBasicFields
            formData={formData}
            setFormData={setFormData}
          />
          
          <RoomPhotoManager
            photos={photos}
            newPhotos={newPhotos}
            onPhotoUpload={handlePhotoUpload}
            onRemovePhoto={removePhoto}
            onRemoveNewPhoto={removeNewPhoto}
          />
        </div>

        <RoomScheduleManager
          schedules={schedules}
          onAddSchedule={addSchedule}
          onRemoveSchedule={removeSchedule}
          onUpdateSchedule={updateSchedule}
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
            {isSubmitting
              ? "Salvando..."
              : id
              ? "Atualizar Sala"
              : "Criar Sala"}
          </Button>
        </div>
      </form>
    </div>
  );
};

export default RoomForm;
