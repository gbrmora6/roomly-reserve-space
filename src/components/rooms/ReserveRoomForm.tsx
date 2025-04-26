import React, { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { supabase } from "@/integrations/supabase/client";
import { format, addHours, setHours, setMinutes } from "date-fns";

interface ReserveRoomFormProps {
  room: any;
  onClose: () => void;
}

interface RoomSchedule {
  weekday: string;
  start_time: string;
  end_time: string;
}

const ReserveRoomForm: React.FC<ReserveRoomFormProps> = ({ room, onClose }) => {
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [startHour, setStartHour] = useState<string>("");
  const [endHour, setEndHour] = useState<string>("");
  const [availableHours, setAvailableHours] = useState<string[]>([]);
  const [blockedHours, setBlockedHours] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [schedules, setSchedules] = useState<RoomSchedule[]>([]);

  useEffect(() => {
    const fetchSchedulesAndBookings = async () => {
      if (!room?.id) return;

      // Buscar horários disponíveis
      const { data: schedulesData, error: schedulesError } = await supabase
        .from("room_schedules")
        .select("*")
        .eq("room_id", room.id);

      if (schedulesError) {
        console.error("Erro ao buscar horários da sala:", schedulesError);
        return;
      }
      setSchedules(schedulesData || []);

      // Buscar reservas existentes do dia
      if (selectedDate) {
        const { data: bookingsData, error: bookingsError } = await supabase
          .from("bookings")
          .select("start_time, end_time")
          .eq("room_id", room.id)
          .gte("start_time", `${format(selectedDate, "yyyy-MM-dd")}T00:00:00`)
          .lt("start_time", `${format(selectedDate, "yyyy-MM-dd")}T23:59:59`);

        if (bookingsError) {
          console.error("Erro ao buscar reservas:", bookingsError);
          return;
        }

        const blocked: string[] = [];

        bookingsData?.forEach((booking: any) => {
          const start = parseInt(booking.start_time.split("T")[1].split(":")[0]);
          const end = parseInt(booking.end_time.split("T")[1].split(":")[0]);
          for (let i = start; i < end; i++) {
            blocked.push(`${i.toString().padStart(2, "0")}:00`);
          }
        });

        setBlockedHours(blocked);
      }
    };

    fetchSchedulesAndBookings();
  }, [room, selectedDate]);

  useEffect(() => {
    if (!selectedDate || schedules.length === 0) {
      setAvailableHours([]);
      return;
    }

    const weekday = format(selectedDate, "eeee").toLowerCase(); // monday, tuesday, etc.
    const schedule = schedules.find(sch => sch.weekday === weekday);

    if (!schedule) {
      setAvailableHours([]);
      return;
    }

    const startHour = parseInt(schedule.start_time.split(":")[0], 10);
    const endHour = parseInt(schedule.end_time.split(":")[0], 10);

    const hours: string[] = [];
    for (let hour = startHour; hour < endHour; hour++) {
      hours.push(`${hour.toString().padStart(2, "0")}:00`);
    }

    setAvailableHours(hours);
  }, [selectedDate, schedules]);

  const handleReserve = async () => {
    if (!selectedDate || !startHour || !endHour) return;

    setLoading(true);
    const user = (await supabase.auth.getUser()).data.user;

    if (!user) {
      alert("Usuário não autenticado.");
      setLoading(false);
      return;
    }

    const [startH, startM] = startHour.split(":").map(Number);
    const [endH, endM] = endHour.split(":").map(Number);

    const startTime = setMinutes(setHours(selectedDate, startH), startM);
    const endTime = setMinutes(setHours(selectedDate, endH), endM);

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
        <Calendar
          mode="single"
          selected={selectedDate!}
          onSelect={setSelectedDate}
          className="rounded-md border"
        />
      </div>

      {selectedDate && availableHours.length > 0 ? (
        <>
          <h3 className="text-lg mb-2">Selecione o horário de início:</h3>
          <div className="grid grid-cols-3 gap-2 mb-6">
            {availableHours.map((hour) => (
              <Button
                key={hour}
                variant={startHour === hour ? "default" : blockedHours.includes(hour) ? "destructive" : "outline"}
                onClick={() => !blockedHours.includes(hour) && setStartHour(hour)}
                disabled={blockedHours.includes(hour)}
              >
                {hour}
              </Button>
            ))}
          </div>

          {startHour && (
            <>
              <h3 className="text-lg mb-2">Selecione o horário de término:</h3>
              <div className="grid grid-cols-3 gap-2 mb-6">
                {availableHours
                  .filter((hour) => hour > startHour)
                  .map((hour) => (
                    <Button
                      key={hour}
                      variant={endHour === hour ? "default" : blockedHours.includes(hour) ? "destructive" : "outline"}
                      onClick={() => !blockedHours.includes(hour) && setEndHour(hour)}
                      disabled={blockedHours.includes(hour)}
                    >
                      {hour}
                    </Button>
                  ))}
              </div>
            </>
          )}
        </>
      ) : selectedDate ? (
        <p className="text-red-500 text-center mb-6">Nenhum horário disponível para esta sala.</p>
      ) : null}

      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={onClose}>
          Cancelar
        </Button>
        <Button onClick={handleReserve} disabled={!selectedDate || !startHour || !endHour || loading}>
          {loading ? "Reservando..." : "Confirmar Reserva"}
        </Button>
      </div>
    </div>
  );
};

export default ReserveRoomForm;
