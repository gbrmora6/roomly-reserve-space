
import React, { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Circle } from "lucide-react";

export const useNotifications = () => {
  const [roomNotificationCount, setRoomNotificationCount] = useState(0);
  const [equipmentNotificationCount, setEquipmentNotificationCount] = useState(0);
  const [notificationSound] = useState<HTMLAudioElement | null>(
    typeof window !== "undefined" ? new Audio("/notification.mp3") : null
  );
  const queryClient = useQueryClient();
  
  // Query to get pending room bookings
  const { data: pendingRoomBookings } = useQuery({
    queryKey: ["pending-room-bookings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("bookings")
        .select("id")
        .eq("status", "in_process");
        
      if (error) throw error;
      return data || [];
    },
    refetchInterval: 30000, // Refetch every 30 seconds
  });
  
  // Query to get pending equipment bookings
  const { data: pendingEquipmentBookings } = useQuery({
    queryKey: ["pending-equipment-bookings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("booking_equipment")
        .select("id")
        .eq("status", "in_process");
        
      if (error) throw error;
      return data || [];
    },
    refetchInterval: 30000, // Refetch every 30 seconds
  });
  
  // Set up real-time listeners for new bookings
  useEffect(() => {
    const roomBookingsChannel = supabase
      .channel('room_bookings_changes')
      .on(
        'postgres_changes',
        { 
          event: '*', // Listen for all events (INSERT, UPDATE, DELETE)
          schema: 'public',
          table: 'bookings',
        },
        (payload) => {
          console.log('Room booking change received:', payload);
          // Invalidate the query to force a refetch of the data
          queryClient.invalidateQueries({ queryKey: ["pending-room-bookings"] });
          
          // If it's a new in_process booking, play notification sound
          if (payload.eventType === 'INSERT' && payload.new.status === 'in_process') {
            notificationSound?.play().catch(err => console.error("Error playing notification sound:", err));
          }
        }
      )
      .subscribe();
      
    const equipmentBookingsChannel = supabase
      .channel('equipment_bookings_changes')
      .on(
        'postgres_changes',
        { 
          event: '*', // Listen for all events (INSERT, UPDATE, DELETE)
          schema: 'public',
          table: 'booking_equipment',
        },
        (payload) => {
          console.log('Equipment booking change received:', payload);
          // Invalidate the query to force a refetch of the data
          queryClient.invalidateQueries({ queryKey: ["pending-equipment-bookings"] });
          
          // If it's a new in_process booking, play notification sound
          if (payload.eventType === 'INSERT' && payload.new.status === 'in_process') {
            notificationSound?.play().catch(err => console.error("Error playing notification sound:", err));
          }
        }
      )
      .subscribe();
    
    return () => {
      supabase.removeChannel(roomBookingsChannel);
      supabase.removeChannel(equipmentBookingsChannel);
    };
  }, [notificationSound, queryClient]);
  
  // Update notification counts when data changes
  useEffect(() => {
    if (pendingRoomBookings) {
      setRoomNotificationCount(pendingRoomBookings.length);
    }
  }, [pendingRoomBookings]);
  
  useEffect(() => {
    if (pendingEquipmentBookings) {
      setEquipmentNotificationCount(pendingEquipmentBookings.length);
    }
  }, [pendingEquipmentBookings]);

  return {
    roomNotificationCount,
    equipmentNotificationCount,
  };
};

export const NotificationIndicator: React.FC<{ count: number }> = ({ count }) => {
  if (count <= 0) return null;
  
  return <Circle className="ml-2 h-2 w-2 text-red-500 fill-red-500" />;
};
