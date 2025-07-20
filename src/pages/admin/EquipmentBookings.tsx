import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { useEquipmentBookings } from '@/hooks/useEquipmentBookings';
import { EquipmentBookingFilters } from '@/components/admin/equipment/EquipmentBookingFilters';
import { EquipmentBookingTable } from '@/components/admin/equipment/EquipmentBookingTable';
import { EquipmentBookingDetailsModal } from '@/components/admin/equipment/EquipmentBookingDetailsModal';



export default function EquipmentBookings() {
  const {
    activeTab,
    setActiveTab,
    searchTerm,
    setSearchTerm,
    currentPage,
    setCurrentPage,
    selectedBooking,
    setSelectedBooking,
    isDetailsModalOpen,
    setIsDetailsModalOpen,
    selectedBranch,
    branchFilter,
    bookingsQuery,
    profilesQuery,
    filteredBookings,
    paginatedBookings,
    totalPages,
    stats,
    translateStatus,
    downloadReport,
    handleViewDetails,
    handleCloseDetails
  } = useEquipmentBookings();
  



  

  
  if (bookingsQuery.isLoading || profilesQuery.isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardHeader className="pb-2">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-8 w-16" />
              </CardHeader>
            </Card>
          ))}
        </div>
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-48" />
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Reservas de Equipamentos</CardTitle>
          <CardDescription>
            Gerencie todas as reservas de equipamentos da sua unidade
          </CardDescription>
        </CardHeader>
      </Card>

      <EquipmentBookingFilters
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
        selectedBranch={selectedBranch}
        branchFilter={branchFilter}
        downloadReport={downloadReport}
        stats={stats}
      />

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="all">Todas</TabsTrigger>
          <TabsTrigger value="pending">Pendentes</TabsTrigger>
          <TabsTrigger value="confirmed">Confirmadas</TabsTrigger>
          <TabsTrigger value="paid">Pagas</TabsTrigger>
          <TabsTrigger value="cancelled">Canceladas</TabsTrigger>
          <TabsTrigger value="completed">Concluídas</TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="mt-6">
          <EquipmentBookingTable
            bookings={paginatedBookings}
            currentPage={currentPage}
            totalPages={totalPages}
            setCurrentPage={setCurrentPage}
            onViewDetails={handleViewDetails}
            translateStatus={translateStatus}
          />
        </TabsContent>
      </Tabs>

      <EquipmentBookingDetailsModal
        booking={selectedBooking}
        isOpen={isDetailsModalOpen}
        onClose={handleCloseDetails}
        translateStatus={translateStatus}
      />
    </div>
  );
}
