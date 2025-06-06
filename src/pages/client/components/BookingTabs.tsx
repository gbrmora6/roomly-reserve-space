import React from "react";
import { Table, HardDrive } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BookingsTable } from "./BookingsTable";
import { Database } from "@/integrations/supabase/types";

type BookingStatus = Database["public"]["Enums"]["booking_status"];

interface BookingTabsProps {
  activeTab: "rooms" | "equipment" | "products";
  setActiveTab: (tab: "rooms" | "equipment" | "products") => void;
  roomBookings: any[] | null;
  equipmentBookings: any[] | null;
  productOrders: any[] | null;
  onCancelBooking: (bookingId: string) => void;
}

export const BookingTabs = ({
  activeTab,
  setActiveTab,
  roomBookings,
  equipmentBookings,
  productOrders,
  onCancelBooking,
}: BookingTabsProps) => {
  return (
    <Tabs defaultValue="rooms" value={activeTab} onValueChange={(value) => setActiveTab(value as "rooms" | "equipment" | "products")}>
      <TabsList className="mb-4">
        <TabsTrigger value="rooms" className="flex items-center space-x-2">
          <Table className="h-4 w-4" />
          <span>Reservas de Salas</span>
        </TabsTrigger>
        <TabsTrigger value="equipment" className="flex items-center space-x-2">
          <HardDrive className="h-4 w-4" />
          <span>Reservas de Equipamentos</span>
        </TabsTrigger>
        <TabsTrigger value="products" className="flex items-center space-x-2">
          <span>Compras de Produtos</span>
        </TabsTrigger>
      </TabsList>
      
      <TabsContent value="rooms">
        <BookingsTable 
          bookings={roomBookings} 
          onCancelBooking={onCancelBooking} 
        />
      </TabsContent>
      
      <TabsContent value="equipment">
        <BookingsTable 
          bookings={equipmentBookings} 
          onCancelBooking={onCancelBooking} 
        />
      </TabsContent>

      <TabsContent value="products">
        <BookingsTable 
          bookings={productOrders} 
          onCancelBooking={() => {}} // Não permite cancelar compras de produtos
        />
      </TabsContent>
    </Tabs>
  );
};
