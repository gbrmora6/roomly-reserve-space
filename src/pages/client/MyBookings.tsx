
import React, { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import MainLayout from "@/components/layout/MainLayout";
import { useBookings } from "@/hooks/useBookings";
import { useCompanyProfile } from "@/hooks/useCompanyProfile";
import { useOrders } from "@/hooks/useOrders";
import { PageHeader } from "@/components/shared/PageHeader";
import { BookingTabs } from "./components/BookingTabs";
import { CompanyAddressDialog } from "./components/CompanyAddressDialog";
import { LoadingBookings } from "@/components/bookings/LoadingBookings";
import { PaymentCard } from "@/components/orders/PaymentCard";
import { PaymentStats } from "@/components/orders/PaymentStats";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Package, Calendar, ShoppingCart, MapPin, TrendingUp, Clock } from "lucide-react";

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
      <div className="container mx-auto py-8 px-4">
        <PageHeader 
          title="Meus Pedidos"
          description="Acompanhe seus pedidos e reservas em tempo real"
        >
          <Button
            variant="outline"
            onClick={handleShowAddress}
            className="glass-intense hover:shadow-soft"
          >
            <MapPin className="mr-2 h-4 w-4" />
            Endereço da Empresa
          </Button>
        </PageHeader>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card className="card-3d glass-intense border-border/30">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-xl bg-primary/10">
                  <ShoppingCart className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{productOrders?.length || 0}</p>
                  <p className="text-sm text-muted-foreground">Pedidos Totais</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="card-3d glass-intense border-border/30">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-xl bg-accent/10">
                  <Calendar className="h-6 w-6 text-accent" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{(roomBookings?.length || 0) + (equipmentBookings?.length || 0)}</p>
                  <p className="text-sm text-muted-foreground">Reservas Ativas</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="card-3d glass-intense border-border/30">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-xl bg-green-500/10">
                  <TrendingUp className="h-6 w-6 text-green-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">
                    {productOrders?.filter(o => o.status === 'paid').length || 0}
                  </p>
                  <p className="text-sm text-muted-foreground">Pedidos Pagos</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
        
        <Card className="card-3d glass-intense border-border/30">
          <CardContent className="p-6">
            <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as "reservas" | "pedidos")}>
              <TabsList className="grid w-full grid-cols-2 glass-intense">
                <TabsTrigger value="pedidos" className="flex items-center gap-2 data-[state=active]:bg-primary/10">
                  <ShoppingCart className="h-4 w-4" />
                  Pedidos de Produtos
                  {productOrders?.length > 0 && (
                    <Badge variant="secondary" className="ml-2 text-xs">
                      {productOrders.length}
                    </Badge>
                  )}
                </TabsTrigger>
                <TabsTrigger value="reservas" className="flex items-center gap-2 data-[state=active]:bg-accent/10">
                  <Calendar className="h-4 w-4" />
                  Reservas
                  {((roomBookings?.length || 0) + (equipmentBookings?.length || 0)) > 0 && (
                    <Badge variant="secondary" className="ml-2 text-xs">
                      {(roomBookings?.length || 0) + (equipmentBookings?.length || 0)}
                    </Badge>
                  )}
                </TabsTrigger>
              </TabsList>

              <TabsContent value="pedidos" className="mt-6 space-y-6">
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
                  <Card className="glass-intense border-border/30">
                    <CardContent className="text-center py-16">
                      <Package className="h-16 w-16 text-muted-foreground mx-auto mb-4 opacity-50" />
                      <h3 className="text-lg font-medium mb-2">Nenhum pedido encontrado</h3>
                      <p className="text-muted-foreground mb-6">
                        Quando você fizer um pedido, ele aparecerá aqui.
                      </p>
                      <Button variant="premium" className="animate-float">
                        <ShoppingCart className="mr-2 h-4 w-4" />
                        Fazer Primeiro Pedido
                      </Button>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>

              <TabsContent value="reservas" className="mt-6 space-y-6">
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
          </CardContent>
        </Card>

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
