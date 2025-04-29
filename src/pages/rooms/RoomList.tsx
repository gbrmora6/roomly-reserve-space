
import React, { useState, useEffect } from "react";
import MainLayout from "@/components/layout/MainLayout";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { RoomFilters } from "@/components/rooms/RoomFilters";
import { RoomsGrid } from "@/components/rooms/RoomsGrid";
import ReserveRoomForm from "@/components/rooms/ReserveRoomForm";
import { Room } from "@/types/room";
import { useAuth } from "@/contexts/AuthContext";
import { roomService } from "@/services/roomService";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

const RoomList: React.FC = () => {
  const { user } = useAuth();
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null);
  const [isReserveModalOpen, setIsReserveModalOpen] = useState(false);
  const [filters, setFilters] = useState({
    date: null as Date | null,
    startTime: null as string | null,
    endTime: null as string | null,
  });
  const [companyAddress, setCompanyAddress] = useState({
    street: "",
    number: "",
    neighborhood: "",
    city: "",
  });

  // Fetch company profile for address
  useEffect(() => {
    const fetchCompanyProfile = async () => {
      const { data, error } = await supabase
        .from("company_profile")
        .select("street, number, neighborhood, city")
        .single();
      
      if (data && !error) {
        setCompanyAddress(data);
      }
    };
    
    fetchCompanyProfile();
  }, []);

  const { data: rooms, isLoading, error, refetch } = useQuery({
    queryKey: ["rooms", filters],
    queryFn: async () => {
      if (filters.date && filters.startTime && filters.endTime) {
        const startDateTime = new Date(filters.date);
        const [startHours, startMinutes] = filters.startTime.split(':');
        startDateTime.setHours(parseInt(startHours), parseInt(startMinutes), 0, 0);

        const endDateTime = new Date(filters.date);
        const [endHours, endMinutes] = filters.endTime.split(':');
        endDateTime.setHours(parseInt(endHours), parseInt(endMinutes), 0, 0);

        // Get weekday number (0-6, where 0 is Sunday)
        const weekdayNumber = filters.date.getDay();
        
        console.log("Filtering rooms for date:", filters.date);
        console.log("Start time:", startDateTime.toISOString());
        console.log("End time:", endDateTime.toISOString());
        console.log("Weekday number:", weekdayNumber);

        try {
          // Get all rooms that are open on this weekday
          const { data: allRooms, error: roomsError } = await supabase
            .from('rooms')
            .select(`
              *,
              room_photos (
                id,
                url
              )
            `);

          if (roomsError) {
            console.error("Error fetching rooms:", roomsError);
            throw roomsError;
          }

          // Filter rooms that are open on the selected weekday
          const openRooms = allRooms.filter(room => {
            // If room has no open_days, assume it's open all days
            if (!room.open_days || room.open_days.length === 0) return true;
            
            // Check if the room is open on this day
            return room.open_days.includes(weekdayNumber);
          });

          // Get bookings that overlap with the selected time
          const { data: bookings, error: bookingsError } = await supabase
            .from('bookings')
            .select('room_id')
            .not('status', 'eq', 'cancelled')
            .lte('start_time', endDateTime.toISOString())
            .gte('end_time', startDateTime.toISOString());

          if (bookingsError) {
            console.error("Error fetching bookings:", bookingsError);
            throw bookingsError;
          }

          console.log("Found bookings:", bookings);
          const bookedRoomIds = bookings.map(booking => booking.room_id);
          console.log("Booked room IDs:", bookedRoomIds);

          // Filter out booked rooms
          const availableRooms = openRooms.filter(room => !bookedRoomIds.includes(room.id));
          console.log("Available rooms:", availableRooms.length);

          return availableRooms as unknown as Room[];
        } catch (error) {
          console.error("Error in room filtering query:", error);
          throw error;
        }
      }

      return roomService.getAllRooms();
    },
  });

  const handleReserve = (room: Room) => {
    if (user) {
      setSelectedRoom(room);
      setIsReserveModalOpen(true);
    }
  };

  const handleFilter = () => {
    refetch();
  };

  const handleClearFilters = () => {
    setFilters({
      date: null,
      startTime: null,
      endTime: null,
    });
  };

  // Format the full address
  const formatAddress = () => {
    if (!companyAddress.street) return "";
    return `${companyAddress.street}, ${companyAddress.number} - ${companyAddress.neighborhood}, ${companyAddress.city}`;
  };

  return (
    <MainLayout>
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-8 text-center md:text-left bg-gradient-to-r from-roomly-600 to-roomly-800 text-transparent bg-clip-text">
          Salas Disponíveis
        </h1>

        <RoomFilters 
          filters={filters} 
          setFilters={setFilters} 
          onFilter={handleFilter}
          onClear={handleClearFilters}
        />

        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          </div>
        ) : error ? (
          <div className="text-center py-20">
            <p className="text-red-500 mb-2">Erro ao carregar salas</p>
          </div>
        ) : (
          <RoomsGrid
            rooms={rooms}
            onReserve={handleReserve}
            isLoggedIn={!!user}
            address={formatAddress()}
            showFilterMessage={!filters.date && !filters.startTime && !filters.endTime}
          />
        )}

        <Dialog open={isReserveModalOpen} onOpenChange={setIsReserveModalOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Reservar Sala</DialogTitle>
            </DialogHeader>
            {selectedRoom && (
              <ReserveRoomForm
                room={selectedRoom}
                onClose={() => setIsReserveModalOpen(false)}
              />
            )}
          </DialogContent>
        </Dialog>
      </div>
    </MainLayout>
  );
};

export default RoomList;
