
import React, { useEffect } from "react";
import { Button } from "@/components/ui/button";
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
    blockedHours,
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
  const startTimeDate = selectedDate && startHour ? new Date(selectedDate) : null;
  const endTimeDate = selectedDate && endHour ? new Date(selectedDate) : null;
  
  if (startTimeDate && startHour) {
    const [hours, minutes] = startHour.split(":").map(Number);
    startTimeDate.setHours(hours, minutes, 0, 0);
  }
  
  if (endTimeDate && endHour) {
    const [hours, minutes] = endHour.split(":").map(Number);
    endTimeDate.setHours(hours, minutes, 0, 0);
  }
  
  // Auto scroll to start hour selection after date is selected
  useEffect(() => {
    if (selectedDate && startHourRef.current) {
      startHourRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [selectedDate]);

  // Auto scroll to end hour selection after start hour is selected
  useEffect(() => {
    if (startHour && endHourRef.current) {
      endHourRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [startHour]);

  return (
    <Card className="w-full max-w-xl mx-auto">
      <CardHeader className="sticky top-0 z-10 bg-card border-b">
        <CardTitle className="text-2xl font-bold text-primary">
          Reservar {equipment.name}
        </CardTitle>
      </CardHeader>
      <ScrollArea className="h-[70vh] max-h-[500px] overflow-auto">
        <CardContent className="space-y-6 p-6">
          <EquipmentDateSelector 
            selectedDate={selectedDate}
            onDateSelect={handleDateSelect}
            isDateDisabled={isDateDisabled}
          />

          {selectedDate && (
            <div className="space-y-4">
              <div ref={startHourRef} className="bg-card rounded-lg p-4 shadow-sm">
                <h3 className="text-lg font-medium mb-3">Horário de início</h3>
                {!availableHours.length ? (
                  <div className="text-center py-4">
                    <p className="text-red-500 font-medium">
                      Nenhum horário disponível para este equipamento.
                    </p>
                  </div>
                ) : (
                  <TimeSelector
                    hours={availableHours}
                    blockedHours={blockedHours}
                    selectedHour={startHour}
                    onSelectHour={handleStartHourSelect}
                  />
                )}
              </div>

              {startHour && (
                <div ref={endHourRef} className="bg-card rounded-lg p-4 shadow-sm">
                  <h3 className="text-lg font-medium mb-3">Horário de término</h3>
                  <TimeSelector
                    hours={availableHours}
                    blockedHours={blockedHours}
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
              
              {endHour && startTimeDate && endTimeDate && (
                <EquipmentBookingSummary 
                  equipment={equipment}
                  quantity={quantity}
                  startTime={startTimeDate}
                  endTime={endTimeDate}
                  totalPrice={bookingTotal}
                  onConfirm={handleSubmit}
                  loading={isSubmitting}
                  onCancel={onClose}
                />
              )}
            </div>
          )}
        </CardContent>
      </ScrollArea>
      <DialogFooter className="flex justify-end gap-3 p-4 border-t">
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
    </Card>
  );
};
