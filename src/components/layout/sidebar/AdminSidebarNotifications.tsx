
import React, { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Circle } from "lucide-react";

export const useNotifications = () => {
  const [roomNotificationCount, setRoomNotificationCount] = useState(0);
  const [equipmentNotificationCount, setEquipmentNotificationCount] = useState(0);
  const [notificationSound] = useState<HTMLAudioElement | null>(
    typeof window !== "undefined" ? new Audio("/notification.mp3") : null
  );
  
  // Query to get pending room bookings
  const { data: pendingRoomBookings } = useQuery({
    queryKey: ["pending-room-bookings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("bookings")
        .select("id")
        .eq("status", "pending");
        
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
        .eq("status", "pending");
        
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
          event: 'INSERT', 
          schema: 'public',
          table: 'bookings',
          filter: 'status=eq.pending'
        },
        (payload) => {
          console.log('New room booking received!', payload);
          setRoomNotificationCount(prev => prev + 1);
          notificationSound?.play().catch(err => console.error("Error playing notification sound:", err));
        }
      )
      .subscribe();
      
    const equipmentBookingsChannel = supabase
      .channel('equipment_bookings_changes')
      .on(
        'postgres_changes',
        { 
          event: 'INSERT', 
          schema: 'public',
          table: 'booking_equipment',
          filter: 'status=eq.pending'
        },
        (payload) => {
          console.log('New equipment booking received!', payload);
          setEquipmentNotificationCount(prev => prev + 1);
          notificationSound?.play().catch(err => console.error("Error playing notification sound:", err));
        }
      )
      .subscribe();
    
    return () => {
      supabase.removeChannel(roomBookingsChannel);
      supabase.removeChannel(equipmentBookingsChannel);
    };
  }, [notificationSound]);
  
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
