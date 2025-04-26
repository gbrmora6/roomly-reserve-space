import React, { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { supabase } from "@/integrations/supabase/client";
import { addHours, setHours, setMinutes } from "date-fns";

interface ReserveRoomFormProps {
  room: any;
  onClose: () => void;
}

const ReserveRoomForm: React.FC<ReserveRoomFormProps> = ({ room, onClose }) => {
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedHour, setSelectedHour] = useState<string>("");
  const [availableHours, setAvailableHours] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!room || !room.open_time || !room.close_time) {
      setAvailableHours([]);
      return;
    }

    try {
      const openHour = parseInt(room.open_time.split(":")[0], 10);
      const closeHour = parseInt(room.close_time.split(":")[0], 10);

      const hours: string[] = [];
      for (let hour = openHour; hour < closeHour; hour++) {
        hours.push(`${hour.toString().padStart(2, "0")}:00`);
      }

      setAvailableHours(hours);
    } catch (error) {
      console.error("Erro ao gerar horários:", error);
      setAvailableHours([]);
    }
  }, [room]);

  const handleReserve = async () => {
    if (!selectedDate || !selectedHour) return;

    setLoading(true);
    const { data, error: userError } = await supabase.auth.getUser();
    const user = data?.user;

    if (!user) {
      alert("Usuário não autenticado.");
      setLoading(false);
      return;
    }

    const [hour, minute] = selectedHour.split(":").map(Number);
    const startTime = setMinutes(setHours(selectedDate, hour), minute);
    const endTime = addHours(startTime, 1);

    const { error } = await supabase.from("bookings").insert({
      user_id: user.id,
      room_id: room.id,
      start_time: startTime.toISOString(),
      end_time: endTime.toISOString(),
      status: "pending",
    });

    if (error) {
      console.error(error);
      alert("Erro ao reservar a sala.");
    } else {
      alert("Reserva realizada com sucesso!");
      onClose();
    }

    setLoading(false);
  };

  return (
    <div className="p-4">
      <h2 className="text-xl font-semibold mb-4">Reservar {room?.name ?? "Sala"}</h2>

      <div className="mb-6">
        <Calendar
          mode="single"
          selected={selectedDate || undefined}
          onSelect={setSelectedDate}
          className="rounded-md border"
        />
      </div>

      {selectedDate && availableHours.length > 0 && (
        <div className="mb-6">
          <h3 className="text-lg mb-2">Selecione o horário:</h3>
          <div className="grid grid-cols-3 gap-2">
            {availableHours.map((hour) => (
              <Button
                key={hour}
                variant={selectedHour === hour ? "default" : "outline"}
                onClick={() => setSelectedHour(hour)}
              >
                {hour}
              </Button>
            ))}
          </div>
        </div>
      )}

      {selectedDate && availableHours.length === 0 && (
        <div className="mb-6 text-center text-red-500">
          Nenhum horário disponível para esta sala.
        </div>
      )}

      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={onClose}>
          Cancelar
        </Button>
        <Button
          onClick={handleReserve}
          disabled={!selectedDate || !selectedHour || loading || availableHours.length === 0}
        >
          {loading ? "Reservando..." : "Confirmar Reserva"}
        </Button>
      </div>
    </div>
  );
};

export default ReserveRoomForm;
