
import React, { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import MainLayout from "@/components/layout/MainLayout";
import { useBookings } from "@/hooks/useBookings";
import { useCompanyProfile } from "@/hooks/useCompanyProfile";
import { useOrders } from "@/hooks/useOrders";
import { BookingsHeader } from "./components/BookingsHeader";
import { BookingTabs } from "./components/BookingTabs";
import { CompanyAddressDialog } from "./components/CompanyAddressDialog";
import { LoadingBookings } from "@/components/bookings/LoadingBookings";
import { PaymentCard } from "@/components/orders/PaymentCard";
import { PaymentStats } from "@/components/orders/PaymentStats";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Package, Calendar, ShoppingCart } from "lucide-react";

const MyBookings = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<"reservas" | "pedidos">("pedidos");
  
  const {
    roomBookings,
    equipmentBookings,
    isLoading: isLoadingBookings,
    handleCancelBooking,
    checkPaymentStatus: checkBookingPaymentStatus,
    requestRefund: requestBookingRefund
  } = useBookings(user?.id);

  const { 
    productOrders, 
    isLoading: isLoadingOrders,
    checkPaymentStatus: checkOrderPaymentStatus,
    requestRefund: requestOrderRefund
  } = useOrders(user?.id);

  const {
    companyProfile,
    showAddressDialog,
    setShowAddressDialog,
    handleShowAddress
  } = useCompanyProfile();

  // Wrapper functions to match the expected signatures
  const handleCancelWrapper = (bookingId: string, type: "room" | "equipment") => {
    handleCancelBooking(bookingId, type);
  };

  const handleRefreshStatus = (bookingId: string) => {
    checkBookingPaymentStatus.mutate(bookingId);
  };

  const handleRequestRefund = (bookingId: string, reason?: string) => {
    requestBookingRefund.mutate({ bookingId, reason });
  };

  // Show loading state
  if ((isLoadingBookings && !roomBookings && !equipmentBookings) || isLoadingOrders) {
    return (
      <MainLayout>
        <div className="container mx-auto py-8">
          <LoadingBookings />
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="container mx-auto py-8 space-y-6">
        <BookingsHeader onShowAddress={handleShowAddress} title="Meus Pedidos" />
        
        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as "reservas" | "pedidos")}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="pedidos" className="flex items-center gap-2">
              <ShoppingCart className="h-4 w-4" />
              Pedidos de Produtos
            </TabsTrigger>
            <TabsTrigger value="reservas" className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Reservas
            </TabsTrigger>
          </TabsList>

          <TabsContent value="pedidos" className="space-y-4">
            <PaymentStats orders={productOrders || []} />
            {productOrders && productOrders.length > 0 ? (
              <div className="space-y-4">
                {productOrders.map((order) => (
                  <PaymentCard
                    key={order.id}
                    order={order}
                    onRefresh={(orderId) => checkOrderPaymentStatus.mutate(orderId)}
                    onRefund={(orderId, reason) => requestOrderRefund.mutate({ orderId, reason })}
                    isRefreshing={checkOrderPaymentStatus.isPending}
                  />
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <Package className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">Nenhum pedido encontrado</h3>
                <p className="text-muted-foreground">
                  Quando você fizer um pedido, ele aparecerá aqui.
                </p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="reservas" className="space-y-4">
            <BookingTabs 
              activeTab="rooms"
              setActiveTab={() => {}}
              roomBookings={roomBookings}
              equipmentBookings={equipmentBookings}
              productOrders={[]}
              onCancelBooking={handleCancelWrapper}
              onRefreshStatus={handleRefreshStatus}
              onRequestRefund={handleRequestRefund}
              isRefreshing={checkBookingPaymentStatus.isPending}
            />
          </TabsContent>
        </Tabs>

        <CompanyAddressDialog
          open={showAddressDialog}
          onOpenChange={setShowAddressDialog}
          companyProfile={companyProfile}
        />
      </div>
    </MainLayout>
  );
};

export default MyBookings;
