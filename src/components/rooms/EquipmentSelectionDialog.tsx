
import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useEquipmentAvailability } from "@/hooks/useEquipmentAvailability";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

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
  const { availableEquipment, loading } = useEquipmentAvailability(startTime, endTime);
  const [selectedEquipment, setSelectedEquipment] = useState<Record<string, number>>({});
  const { toast } = useToast();
  
  // Reset selected equipment when dialog opens or changes in available equipment
  useEffect(() => {
    setSelectedEquipment({});
  }, [open, availableEquipment]);

  const handleEquipmentChange = (equipmentId: string, quantity: number) => {
    if (quantity === 0) {
      const newSelected = { ...selectedEquipment };
      delete newSelected[equipmentId];
      setSelectedEquipment(newSelected);
    } else {
      setSelectedEquipment({ ...selectedEquipment, [equipmentId]: quantity });
    }
  };

  const handleConfirm = async () => {
    if (!bookingId || Object.keys(selectedEquipment).length === 0) return;

    const equipmentToAdd = Object.entries(selectedEquipment).map(([id, quantity]) => ({
      booking_id: bookingId,
      equipment_id: id,
      quantity
    }));

    console.log("Adding equipment to booking:", equipmentToAdd);

    const { error } = await supabase
      .from('booking_equipment')
      .insert(equipmentToAdd);

    if (error) {
      console.error("Error adding equipment to booking:", error);
      toast({
        title: "Erro",
        description: "Não foi possível reservar os equipamentos.",
        variant: "destructive"
      });
      return;
    }

    toast({
      title: "Sucesso",
      description: "Equipamentos reservados com sucesso!"
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Selecionar Equipamentos</DialogTitle>
          <DialogDescription>
            Escolha os equipamentos para sua reserva de {startTime?.toLocaleTimeString()} até {endTime?.toLocaleTimeString()}
          </DialogDescription>
        </DialogHeader>
        
        {loading ? (
          <div className="py-4 text-center">Carregando equipamentos...</div>
        ) : (
          <div className="grid gap-4 py-4">
            {availableEquipment.length > 0 ? (
              availableEquipment.map((equipment) => (
                <div 
                  key={equipment.id} 
                  className={`flex items-center justify-between gap-4 p-4 border rounded-lg ${equipment.available === 0 ? 'opacity-70 bg-gray-50' : ''}`}
                >
                  <div>
                    <h4 className="font-medium">{equipment.name}</h4>
                    {equipment.description && (
                      <p className="text-sm text-muted-foreground">{equipment.description}</p>
                    )}
                    <p className={`text-sm ${equipment.available === 0 ? 'text-red-500 font-medium' : ''}`}>
                      Disponíveis: {equipment.available}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEquipmentChange(
                        equipment.id,
                        Math.max(0, (selectedEquipment[equipment.id] || 0) - 1)
                      )}
                      disabled={equipment.available === 0 || !selectedEquipment[equipment.id]}
                    >
                      -
                    </Button>
                    <span className="w-8 text-center">{selectedEquipment[equipment.id] || 0}</span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEquipmentChange(
                        equipment.id,
                        Math.min(equipment.available, (selectedEquipment[equipment.id] || 0) + 1)
                      )}
                      disabled={equipment.available === 0 || selectedEquipment[equipment.id] === equipment.available}
                    >
                      +
                    </Button>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-4 text-muted-foreground">
                Nenhum equipamento disponível para este horário.
              </div>
            )}
          </div>
        )}

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button 
            onClick={handleConfirm}
            disabled={loading || Object.keys(selectedEquipment).length === 0}
          >
            Confirmar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
