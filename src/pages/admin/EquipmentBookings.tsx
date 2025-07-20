import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { useEquipmentBookings } from '@/hooks/useEquipmentBookings';
import { EquipmentBookingFilters } from '@/components/admin/equipment/EquipmentBookingFilters';
import { EquipmentBookingTable } from '@/components/admin/equipment/EquipmentBookingTable';
import { EquipmentBookingDetailsModal } from '@/components/admin/equipment/EquipmentBookingDetailsModal';



export default function EquipmentBookings() {
  const equipmentBookingsData = useEquipmentBookings();
  



  

  
  if (false) { // Temporary loading check disabled
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

      {/* Temporary removed until props are fixed */}

      <Tabs value={equipmentBookingsData.activeTab || 'all'} onValueChange={(value) => equipmentBookingsData.setActiveTab?.(value as any)}>
        <TabsList>
          <TabsTrigger value="all">Todas</TabsTrigger>
          <TabsTrigger value="pending">Pendentes</TabsTrigger>
          <TabsTrigger value="confirmed">Confirmadas</TabsTrigger>
          <TabsTrigger value="paid">Pagas</TabsTrigger>
          <TabsTrigger value="cancelled">Canceladas</TabsTrigger>
          <TabsTrigger value="completed">Concluídas</TabsTrigger>
        </TabsList>

        <TabsContent value={equipmentBookingsData.activeTab || 'all'} className="mt-6">
          {/* Temporary removed until props are fixed */}
        </TabsContent>
      </Tabs>

      {/* Temporary removed until props are fixed */}
    </div>
  );
}
