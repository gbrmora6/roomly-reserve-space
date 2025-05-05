
import { useEquipmentDateAndTime } from "@/hooks/useEquipmentDateAndTime";
import { useEquipmentBookingTotal } from "@/hooks/useEquipmentBookingTotal";
import { useEquipmentQuantity } from "@/hooks/useEquipmentQuantity";
import { useEquipmentBookingSubmit } from "@/hooks/useEquipmentBookingSubmit";
import { Database } from "@/integrations/supabase/types";

type WeekdayEnum = Database["public"]["Enums"]["weekday"];

interface Equipment {
  id: string;
  name: string;
  description: string | null;
  quantity: number;
  price_per_hour: number;
  open_time?: string;
  close_time?: string;
  open_days?: WeekdayEnum[];
}

interface UseEquipmentBookingProps {
  equipment: Equipment;
  initialFilters?: {
    date: Date | null;
    startTime: string | null;
    endTime: string | null;
  };
  onClose: () => void;
}

export function useEquipmentBooking({ 
  equipment, 
  initialFilters, 
  onClose 
}: UseEquipmentBookingProps) {
  // Use date and time selection hook
  const dateAndTime = useEquipmentDateAndTime({
    equipment,
    initialDate: initialFilters?.date,
    initialStartTime: initialFilters?.startTime,
    initialEndTime: initialFilters?.endTime
  });

  // Use quantity management hook
  const { quantity, setQuantity } = useEquipmentQuantity({
    initialQuantity: 1,
    maxQuantity: equipment.quantity
  });

  // Use booking total calculation hook
  const { bookingTotal } = useEquipmentBookingTotal({
    pricePerHour: equipment.price_per_hour,
    selectedDate: dateAndTime.selectedDate,
    startHour: dateAndTime.startHour,
    endHour: dateAndTime.endHour,
    quantity
  });

  // Use booking submission hook
  const { isSubmitting, handleSubmit } = useEquipmentBookingSubmit({
    equipmentId: equipment.id,
    selectedDate: dateAndTime.selectedDate,
    startHour: dateAndTime.startHour,
    endHour: dateAndTime.endHour,
    quantity,
    onSuccess: onClose
  });

  return {
    state: {
      selectedDate: dateAndTime.selectedDate,
      startHour: dateAndTime.startHour,
      endHour: dateAndTime.endHour,
      quantity,
      bookingTotal,
      isSubmitting
    },
    refs: { 
      startHourRef: dateAndTime.startHourRef, 
      endHourRef: dateAndTime.endHourRef 
    },
    availableHours: dateAndTime.availableHours,
    blockedHours: dateAndTime.blockedHours,  // Include blockedHours in the return value
    handlers: {
      handleDateSelect: dateAndTime.handleDateSelect,
      handleStartHourSelect: dateAndTime.handleStartHourSelect,
      setEndHour: dateAndTime.setEndHour,
      setQuantity,
      handleSubmit,
      isDateDisabled: dateAndTime.isDateDisabled
    }
  };
}
