
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Database } from "@/integrations/supabase/types";

type BookingStatus = Database["public"]["Enums"]["booking_status"];

export interface BookingDetailsData {
  id: string;
  user_id: string; // Added user_id
  status: BookingStatus;
  start_time: string;
  end_time: string;
  total_price: number;
  room?: {
    name: string;
    price_per_hour: number;
  } | null;
  equipment?: {
    name: string;
    price_per_hour: number;
  } | null;
  booking_equipment?: Array<{
    quantity: number;
    equipment: {
      name: string;
      price_per_hour: number;
    };
  }> | null;
  quantity?: number;
}

export function useBookingDetails(bookingId: string | undefined) {
  const [booking, setBooking] = useState<BookingDetailsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [bookingType, setBookingType] = useState<"room" | "equipment">("room");

  useEffect(() => {
    const fetchBookingDetails = async () => {
      if (!bookingId) {
        setError("ID da reserva não fornecido");
        setLoading(false);
        return;
      }

      try {
        // First try to fetch as a room booking
        const { data: roomBooking, error: roomError } = await supabase
          .from("bookings")
          .select(`
            *,
            room:rooms(
              name,
              price_per_hour
            ),
            booking_equipment:booking_equipment(
              quantity,
              equipment:equipment(
                name,
                price_per_hour
              )
            )
          `)
          .eq("id", bookingId)
          .single();

        if (!roomError && roomBooking) {
          setBooking(roomBooking);
          setBookingType("room");
          setLoading(false);
          return;
        }

        // If not found, try as an equipment booking
        const { data: equipmentBooking, error: equipmentError } = await supabase
          .from("booking_equipment")
          .select(`
            *,
            equipment:equipment(
              name,
              price_per_hour
            )
          `)
          .eq("id", bookingId)
          .single();

        if (!equipmentError && equipmentBooking) {
          setBooking(equipmentBooking);
          setBookingType("equipment");
          setLoading(false);
          return;
        }

        // If neither is found, set error
        setError("Reserva não encontrada");
        setLoading(false);
      } catch (error) {
        console.error("Erro ao buscar detalhes da reserva:", error);
        setError("Erro ao carregar os detalhes da reserva");
        setLoading(false);
      }
    };

    if (bookingId) {
      fetchBookingDetails();
    }
  }, [bookingId]);

  return { booking, loading, error, bookingType };
}
