import React from "react";
import { Table, HardDrive } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BookingCardList } from "./BookingCardList";
import { Database } from "@/integrations/supabase/types";

type BookingStatus = Database["public"]["Enums"]["booking_status"];

interface BookingTabsProps {
  activeTab: "rooms" | "equipment" | "products";
  setActiveTab: (tab: "rooms" | "equipment" | "products") => void;
  roomBookings: any[] | null;
  equipmentBookings: any[] | null;
  productOrders: any[] | null;
  onCancelBooking: (bookingId: string, type: "room" | "equipment") => void;
  onRefreshStatus: (bookingId: string) => void;
  onRequestRefund: (bookingId: string, reason?: string) => void;
  isRefreshing?: boolean;
}

export const BookingTabs = ({
  activeTab,
  setActiveTab,
  roomBookings,
  equipmentBookings,
  productOrders,
  onCancelBooking,
  onRefreshStatus,
  onRequestRefund,
  isRefreshing = false,
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
        <BookingCardList
          bookings={roomBookings || []}
          type="room"
          onRefresh={onRefreshStatus}
          onCancel={onCancelBooking}
          onRefund={onRequestRefund}
          isRefreshing={isRefreshing}
        />
      </TabsContent>
      
      <TabsContent value="equipment">
        <BookingCardList
          bookings={equipmentBookings || []}
          type="equipment"
          onRefresh={onRefreshStatus}
          onCancel={onCancelBooking}
          onRefund={onRequestRefund}
          isRefreshing={isRefreshing}
        />
      </TabsContent>

      <TabsContent value="products">
        <div className="text-center py-8 text-muted-foreground">
          Esta seção não é mais utilizada. As compras de produtos estão na aba "Pedidos de Produtos".
        </div>
      </TabsContent>
    </Tabs>
  );
};
