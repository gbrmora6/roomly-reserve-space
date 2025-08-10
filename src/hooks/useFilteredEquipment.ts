import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Database } from "@/integrations/supabase";
import { format } from "date-fns";

type Weekday = Database["public"]["Enums"]["weekday"];
type Equipment = Database["public"]["Tables"]["equipment"]["Row"] & {
  equipment_photos: { id: string; url: string }[];
  branches?: { 
    id: string; 
    name: string; 
    city: string; 
    street: string; 
    number: string; 
    neighborhood: string; 
  };
  available: number;
};

interface UseFilteredEquipmentParams {
  searchTerm?: string;
  selectedCity?: string;
  selectedDate?: Date;
  startTime?: string;
  endTime?: string;
}

const timeToMinutes = (time: string): number => {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
};

const getWeekdayFromDate = (date: Date): string => {
  const weekdays = [
    'sunday', 'monday', 'tuesday', 'wednesday',
    'thursday', 'friday', 'saturday'
  ];
  return weekdays[date.getDay()];
};

const checkEquipmentSchedule = async (
  equipmentId: string,
  weekday: string,
  startTime: string,
  endTime: string
): Promise<boolean> => {
  try {
    console.log(`🔍 Verificando horário do equipamento ${equipmentId} para ${weekday} (${startTime}-${endTime})`);
    
    const { data: schedules, error } = await supabase
      .from("equipment_schedules")
      .select("start_time, end_time")
      .eq("equipment_id", equipmentId)
      .eq("weekday", weekday as any);

    if (error) {
      console.error("Erro ao verificar horário do equipamento:", error);
      return false;
    }

    if (!schedules || schedules.length === 0) {
      console.log(`❌ Equipamento não funciona em ${weekday}`);
      return false;
    }

    const schedule = schedules[0];
    const equipmentStartMinutes = timeToMinutes(schedule.start_time);
    const equipmentEndMinutes = timeToMinutes(schedule.end_time);
    const requestedStartMinutes = timeToMinutes(startTime);
    const requestedEndMinutes = timeToMinutes(endTime);

    console.log(`📅 Horário do equipamento: ${schedule.start_time}-${schedule.end_time}`);
    console.log(`🕐 Horário solicitado: ${startTime}-${endTime}`);

    const isValid = requestedStartMinutes >= equipmentStartMinutes && requestedEndMinutes <= equipmentEndMinutes;
    console.log(`✅ Horário válido:`, isValid);
    
    return isValid;
  } catch (error) {
    console.error("Erro na verificação de horário:", error);
    return false;
  }
};

export const useFilteredEquipment = ({
  searchTerm = "",
  selectedCity = "all",
  selectedDate,
  startTime = "all",
  endTime = "all",
}: UseFilteredEquipmentParams) => {
  return useQuery({
    queryKey: ["filtered-equipment", searchTerm, selectedCity, selectedDate, startTime, endTime],
    queryFn: async () => {
      // Primeiro, busca todos os equipamentos ativos
      let query = supabase
        .from("equipment")
        .select(`
          *,
          equipment_photos(
            id,
            url
          )
        `)
        .eq("is_active", true);

      // Filtro por termo de busca
      if (searchTerm) {
        query = query.or(`name.ilike.%${searchTerm}%,description.ilike.%${searchTerm}%`);
      }

      const { data: equipment, error: equipmentError } = await query;

      if (equipmentError) {
        console.error("Erro ao buscar equipamentos:", equipmentError);
        throw equipmentError;
      }

      if (!equipment) return [];

      // Filtro por cidade (busca filiais da cidade e filtra equipamentos)
      let filteredEquipment = equipment;
      if (selectedCity && selectedCity !== "all") {
        const { data: branches } = await supabase
          .from("branches")
          .select("id")
          .eq("city", selectedCity);
        
        if (branches && branches.length > 0) {
          const branchIds = branches.map(branch => branch.id);
          filteredEquipment = equipment.filter(equip => branchIds.includes(equip.branch_id));
        } else {
          return [];
        }
      }

      // Busca informações das filiais para cada equipamento
      const equipmentWithBranches = await Promise.all(
        filteredEquipment.map(async (equip) => {
          const { data: branch } = await supabase
            .from("branches")
            .select("id, name, city, street, number, neighborhood")
            .eq("id", equip.branch_id)
            .maybeSingle();
          
          return {
            ...equip,
            branches: branch,
            available: equip.quantity // Inicialmente, toda a quantidade está disponível
          };
        })
      );

      // Debug logs
      console.log("Debug filtros:", {
        selectedDate,
        startTime,
        endTime,
        hasDate: !!selectedDate,
        startTimeIsAll: startTime === "all",
        endTimeIsAll: endTime === "all"
      });

      // Se não há data selecionada, retorna todos os equipamentos
      if (!selectedDate) {
        console.log("Retornando todos os equipamentos - sem filtro de data");
        return equipmentWithBranches;
      }

      // Verifica disponibilidade para cada equipamento na data selecionada
      const availableEquipment = [];
      const weekday = getWeekdayFromDate(selectedDate);
      const hasTimeFilter = (startTime !== "all" && startTime) || (endTime !== "all" && endTime);
      
      console.log("Aplicando filtros de data", {
        selectedDate,
        weekday,
        startTime,
        endTime,
        hasTimeFilter
      });
      
      for (const equip of equipmentWithBranches) {
        try {
          console.log(`Verificando equipamento ${equip.name} (${equip.id}) para ${weekday}`);
          
          if (hasTimeFilter) {
            // Se há filtro de horário, verifica horário específico
            const effectiveStartTime = startTime !== "all" ? startTime : "06:00";
            const effectiveEndTime = endTime !== "all" ? endTime : "23:00";
            
            const isScheduleValid = await checkEquipmentSchedule(
              equip.id,
              weekday,
              effectiveStartTime,
              effectiveEndTime
            );

            console.log(`Equipamento ${equip.name} - horário específico válido:`, isScheduleValid);

            if (!isScheduleValid) {
              console.log(`Equipamento ${equip.name} não funciona em ${weekday} no horário ${effectiveStartTime}-${effectiveEndTime}`);
              continue;
            }

            // Se apenas horário de início é especificado, verifica se o equipamento funciona a partir desse horário
            if (startTime !== "all" && endTime === "all") {
              // Verifica se o equipamento funciona a partir do horário de início
              const { data: schedules } = await supabase
                .from("equipment_schedules")
                .select("start_time, end_time")
                .eq("equipment_id", equip.id)
                .eq("weekday", weekday as any);

              if (schedules && schedules.length > 0) {
                const schedule = schedules[0];
                const equipmentStartMinutes = timeToMinutes(schedule.start_time);
                const equipmentEndMinutes = timeToMinutes(schedule.end_time);
                const requestedStartMinutes = timeToMinutes(startTime);

                if (requestedStartMinutes >= equipmentStartMinutes && requestedStartMinutes < equipmentEndMinutes) {
                  availableEquipment.push(equip);
                }
              }
            } else {
              // Verifica disponibilidade de reservas para intervalo específico
              const isAvailable = await checkTimeRangeAvailability(
                equip.id,
                selectedDate,
                effectiveStartTime,
                effectiveEndTime
              );

              if (isAvailable) {
                availableEquipment.push(equip);
              }
            }
          } else {
            // Se não há filtro de horário específico, precisamos garantir duas coisas:
            // 1) O equipamento funciona no dia selecionado
            // 2) Existe pelo menos um horário disponível neste dia (não está 100% ocupado)
            const { data: schedules, error } = await supabase
              .from("equipment_schedules")
              .select("id")
              .eq("equipment_id", equip.id)
              .eq("weekday", weekday as any);

            if (error) {
              console.error("Error checking equipment schedule:", error);
              continue;
            }

            const hasScheduleForDay = schedules && schedules.length > 0;
            console.log(`Equipamento ${equip.name} - funciona em ${weekday}:`, hasScheduleForDay);

            if (!hasScheduleForDay) {
              console.log(`Equipamento ${equip.name} não funciona em ${weekday}`);
              continue;
            }

            // Verifica disponibilidade geral do dia usando a função RPC de disponibilidade
            const dateStr = format(selectedDate, "yyyy-MM-dd");
            const { data: availability, error: availabilityError } = await supabase
              .rpc("get_equipment_availability", {
                p_equipment_id: equip.id,
                p_date: dateStr,
                p_requested_quantity: 1
              });

            if (availabilityError) {
              console.error("Erro ao verificar disponibilidade do equipamento:", availabilityError);
              continue;
            }

            const hasAnyAvailableSlot = Array.isArray(availability) && availability.some((slot: any) => slot.is_available);
            console.log(`Equipamento ${equip.name} - possui algum horário disponível no dia?`, hasAnyAvailableSlot);

            if (hasAnyAvailableSlot) {
              availableEquipment.push(equip);
            }
          }
        } catch (error) {
          console.error(`Erro ao processar equipamento ${equip.id}:`, error);
        }
      }

      return availableEquipment;
    },
    enabled: true,
  });
};

const checkTimeRangeAvailability = async (
  equipmentId: string,
  date: Date,
  startTime: string,
  endTime: string
): Promise<boolean> => {
  const dateStr = format(date, "yyyy-MM-dd");
  const weekday = getWeekdayFromDate(date);

  try {
    // Primeiro, verificar se o equipamento funciona no dia e horário solicitado
    const { data: schedules } = await supabase
      .from("equipment_schedules")
      .select("start_time, end_time")
      .eq("equipment_id", equipmentId)
      .eq("weekday", weekday as any);

    if (!schedules || schedules.length === 0) {
      console.log(`❌ Equipamento não funciona em ${weekday}`);
      return false;
    }

    const schedule = schedules[0];
    const equipmentStartMinutes = timeToMinutes(schedule.start_time);
    const equipmentEndMinutes = timeToMinutes(schedule.end_time);
    const requestedStartMinutes = timeToMinutes(startTime);
    const requestedEndMinutes = timeToMinutes(endTime);

    // Verificar se o horário solicitado está dentro do funcionamento do equipamento
    if (requestedStartMinutes < equipmentStartMinutes || requestedEndMinutes > equipmentEndMinutes) {
      console.log(`❌ Horário ${startTime}-${endTime} fora do funcionamento ${schedule.start_time}-${schedule.end_time}`);
      return false;
    }

    // Verificar conflitos com reservas existentes
    const { data: bookings } = await (supabase as any)
      .from("booking_equipment")
      .select("start_time, end_time, quantity")
      .eq("equipment_id", equipmentId)
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
        reserved_equipment_booking_id,
        booking_equipment!inner(
          start_time,
          end_time,
          equipment_id,
          quantity
        )
      `)
      .eq("booking_equipment.equipment_id", equipmentId)
      .gte("booking_equipment.start_time", `${dateStr} 00:00:00`)
      .lt("booking_equipment.start_time", `${dateStr} 23:59:59`)
      .gt("expires_at", new Date().toISOString());

    if (cartItems && cartItems.length > 0) {
      for (const item of cartItems) {
        const booking = (item as any).booking_equipment;
        if (booking) {
          const bookingStart = new Date((booking as any).start_time);
          const bookingEnd = new Date((booking as any).end_time);
          const requestedStart = new Date(`${dateStr} ${startTime}:00`);
          const requestedEnd = new Date(`${dateStr} ${endTime}:00`);

          // Verificar sobreposição
          if (requestedStart < bookingEnd && requestedEnd > bookingStart) {
            console.log(`❌ Conflito com item no carrinho: ${(booking as any).start_time} - ${(booking as any).end_time}`);
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