
import React, { useState } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Room } from "@/types/room";
import { Calendar } from "@/components/ui/calendar";
import { TimeSelector } from "@/components/rooms/TimeSelector";
import { Button } from "@/components/ui/button";
import { useRoomAvailability } from "@/hooks/useRoomAvailability";
import { useRoomReservation } from "@/hooks/useRoomReservation";
import { useRoomSchedule } from "@/hooks/useRoomSchedule";
import { toast } from "@/hooks/use-toast";
import { Separator } from "@/components/ui/separator";

interface ReserveRoomFormProps {
  room: Room;
  onClose: () => void;
}

// Função helper para converter horário HH:MM em minutos
const convertTimeToMinutes = (time: string): number => {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
};

const ReserveRoomForm: React.FC<ReserveRoomFormProps> = ({ room, onClose }) => {
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedStartTime, setSelectedStartTime] = useState<string | null>(null);
  const [selectedEndTime, setSelectedEndTime] = useState<string | null>(null);
  const { availableHours, blockedHours, isLoading } = useRoomAvailability(room, selectedDate);
  const { handleReserve, loading } = useRoomReservation(room, onClose);
  const roomSchedules = useRoomSchedule(room.id);

  // Função para verificar se a sala funciona em um determinado dia da semana
  const isRoomOpenOnDay = (date: Date): boolean => {
    const dayOfWeek = date.getDay(); // 0=domingo, 1=segunda, ..., 6=sábado
    
    // Primeiro, verificar se há schedules específicos para este dia
    if (roomSchedules.length > 0) {
      const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
      const dayName = dayNames[dayOfWeek];
      
      // Verificar se existe um schedule para este dia da semana
      const hasScheduleForDay = roomSchedules.some(schedule => 
        schedule.weekday.toLowerCase() === dayName
      );
      
      return hasScheduleForDay;
    }
    
    // Fallback: usar open_days se disponível
    if (room.open_days && room.open_days.length > 0) {
      return room.open_days.includes(dayOfWeek);
    }
    
    // Se não há informações específicas, assumir que funciona de segunda a sexta (1-5)
    return dayOfWeek >= 1 && dayOfWeek <= 5;
  };

  const handleSubmit = async () => {
    if (!selectedDate || !selectedStartTime || !selectedEndTime) {
      toast({
        variant: "destructive",
        title: "Dados incompletos",
        description: "Por favor preencha todos os campos",
      });
      return;
    }

    // Validar horários - converter para minutos para comparação correta
    const startTimeMinutes = convertTimeToMinutes(selectedStartTime);
    const endTimeMinutes = convertTimeToMinutes(selectedEndTime);
    
    if (startTimeMinutes >= endTimeMinutes) {
      toast({
        variant: "destructive",
        title: "Horário inválido",
        description: "O horário de término deve ser posterior ao de início",
      });
      return;
    }

    const startDate = new Date(selectedDate);
    const [startHour, startMinute] = selectedStartTime.split(":");
    startDate.setHours(parseInt(startHour), parseInt(startMinute), 0, 0);

    const endDate = new Date(selectedDate);
    const [endHour, endMinute] = selectedEndTime.split(":");
    endDate.setHours(parseInt(endHour), parseInt(endMinute), 0, 0);

    const booking = await handleReserve(startDate, endDate);

    if (booking) {
      toast({
        title: "Reserva adicionada ao carrinho!",
        description: "Você tem 15 minutos para finalizar o pagamento.",
      });
      onClose();
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="font-medium mb-2">Selecione a data</h3>
        <Calendar
          mode="single"
          selected={selectedDate}
          onSelect={(date) => {
            setSelectedDate(date);
            setSelectedStartTime(null);
            setSelectedEndTime(null);
          }}
          locale={ptBR}
          className="border rounded-md p-2"
          disabled={(date) => {
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            
            // Não permitir datas no passado
            if (date < today) return true;
            
            // Verificar se a sala funciona neste dia da semana
            return !isRoomOpenOnDay(date);
          }}
        />
      </div>

      {isLoading && (
        <div className="text-center py-4">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mx-auto"></div>
          <p className="text-sm text-muted-foreground mt-2">Carregando disponibilidade...</p>
        </div>
      )}

      {selectedDate && !isLoading && (
        <>
          <Separator />
          <div className="flex flex-col space-y-2">
            <h3 className="font-medium">Horário</h3>
            <TimeSelector
              availableHours={availableHours}
              blockedHours={blockedHours}
              selectedStartTime={selectedStartTime}
              selectedEndTime={selectedEndTime}
              onSelectStartTime={setSelectedStartTime}
              onSelectEndTime={setSelectedEndTime}
            />
          </div>

          {selectedStartTime && selectedEndTime && (
            <div className="space-y-3">
              <Separator />
              <div className="pt-2 space-y-4">
                <div>
                  <h3 className="font-medium mb-2">Resumo da reserva</h3>
                  <div className="bg-muted p-3 rounded-md">
                    <p>
                      <strong>Sala:</strong> {room.name}
                    </p>
                    <p>
                      <strong>Data:</strong>{" "}
                      {selectedDate &&
                        format(selectedDate, "dd 'de' MMMM 'de' yyyy", {
                          locale: ptBR,
                        })}
                    </p>
                    <p>
                      <strong>Horário:</strong>{" "}
                      {`${selectedStartTime} - ${selectedEndTime}`}
                    </p>
                  </div>
                </div>

                <div className="flex justify-end space-x-2">
                  <Button
                    variant="outline"
                    onClick={onClose}
                    disabled={loading}
                  >
                    Cancelar
                  </Button>
                  <Button
                    onClick={handleSubmit}
                    disabled={loading}
                    className="bg-roomly-600 hover:bg-roomly-700"
                  >
                    {loading ? "Reservando..." : "Confirmar Reserva"}
                  </Button>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default ReserveRoomForm;
