
import React, { useState, useRef, useEffect } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Room } from "@/types/room";
import { Calendar } from "@/components/ui/calendar";
import { TimeSelector } from "@/components/shared/TimeSelector";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useRoomAvailability } from "@/hooks/useRoomAvailability";
import { useRoomReservation } from "@/hooks/useRoomReservation";
import { useRoomSchedule } from "@/hooks/useRoomSchedule";
import { toast } from "@/hooks/use-toast";
import { Separator } from "@/components/ui/separator";
import { formatCurrency } from "@/utils/formatCurrency";

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
  const { availableHours, availableEndTimes, blockedHours, isLoading } = useRoomAvailability(room, selectedDate);
  const { handleReserve, loading } = useRoomReservation(room, onClose);
  const roomSchedules = useRoomSchedule(room.id);
  
  // Refs for auto-scroll
  const startTimeRef = useRef<HTMLDivElement>(null);
  const endTimeRef = useRef<HTMLDivElement>(null);

  // Calculate total price
  const totalPrice = React.useMemo(() => {
    if (selectedStartTime && selectedEndTime && room.price_per_hour) {
      const startMinutes = convertTimeToMinutes(selectedStartTime);
      const endMinutes = convertTimeToMinutes(selectedEndTime);
      const durationHours = (endMinutes - startMinutes) / 60;
      return durationHours > 0 ? room.price_per_hour * durationHours : 0;
    }
    return 0;
  }, [selectedStartTime, selectedEndTime, room.price_per_hour]);

  // Auto-scroll to time selection after date is selected
  useEffect(() => {
    if (selectedDate && startTimeRef.current) {
      setTimeout(() => {
        startTimeRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 100);
    }
  }, [selectedDate]);

  // Auto-scroll to end time selection after start time is selected
  useEffect(() => {
    if (selectedStartTime && endTimeRef.current) {
      setTimeout(() => {
        endTimeRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 100);
    }
  }, [selectedStartTime]);

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
    <Card className="w-full max-w-md mx-auto shadow-lg border-0">
      <CardHeader className="pb-4">
        <CardTitle className="text-lg font-semibold text-center">
          Reservar Sala
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <ScrollArea className="h-[500px] px-6">
          <div className="space-y-6 pb-6">
            {/* Informações da Sala */}
            <Card className="bg-muted/50">
              <CardContent className="p-4">
                <h3 className="font-semibold text-lg mb-2">{room.name}</h3>
                {room.description && (
                  <p className="text-sm text-muted-foreground mb-2">{room.description}</p>
                )}
                <div className="text-sm">
                  <span className="font-medium">Preço por hora: </span>
                  <span className="text-primary font-semibold">
                    {formatCurrency(room.price_per_hour || 0)}
                  </span>
                </div>
              </CardContent>
            </Card>

            {/* Seleção de Data */}
            <div>
              <h3 className="font-medium mb-3">Selecione a data</h3>
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={(date) => {
                  setSelectedDate(date);
                  setSelectedStartTime(null);
                  setSelectedEndTime(null);
                }}
                locale={ptBR}
                className="border rounded-md p-2 w-full"
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

            {/* Seleção de Horário */}
            {selectedDate && !isLoading && (
              <div ref={startTimeRef} className="space-y-3">
                <Separator />
                <div>
                  <h3 className="font-medium mb-3">Selecione o horário</h3>
                  <TimeSelector
                    availableHours={availableHours}
                    availableEndTimes={availableEndTimes}
                    blockedHours={blockedHours}
                    selectedStartTime={selectedStartTime}
                    selectedEndTime={selectedEndTime}
                    onSelectStartTime={setSelectedStartTime}
                    onSelectEndTime={setSelectedEndTime}
                    minimumIntervalMinutes={room.minimum_interval_minutes || 60}
                  />
                </div>
              </div>
            )}

            {/* Resumo da Reserva */}
            {selectedStartTime && selectedEndTime && (
              <div ref={endTimeRef} className="space-y-4">
                <Separator />
                <Card className="bg-primary/5 border-primary/20">
                  <CardContent className="p-4">
                    <h3 className="font-semibold mb-3">Resumo da reserva</h3>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span>Sala:</span>
                        <span className="font-medium">{room.name}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Data:</span>
                        <span className="font-medium">
                          {selectedDate &&
                            format(selectedDate, "dd 'de' MMMM 'de' yyyy", {
                              locale: ptBR,
                            })}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>Horário:</span>
                        <span className="font-medium">
                          {`${selectedStartTime} - ${selectedEndTime}`}
                        </span>
                      </div>
                      <Separator className="my-2" />
                      <div className="flex justify-between items-center text-lg font-semibold text-primary">
                        <span>Total:</span>
                        <span>{formatCurrency(totalPrice)}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}
          </div>
        </ScrollArea>

        {/* Botões de Ação */}
        {selectedStartTime && selectedEndTime && (
          <div className="px-6 py-4 border-t bg-background">
            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={onClose}
                disabled={loading}
                className="flex-1"
              >
                Cancelar
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={loading}
                className="flex-1 bg-primary hover:bg-primary/90"
              >
                {loading ? "Adicionando..." : "Adicionar ao Carrinho"}
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default ReserveRoomForm;
