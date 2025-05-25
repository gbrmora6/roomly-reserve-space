import React from "react";
import { useAuth } from "@/contexts/AuthContext";
import MainLayout from "@/components/layout/MainLayout";
import { useBookings } from "@/hooks/useBookings";
import { useCompanyProfile } from "@/hooks/useCompanyProfile";
import { useOrders } from "@/hooks/useOrders";
import { BookingsHeader } from "./components/BookingsHeader";
import { BookingTabs } from "./components/BookingTabs";
import { CompanyAddressDialog } from "./components/CompanyAddressDialog";
import { LoadingBookings } from "@/components/bookings/LoadingBookings";

const MyBookings = () => {
  const { user } = useAuth();
  
  const {
    roomBookings,
    equipmentBookings,
    isLoading,
    activeTab,
    setActiveTab,
    handleCancelBooking
  } = useBookings(user?.id);

  const { productOrders, isLoading: isLoadingOrders } = useOrders(user?.id);

  const {
    companyProfile,
    showAddressDialog,
    setShowAddressDialog,
    handleShowAddress
  } = useCompanyProfile();

  // Show loading state
  if ((isLoading && !roomBookings && !equipmentBookings) || isLoadingOrders) {
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
      <div className="container mx-auto py-8">
        <BookingsHeader onShowAddress={handleShowAddress} title="Meus Pedidos" />
        
        <BookingTabs 
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          roomBookings={roomBookings}
          equipmentBookings={equipmentBookings}
          productOrders={productOrders}
          onCancelBooking={handleCancelBooking}
        />

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
