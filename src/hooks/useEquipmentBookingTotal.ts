
import { useState, useEffect } from "react";

interface UseEquipmentBookingTotalProps {
  pricePerHour: number;
  selectedDate: Date | null;
  startHour: string;
  endHour: string;
  quantity: number;
}

export function useEquipmentBookingTotal({
  pricePerHour,
  selectedDate,
  startHour,
  endHour,
  quantity
}: UseEquipmentBookingTotalProps) {
  const [bookingTotal, setBookingTotal] = useState<number>(0);

  // Calculate booking price when relevant fields change
  useEffect(() => {
    if (selectedDate && startHour && endHour && quantity) {
      // Calculate duration in hours
      const startParts = startHour.split(":");
      const endParts = endHour.split(":");
      
      const startHourNum = parseInt(startParts[0]);
      const endHourNum = parseInt(endParts[0]);
      
      let durationHours = endHourNum - startHourNum;
      
      if (durationHours <= 0) {
        durationHours = 0;
      }
      
      // Calculate total price
      const total = pricePerHour * durationHours * quantity;
      setBookingTotal(total);
    }
  }, [selectedDate, startHour, endHour, quantity, pricePerHour]);

  return { bookingTotal };
}
