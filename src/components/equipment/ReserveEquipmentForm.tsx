
import React from "react";
import { Button } from "@/components/ui/button";
import { useEquipmentAvailability } from "@/hooks/useEquipmentAvailability";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { DialogFooter } from "@/components/ui/dialog";
import { TimeSelector } from "@/components/rooms/TimeSelector";
import { EquipmentDateSelector } from "./EquipmentDateSelector";
import { EquipmentQuantitySelector } from "./EquipmentQuantitySelector";
import { EquipmentBookingSummary } from "./EquipmentBookingSummary";
import { useEquipmentBooking } from "./useEquipmentBooking";
import { Database } from "@/integrations/supabase/types";

type WeekdayEnum = Database["public"]["Enums"]["weekday"];

interface Equipment {
  id: string;
  name: string;
  description: string | null;
  quantity: number;
  price_per_hour: number;
  open_time?: string;
  close_time?: string;
  open_days?: WeekdayEnum[];
}

interface ReserveEquipmentFormProps {
  equipment: Equipment;
  onClose: () => void;
  filters?: {
    date: Date | null;
    startTime: string | null;
    endTime: string | null;
  };
}

export const ReserveEquipmentForm: React.FC<ReserveEquipmentFormProps> = ({
  equipment,
  onClose,
  filters,
}) => {
  const {
    state: { selectedDate, startHour, endHour, quantity, bookingTotal, isSubmitting },
    refs: { startHourRef, endHourRef },
    availableHours,
    handlers: { 
      handleDateSelect, 
      handleStartHourSelect, 
      setEndHour, 
      setQuantity, 
      handleSubmit,
      isDateDisabled 
    }
  } = useEquipmentBooking({ equipment, initialFilters: filters, onClose });
  
  // Create dummy dates for equipment availability hook
  const startTimeDate = selectedDate ? new Date(selectedDate) : null;
  const endTimeDate = selectedDate ? new Date(selectedDate) : null;
  
  // Use the equipment availability hook to get blocked hours
  const { blockedHours, loading } = useEquipmentAvailability(startTimeDate, endTimeDate);

  return (
    <Card className="w-full max-w-xl mx-auto">
      <CardHeader className="sticky top-0 z-10 bg-card border-b">
        <CardTitle className="text-2xl font-bold text-primary">
          Reservar {equipment.name}
        </CardTitle>
      </CardHeader>
      <ScrollArea className="h-[80vh] overflow-auto">
        <CardContent className="space-y-6 p-6">
          <EquipmentDateSelector 
            selectedDate={selectedDate}
            onDateSelect={handleDateSelect}
            isDateDisabled={isDateDisabled}
          />

          {loading && selectedDate && (
            <div className="text-center py-4">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
              <p className="mt-2 text-muted-foreground">Verificando disponibilidade...</p>
            </div>
          )}

          {selectedDate && !loading && availableHours.length > 0 && (
            <div className="space-y-4">
              <div ref={startHourRef} className="bg-card rounded-lg p-4 shadow-sm">
                <h3 className="text-lg font-medium mb-3">Horário de início</h3>
                <TimeSelector
                  hours={availableHours}
                  blockedHours={blockedHours || []}
                  selectedHour={startHour}
                  onSelectHour={handleStartHourSelect}
                />
              </div>

              {startHour && (
                <div ref={endHourRef} className="bg-card rounded-lg p-4 shadow-sm">
                  <h3 className="text-lg font-medium mb-3">Horário de término</h3>
                  <TimeSelector
                    hours={availableHours}
                    blockedHours={blockedHours || []}
                    selectedHour={endHour}
                    onSelectHour={setEndHour}
                    isEndTime
                    startHour={startHour}
                  />
                </div>
              )}

              {endHour && (
                <EquipmentQuantitySelector
                  quantity={quantity}
                  setQuantity={setQuantity}
                  maxQuantity={equipment.quantity}
                />
              )}
              
              {endHour && (
                <EquipmentBookingSummary bookingTotal={bookingTotal} />
              )}
            </div>
          )}

          {selectedDate && availableHours.length === 0 && (
            <div className="text-center py-6">
              <p className="text-red-500 font-medium">
                Nenhum horário disponível para este equipamento.
              </p>
            </div>
          )}

          <DialogFooter className="flex justify-end gap-3 pt-4 border-t">
            <Button
              variant="outline"
              onClick={onClose}
              className="w-32"
            >
              Cancelar
            </Button>
            {startHour && endHour && (
              <Button
                onClick={handleSubmit}
                disabled={!selectedDate || !startHour || !endHour || isSubmitting}
                className="w-32"
              >
                {isSubmitting ? "Reservando..." : "Confirmar"}
              </Button>
            )}
          </DialogFooter>
        </CardContent>
      </ScrollArea>
    </Card>
  );
};
