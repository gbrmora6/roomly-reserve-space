import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Database } from "@/integrations/supabase";
import { format } from "date-fns";

type Weekday = Database["public"]["Enums"]["weekday"];
type Room = Database["public"]["Tables"]["rooms"]["Row"] & {
  room_photos: { id: string; url: string }[];
  branches?: { 
    id: string; 
    name: string; 
    city: string; 
    street: string; 
    number: string; 
    neighborhood: string; 
  };
};

interface UseFilteredRoomsParams {
  searchTerm?: string;
  selectedCity?: string;
  selectedDate?: Date;
  startTime?: string;
  endTime?: string;
}

const timeToMinutes = (time: string): number => {
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
};

const getWeekdayFromDate = (date: Date): string => {
  const weekdays = [
    "sunday",
    "monday", 
    "tuesday", 
    "wednesday", 
    "thursday", 
    "friday", 
    "saturday"
  ];
  return weekdays[date.getDay()];
};

const checkRoomSchedule = async (
  roomId: string,
  weekday: string,
  startTime: string,
  endTime: string
): Promise<boolean> => {
  try {
    console.log(`🔍 Verificando horário da sala ${roomId} para ${weekday}: ${startTime}-${endTime}`);
    
    const { data: schedules, error } = await supabase
      .from("room_schedules")
      .select("start_time, end_time")
      .eq("room_id", roomId)
      .eq("weekday", weekday as any);

    if (error) {
      console.error("❌ Error checking room schedule:", error);
      return false;
    }

    if (!schedules || schedules.length === 0) {
      console.log(`❌ Nenhum horário cadastrado para ${weekday}`);
      return false;
    }

    console.log(`📋 Horários encontrados:`, schedules);

    // Verifica se o horário solicitado está dentro dos horários de funcionamento
    const requestStartMinutes = timeToMinutes(startTime);
    const requestEndMinutes = timeToMinutes(endTime);
    
    console.log(`⏰ Horário solicitado: ${requestStartMinutes}-${requestEndMinutes} minutos`);

    const isValid = schedules.some(schedule => {
      const scheduleStartMinutes = timeToMinutes(schedule.start_time);
      const scheduleEndMinutes = timeToMinutes(schedule.end_time);
      
      console.log(`📅 Horário da sala: ${scheduleStartMinutes}-${scheduleEndMinutes} minutos`);
      
      const startOk = requestStartMinutes >= scheduleStartMinutes;
      const endOk = requestEndMinutes <= scheduleEndMinutes;
      
      console.log(`✅ Início OK: ${startOk}, Fim OK: ${endOk}`);
      
      return startOk && endOk;
    });
    
    console.log(`🎯 Resultado final: ${isValid ? 'VÁLIDO' : 'INVÁLIDO'}`);
    return isValid;
  } catch (error) {
    console.error("❌ Error in checkRoomSchedule:", error);
    return false;
  }
};

export const useFilteredRooms = ({
  searchTerm = "",
  selectedCity = "all",
  selectedDate,
  startTime = "all",
  endTime = "all",
}: UseFilteredRoomsParams) => {
  return useQuery({
    queryKey: ["filtered-rooms", searchTerm, selectedCity, selectedDate, startTime, endTime],
    queryFn: async () => {
      // Primeiro, busca todas as salas ativas
      let query = supabase
        .from("rooms")
        .select(`
          *,
          room_photos(
            id,
            url
          )
        `)
        .eq("is_active", true);

      // Filtro por termo de busca
      if (searchTerm) {
        query = query.or(`name.ilike.%${searchTerm}%,description.ilike.%${searchTerm}%`);
      }

      const { data: rooms, error: roomsError } = await query;

      if (roomsError) {
        console.error("Erro ao buscar salas:", roomsError);
        throw roomsError;
      }

      if (!rooms) return [];

      // Filtro por cidade (busca filiais da cidade e filtra salas)
      let filteredRooms = rooms;
      if (selectedCity && selectedCity !== "all") {
        const { data: branches } = await supabase
          .from("branches")
          .select("id")
          .eq("city", selectedCity);
        
        if (branches && branches.length > 0) {
          const branchIds = branches.map(branch => branch.id);
          filteredRooms = rooms.filter(room => branchIds.includes(room.branch_id));
        } else {
          return [];
        }
      }

      // Busca informações das filiais para cada sala
      const roomsWithBranches = await Promise.all(
        filteredRooms.map(async (room) => {
          const { data: branch } = await supabase
            .from("branches")
            .select("id, name, city, street, number, neighborhood")
            .eq("id", room.branch_id)
            .single();
          
          return {
            ...room,
            branches: branch
          };
        })
      );

      // Se não há data selecionada, retorna as salas filtradas
      if (!selectedDate) {
        console.log("Retornando todas as salas - sem data selecionada");
        return roomsWithBranches;
      }

      // Verifica disponibilidade para cada sala na data selecionada
      const availableRooms = [];
      const weekday = getWeekdayFromDate(selectedDate);
      const hasTimeFilter = (startTime !== "all" && startTime) || (endTime !== "all" && endTime);
      
      console.log("Aplicando filtros de data", {
        selectedDate,
        weekday,
        startTime,
        endTime,
        hasTimeFilter
      });
      
      for (const room of roomsWithBranches) {
        try {
          console.log(`Verificando sala ${room.name} (${room.id}) para ${weekday}`);
          
          // Primeiro verifica se a sala funciona no dia da semana
          if (hasTimeFilter) {
            // Se há filtro de horário, verifica horário específico
            const effectiveStartTime = startTime !== "all" ? startTime : "06:00";
            const effectiveEndTime = endTime !== "all" ? endTime : "23:00";
            
            const isScheduleValid = await checkRoomSchedule(
              room.id,
              weekday,
              effectiveStartTime,
              effectiveEndTime
            );

            console.log(`Sala ${room.name} - horário específico válido:`, isScheduleValid);

            if (!isScheduleValid) {
              console.log(`Sala ${room.name} não funciona em ${weekday} no horário ${effectiveStartTime}-${effectiveEndTime}`);
              continue;
            }

            // Se apenas horário de início é especificado, verifica se a sala funciona a partir desse horário
            if (startTime !== "all" && endTime === "all") {
              // Verifica se a sala funciona a partir do horário de início
              const { data: schedules } = await supabase
                .from("room_schedules")
                .select("start_time, end_time")
                .eq("room_id", room.id)
                .eq("weekday", weekday as any);

              if (schedules && schedules.length > 0) {
                const schedule = schedules[0];
                const roomStartMinutes = timeToMinutes(schedule.start_time);
                const roomEndMinutes = timeToMinutes(schedule.end_time);
                const requestedStartMinutes = timeToMinutes(startTime);

                if (requestedStartMinutes >= roomStartMinutes && requestedStartMinutes < roomEndMinutes) {
                  availableRooms.push(room);
                }
              }
            } else {
              // Verifica disponibilidade de reservas para intervalo específico
              const isAvailable = await checkTimeRangeAvailability(
                room.id,
                selectedDate,
                effectiveStartTime,
                effectiveEndTime
              );

              if (isAvailable) {
                availableRooms.push(room);
              }
            }
          } else {
            // Se não há filtro de horário, verifica apenas se a sala funciona no dia
            const { data: schedules, error } = await supabase
              .from("room_schedules")
              .select("id")
              .eq("room_id", room.id)
              .eq("weekday", weekday as any);

            if (error) {
              console.error("Error checking room schedule:", error);
              continue;
            }

            const hasScheduleForDay = schedules && schedules.length > 0;
            console.log(`Sala ${room.name} - funciona em ${weekday}:`, hasScheduleForDay);

            if (hasScheduleForDay) {
              availableRooms.push(room);
            } else {
              console.log(`Sala ${room.name} não funciona em ${weekday}`);
            }
          }
        } catch (error) {
          console.error(`Erro ao processar sala ${room.id}:`, error);
        }
      }

      return availableRooms;
    },
    enabled: true,
  });
};

const checkTimeRangeAvailability = async (
  roomId: string,
  date: Date,
  startTime: string,
  endTime: string
): Promise<boolean> => {
  const dateStr = format(date, "yyyy-MM-dd");
  const weekday = getWeekdayFromDate(date);

  try {
    // Primeiro, verificar se a sala funciona no dia e horário solicitado
    const { data: schedules } = await supabase
      .from("room_schedules")
      .select("start_time, end_time")
      .eq("room_id", roomId)
      .eq("weekday", weekday as any);

    if (!schedules || schedules.length === 0) {
      console.log(`❌ Sala não funciona em ${weekday}`);
      return false;
    }

    const schedule = schedules[0];
    const roomStartMinutes = timeToMinutes(schedule.start_time);
    const roomEndMinutes = timeToMinutes(schedule.end_time);
    const requestedStartMinutes = timeToMinutes(startTime);
    const requestedEndMinutes = timeToMinutes(endTime);

    // Verificar se o horário solicitado está dentro do funcionamento da sala
    if (requestedStartMinutes < roomStartMinutes || requestedEndMinutes > roomEndMinutes) {
      console.log(`❌ Horário ${startTime}-${endTime} fora do funcionamento ${schedule.start_time}-${schedule.end_time}`);
      return false;
    }

    // Verificar conflitos com reservas existentes
    const { data: bookings } = await supabase
      .from("bookings")
      .select("start_time, end_time")
      .eq("room_id", roomId)
      .gte("start_time", `${dateStr} 00:00:00`)
      .lt("start_time", `${dateStr} 23:59:59`)
      .not("status", "in", "(recused)");

    if (bookings && bookings.length > 0) {
      for (const booking of bookings) {
        const bookingStart = new Date(booking.start_time);
        const bookingEnd = new Date(booking.end_time);
        const requestedStart = new Date(`${dateStr} ${startTime}:00`);
        const requestedEnd = new Date(`${dateStr} ${endTime}:00`);

        // Verificar sobreposição
        if (requestedStart < bookingEnd && requestedEnd > bookingStart) {
          console.log(`❌ Conflito com reserva: ${booking.start_time} - ${booking.end_time}`);
          return false;
        }
      }
    }

    // Verificar conflitos com itens no carrinho
    const { data: cartItems } = await supabase
      .from("cart_items")
      .select(`
        reserved_booking_id,
        bookings!inner(
          start_time,
          end_time,
          room_id
        )
      `)
      .eq("bookings.room_id", roomId)
      .gte("bookings.start_time", `${dateStr} 00:00:00`)
      .lt("bookings.start_time", `${dateStr} 23:59:59`)
      .gt("expires_at", new Date().toISOString());

    if (cartItems && cartItems.length > 0) {
      for (const item of cartItems) {
        const booking = item.bookings;
        if (booking) {
          const bookingStart = new Date(booking.start_time);
          const bookingEnd = new Date(booking.end_time);
          const requestedStart = new Date(`${dateStr} ${startTime}:00`);
          const requestedEnd = new Date(`${dateStr} ${endTime}:00`);

          // Verificar sobreposição
          if (requestedStart < bookingEnd && requestedEnd > bookingStart) {
            console.log(`❌ Conflito com item no carrinho: ${booking.start_time} - ${booking.end_time}`);
            return false;
          }
        }
      }
    }

    console.log(`✅ Horário ${startTime}-${endTime} disponível`);
    return true;

  } catch (error) {
    console.error("Erro ao verificar disponibilidade:", error);
    return false;
  }
};