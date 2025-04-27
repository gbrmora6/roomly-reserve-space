
import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { format, setHours, setMinutes } from "date-fns";
import { Room } from "@/types/room";
import { TimeSelector } from "./TimeSelector";
import { useRoomSchedule } from "@/hooks/useRoomSchedule";
import { useRoomAvailability } from "@/hooks/useRoomAvailability";
import { useRoomReservation } from "@/hooks/useRoomReservation";

interface ReserveRoomFormProps {
  room: Room;
  onClose: () => void;
}

const ReserveRoomForm: React.FC<ReserveRoomFormProps> = ({ room, onClose }) => {
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [startHour, setStartHour] = useState<string>("");
  const [endHour, setEndHour] = useState<string>("");

  const schedules = useRoomSchedule(room.id);
  const { availableHours, blockedHours } = useRoomAvailability(room, selectedDate);
  const { handleReserve, loading } = useRoomReservation(room, onClose);

  const handleConfirmReservation = async () => {
    if (!selectedDate || !startHour || !endHour) return;

    const start = parseInt(startHour.split(":")[0]);
    const end = parseInt(endHour.split(":")[0]);

    if (end <= start) {
      alert("O horário final deve ser depois do horário inicial.");
      return;
    }

    let startTime = setMinutes(setHours(selectedDate, start), 0);
    let endTime = setMinutes(setHours(selectedDate, end), 0);

    await handleReserve(startTime, endTime);
  };

  const isDateDisabled = (date: Date) => {
    const weekday = format(date, "eeee").toLowerCase();
    return !schedules.some((sch) => sch.weekday === weekday);
  };

  return (
    <div className="p-4">
      <h2 className="text-xl font-semibold mb-4">Reservar {room.name}</h2>

      <div className="mb-6">
        <Calendar
          mode="single"
          selected={selectedDate!}
          onSelect={(date) => {
            if (!isDateDisabled(date!)) {
              setSelectedDate(date);
              setStartHour("");
              setEndHour("");
            }
          }}
          className="rounded-md border"
          disabled={isDateDisabled}
        />
      </div>

      {selectedDate && availableHours.length > 0 && (
        <>
          <h3 className="text-lg mb-2">Selecione o horário de início:</h3>
          <TimeSelector
            hours={availableHours}
            blockedHours={blockedHours}
            selectedHour={startHour}
            onSelectHour={(hour) => {
              setStartHour(hour);
              setEndHour("");
            }}
          />

          {startHour && (
            <>
              <h3 className="text-lg mb-2">Selecione o horário de término:</h3>
              <TimeSelector
                hours={availableHours}
                blockedHours={blockedHours}
                selectedHour={endHour}
                onSelectHour={setEndHour}
                isEndTime
                startHour={startHour}
              />
            </>
          )}
        </>
      )}

      {selectedDate && availableHours.length === 0 && (
        <p className="text-red-500 text-center mb-6">
          Nenhum horário disponível para esta sala.
        </p>
      )}

      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={onClose}>
          Cancelar
        </Button>
        <Button 
          onClick={handleConfirmReservation} 
          disabled={!selectedDate || !startHour || !endHour || loading}
        >
          {loading ? "Reservando..." : "Confirmar Reserva"}
        </Button>
      </div>
    </div>
  );
};

export default ReserveRoomForm;
