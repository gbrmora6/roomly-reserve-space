
import React, { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { supabase } from "@/integrations/supabase/client";
import { format, addHours, setHours, setMinutes, subHours , isSameDay } from "date-fns";


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
  const [fullyBookedDates, setFullyBookedDates] = useState<Date[]>([]);
  const [loading, setLoading] = useState(false);
  const [schedules, setSchedules] = useState<RoomSchedule[]>([]);

  useEffect(() => {
    const fetchSchedulesAndBookings = async () => {
      if (!room?.id) return;

      const { data: schedulesData, error: schedulesError } = await supabase
        .from("room_schedules")
        .select("*")
        .eq("room_id", room.id);

      if (schedulesError) {
        console.error("Erro ao buscar horários da sala:", schedulesError);
        return;
      }
      setSchedules(schedulesData || []);

      const today = new Date();
      const nextDays = Array.from({ length: 30 }, (_, i) => {
        const date = new Date();
        date.setDate(today.getDate() + i);
        return date;
      });

      const bookedDates: Date[] = [];

      for (const date of nextDays) {
        const weekday = format(date, "eeee").toLowerCase();
        const schedule = schedulesData?.find((sch) => sch.weekday === weekday);

        if (!schedule) {
          bookedDates.push(date);
          continue;
        }

        const startHour = parseInt(schedule.start_time.split(":")[0], 10);
        const endHour = parseInt(schedule.end_time.split(":")[0], 10);
        const expectedSlots = endHour - startHour;

        const { data: bookingsData } = await supabase
          .from("bookings")
          .select("start_time, end_time")
          .eq("room_id", room.id)
          .eq("status", "confirmed")  // Only consider confirmed bookings
          .or("status.eq.pending")     // Also include pending bookings
          .gte("start_time", `${format(date, "yyyy-MM-dd")}T00:00:00`)
          .lt("start_time", `${format(date, "yyyy-MM-dd")}T23:59:59`);

        if (bookingsData) {
          let totalBookedSlots = 0;
          bookingsData.forEach((booking: any) => {
            const start = parseInt(booking.start_time.split("T")[1].split(":")[0]);
            const end = parseInt(booking.end_time.split("T")[1].split(":")[0]);
            totalBookedSlots += end - start;
          });

          if (totalBookedSlots >= expectedSlots) {
            bookedDates.push(date);
          }
        }
      }

      setFullyBookedDates(bookedDates);
    };

    fetchSchedulesAndBookings();
  }, [room]);

  useEffect(() => {
    if (!selectedDate || schedules.length === 0) {
      setAvailableHours([]);
      return;
    }

    const fetchAvailableHours = async () => {
      const weekday = format(selectedDate, "eeee").toLowerCase();
      const schedule = schedules.find((sch) => sch.weekday === weekday);

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

      const { data: bookingsData } = await supabase
        .from("bookings")
        .select("start_time, end_time")
        .eq("room_id", room.id)
        .not("status", "eq", "cancelled")  // Exclude cancelled bookings
        .gte("start_time", `${format(selectedDate, "yyyy-MM-dd")}T00:00:00`)
        .lt("start_time", `${format(selectedDate, "yyyy-MM-dd")}T23:59:59`);

      const blocked: string[] = [];

      bookingsData?.forEach((booking: any) => {
        const start = parseInt(booking.start_time.split("T")[1].split(":")[0]);
        const end = parseInt(booking.end_time.split("T")[1].split(":")[0]);
        for (let i = start; i < end; i++) {
          blocked.push(`${i.toString().padStart(2, "0")}:00`);
        }
      });

      setBlockedHours(blocked);
    };

    fetchAvailableHours();
  }, [selectedDate, schedules]);

  const handleReserve = async () => {
    if (!selectedDate || !startHour || !endHour) return;

    const start = parseInt(startHour.split(":")[0]);
    const end = parseInt(endHour.split(":")[0]);

    if (end <= start) {
      alert("O horário final deve ser depois do horário inicial.");
      return;
    }

    setLoading(true);

    const user = (await supabase.auth.getUser()).data.user;

    if (!user) {
      alert("Usuário não autenticado.");
      setLoading(false);
      return;
    }

    let startTime = setMinutes(setHours(selectedDate, start), 0);
    let endTime = setMinutes(setHours(selectedDate, end), 0);

    startTime = subHours(startTime, 3);
    endTime = subHours(endTime, 3);

    const { data: existingBookings } = await supabase
      .from("bookings")
      .select("*")
      .eq("room_id", room.id)
      .not("status", "eq", "cancelled")  // Exclude cancelled bookings
      .or(`and(start_time.lt.${endTime.toISOString()},end_time.gt.${startTime.toISOString()})`);

    if (existingBookings && existingBookings.length > 0) {
      alert("Horário já reservado! Escolha outro horário.");
      setLoading(false);
      return;
    }

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
            onSelect={(date) => {
              if (!fullyBookedDates.some((d) => isSameDay(d, date!))) {
                setSelectedDate(date);
              }
            }}
            className="rounded-md border"
            disabled={(date) => fullyBookedDates.some((d) => isSameDay(d, date))}
          />

      </div>

      {selectedDate && availableHours.length > 0 ? (
        <>
          <h3 className="text-lg mb-2">Selecione o horário de início:</h3>
          <div className="grid grid-cols-3 gap-2 mb-6">
            {availableHours.map((hour, index) => {
              const isBlocked = blockedHours.includes(hour);
              const isLastHour = index === availableHours.length - 1;

              return (
                <Button
                  key={hour}
                  variant={startHour === hour ? "default" : (isBlocked || isLastHour) ? "destructive" : "outline"}
                  onClick={() => {
                    if (!isBlocked && !isLastHour) {
                      setStartHour(hour);
                      setEndHour("");
                    }
                  }}
                  disabled={isBlocked || isLastHour}
                >
                  {hour}
                </Button>
              );
            })}
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
