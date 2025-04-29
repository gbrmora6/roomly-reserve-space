
import React, { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { format, setHours, setMinutes } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Room } from "@/types/room";
import { TimeSelector } from "./TimeSelector";
import { useRoomSchedule } from "@/hooks/useRoomSchedule";
import { useRoomAvailability } from "@/hooks/useRoomAvailability";
import { useRoomReservation } from "@/hooks/useRoomReservation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dialog, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";

interface ReserveRoomFormProps {
  room: Room;
  onClose: () => void;
}

const ReserveRoomForm: React.FC<ReserveRoomFormProps> = ({ room, onClose }) => {
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [startHour, setStartHour] = useState<string>("");
  const [endHour, setEndHour] = useState<string>("");
  const startHourRef = useRef<HTMLDivElement>(null);
  const endHourRef = useRef<HTMLDivElement>(null);

  const schedules = useRoomSchedule(room.id);
  const { availableHours, blockedHours } = useRoomAvailability(room, selectedDate);
  const { handleReserve, loading } = useRoomReservation(room, onClose);

  const handleConfirmReservation = async () => {
    if (!selectedDate || !startHour || !endHour) return;

    let startTime = setMinutes(setHours(selectedDate, parseInt(startHour)), 0);
    let endTime = setMinutes(setHours(selectedDate, parseInt(endHour)), 0);

    const result = await handleReserve(startTime, endTime);
    if (result?.id) {
      toast.success("Reserva realizada com sucesso!");
      onClose();
    }
  };

  const isDateDisabled = (date: Date) => {
    const weekday = format(date, "eeee", { locale: ptBR }).toLowerCase();
    const weekdayEnglish = {
      'segunda-feira': 'monday',
      'terça-feira': 'tuesday',
      'quarta-feira': 'wednesday',
      'quinta-feira': 'thursday',
      'sexta-feira': 'friday',
      'sábado': 'saturday',
      'domingo': 'sunday'
    }[weekday] || weekday;
    
    return !schedules.some((sch) => sch.weekday === weekdayEnglish);
  };

  const handleDateSelect = (date: Date | undefined) => {
    if (date && !isDateDisabled(date)) {
      setSelectedDate(date);
      setStartHour("");
      setEndHour("");
      setTimeout(() => startHourRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
    }
  };

  const handleStartHourSelect = (hour: string) => {
    setStartHour(hour);
    setEndHour("");
    setTimeout(() => endHourRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
  };

  return (
    <Card className="w-full max-w-xl mx-auto">
      <CardHeader className="sticky top-0 z-10 bg-card border-b">
        <CardTitle className="text-2xl font-bold text-primary">
          Reservar {room.name}
        </CardTitle>
      </CardHeader>
      <ScrollArea className="h-[80vh] overflow-auto">
        <CardContent className="space-y-6 p-6">
          <div className="bg-card rounded-lg p-4 shadow-sm">
            <h3 className="text-lg font-medium mb-3">Selecione uma data</h3>
            <Calendar
              mode="single"
              selected={selectedDate!}
              onSelect={handleDateSelect}
              className="rounded-md border pointer-events-auto mx-auto"
              disabled={isDateDisabled}
              locale={ptBR}
            />
          </div>

          {selectedDate && availableHours.length > 0 && (
            <div className="space-y-4">
              <div ref={startHourRef} className="bg-card rounded-lg p-4 shadow-sm">
                <h3 className="text-lg font-medium mb-3">Horário de início</h3>
                <TimeSelector
                  hours={availableHours}
                  blockedHours={blockedHours}
                  selectedHour={startHour}
                  onSelectHour={handleStartHourSelect}
                />
              </div>

              {startHour && (
                <div ref={endHourRef} className="bg-card rounded-lg p-4 shadow-sm">
                  <h3 className="text-lg font-medium mb-3">Horário de término</h3>
                  <TimeSelector
                    hours={availableHours}
                    blockedHours={blockedHours}
                    selectedHour={endHour}
                    onSelectHour={setEndHour}
                    isEndTime
                    startHour={startHour}
                  />
                </div>
              )}
            </div>
          )}

          {selectedDate && availableHours.length === 0 && (
            <div className="text-center py-6">
              <p className="text-red-500 font-medium">
                Nenhum horário disponível para esta sala.
              </p>
            </div>
          )}

          <DialogFooter className="flex justify-end gap-3 pt-4 border-t">
            <Button
              variant="outline"
              onClick={onClose}
              className="w-32"
            >
              Cancelar
            </Button>
            {endHour && (
              <Button
                onClick={handleConfirmReservation}
                disabled={!selectedDate || !startHour || !endHour || loading}
                className="w-32"
              >
                {loading ? "Reservando..." : "Confirmar"}
              </Button>
            )}
          </DialogFooter>
        </CardContent>
      </ScrollArea>
    </Card>
  );
};

export default ReserveRoomForm;
