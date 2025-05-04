
import React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { EquipmentList } from "@/components/equipment/EquipmentList";
import { LoadingEquipmentList } from "@/components/equipment/LoadingEquipmentList";
import { useEquipmentSelection } from "@/hooks/useEquipmentSelection";

interface EquipmentSelectionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  startTime: Date | null;
  endTime: Date | null;
  bookingId: string | null;
}

export function EquipmentSelectionDialog({
  open,
  onOpenChange,
  startTime,
  endTime,
  bookingId
}: EquipmentSelectionDialogProps) {
  const { 
    selectedEquipment, 
    availableEquipment, 
    loading, 
    handleEquipmentChange, 
    handleConfirm 
  } = useEquipmentSelection(startTime, endTime, bookingId);

  const handleConfirmAndClose = async () => {
    const success = await handleConfirm();
    if (success) {
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-primary">
            Selecionar Equipamentos
          </DialogTitle>
          <DialogDescription className="text-muted-foreground">
            Escolha os equipamentos para sua reserva de {startTime?.toLocaleTimeString()} até {endTime?.toLocaleTimeString()}
          </DialogDescription>
        </DialogHeader>
        
        <div className="grid gap-4 py-4">
          {loading ? (
            <LoadingEquipmentList />
          ) : (
            <EquipmentList
              equipments={availableEquipment}
              selectedEquipment={selectedEquipment}
              onEquipmentChange={handleEquipmentChange}
            />
          )}
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="w-32"
          >
            Cancelar
          </Button>
          <Button 
            onClick={handleConfirmAndClose}
            disabled={loading || Object.keys(selectedEquipment).length === 0}
            className="w-32"
          >
            Confirmar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
