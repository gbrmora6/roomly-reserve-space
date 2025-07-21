
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
    search,
    setSearch,
    page,
    setPage,
    branchId,
    setBranchId,
    branches,
    isSuperAdmin,
    bookings,
    filteredBookings,
    isLoading,
    stats,
    totalPages,
    refetch,
    downloadReport,
    selectedBooking,
    showDetails,
    handleViewDetails,
    handleCloseDetails,
  } = useEquipmentBookings();

  if (isLoading) {
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

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Pagas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">R$ {stats.paid.toFixed(2)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Pendentes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">R$ {stats.pending.toFixed(2)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Faturado</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              R$ {stats.invoiced.toFixed(2)}
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as any)}>
        <TabsList>
          <TabsTrigger value="all">Todas</TabsTrigger>
          <TabsTrigger value="in_process">Pendentes</TabsTrigger>
          <TabsTrigger value="paid">Pagas</TabsTrigger>
          <TabsTrigger value="cancelled">Canceladas</TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="mt-6">
          <EquipmentBookingFilters
            search={search}
            setSearch={setSearch}
            branchId={branchId}
            setBranchId={setBranchId}
            branches={branches}
            isSuperAdmin={isSuperAdmin}
            filteredBookingsCount={filteredBookings.length}
            page={page}
            totalPages={totalPages}
            setPage={setPage}
            onDownloadReport={downloadReport}
          />

          <EquipmentBookingTable
            bookings={bookings}
            onViewDetails={handleViewDetails}
            onRefetch={refetch}
          />
        </TabsContent>
      </Tabs>

      <EquipmentBookingDetailsModal
        isOpen={showDetails}
        onClose={handleCloseDetails}
        booking={selectedBooking}
        onRefetch={refetch}
      />
    </div>
  );
}
