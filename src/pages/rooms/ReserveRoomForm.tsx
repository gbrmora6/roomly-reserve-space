import React, { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { supabase } from "@/integrations/supabase/client";
import { format, addHours, setHours, setMinutes } from "date-fns";

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
    if (!room) return;

    const openHour = parseInt(room.open_time.split(":")[0], 10);
    const closeHour = parseInt(room.close_time.split(":")[0], 10);

    const hours = [];
    for (let hour = openHour; hour < closeHour; hour++) {
      hours.push(`${hour.toString().padStart(2, "0")}:00`);
    }

    setAvailableHours(hours);
  }, [room]);

  const handleReserve = async () => {
    if (!selectedDate || !selectedHour) return;

    setLoading(true);
    const user = (await supabase.auth.getUser()).data.user;

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
      <h2 className="text-xl font-semibold mb-4">Reservar {room.name}</h2>

      <div className="mb-6">
        <Calendar mode="single" selected={selectedDate!} onSelect={setSelectedDate} className="rounded-md border" />
      </div>

      {selectedDate && (
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

      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={onClose}>
          Cancelar
        </Button>
        <Button onClick={handleReserve} disabled={!selectedDate || !selectedHour || loading}>
          {loading ? "Reservando..." : "Confirmar Reserva"}
        </Button>
      </div>
    </div>
  );
};

export default ReserveRoomForm;
