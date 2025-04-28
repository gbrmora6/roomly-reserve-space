
import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useEquipmentAvailability } from "@/hooks/useEquipmentAvailability";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Check, X } from "lucide-react";
import { formatCurrency } from "@/utils/formatCurrency";

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
  const [selectedEquipment, setSelectedEquipment] = useState<Record<string, number>>({});
  const { availableEquipment, loading } = useEquipmentAvailability(startTime, endTime);
  const { toast } = useToast();
  
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
    if (Object.keys(selectedEquipment).length === 0) return;

    try {
      const user = (await supabase.auth.getUser()).data.user;
      if (!user) throw new Error("User not authenticated");

      // Convert times to UTC-3
      const utcStartTime = new Date(startTime!.getTime() - (3 * 60 * 60 * 1000));
      const utcEndTime = new Date(endTime!.getTime() - (3 * 60 * 60 * 1000));

      const equipmentToAdd = Object.entries(selectedEquipment).map(([id, quantity]) => ({
        equipment_id: id,
        booking_id: bookingId,
        user_id: user.id,
        quantity,
        start_time: utcStartTime.toISOString(),
        end_time: utcEndTime.toISOString(),
        status: 'pending'
      }));

      const { error } = await supabase
        .from('booking_equipment')
        .insert(equipmentToAdd);

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: "Equipamentos reservados com sucesso!"
      });
      onOpenChange(false);
    } catch (error) {
      console.error("Erro ao reservar equipamentos:", error);
      toast({
        title: "Erro",
        description: "Não foi possível reservar os equipamentos.",
        variant: "destructive"
      });
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
        
        {loading ? (
          <div className="py-8 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
            <p className="mt-2 text-muted-foreground">Carregando equipamentos...</p>
          </div>
        ) : (
          <div className="grid gap-4 py-4">
            {availableEquipment.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {availableEquipment.map((equipment) => {
                  const isAvailable = equipment.available > 0;
                  return (
                    <Card
                      key={equipment.id}
                      className={`p-4 transition-all duration-200 ${
                        !isAvailable ? 'opacity-60 bg-muted' : 'hover:border-primary'
                      }`}
                    >
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <h4 className="font-medium text-lg">{equipment.name}</h4>
                          <p className="text-sm text-muted-foreground">
                            {formatCurrency(equipment.price_per_hour)}/hora
                          </p>
                          {equipment.description && (
                            <p className="text-sm text-muted-foreground mt-1">{equipment.description}</p>
                          )}
                        </div>
                        {isAvailable ? (
                          <Check className="text-green-500 h-5 w-5" />
                        ) : (
                          <X className="text-red-500 h-5 w-5" />
                        )}
                      </div>
                      
                      <div className="flex justify-between items-center">
                        <p className={`text-sm font-medium ${!isAvailable ? 'text-red-500' : 'text-green-600'}`}>
                          {isAvailable 
                            ? `${equipment.available} disponível${equipment.available > 1 ? 's' : ''}` 
                            : "Indisponível"}
                        </p>
                        
                        {isAvailable && (
                          <div className="flex items-center gap-2 bg-muted rounded-lg p-1">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleEquipmentChange(
                                equipment.id,
                                Math.max(0, (selectedEquipment[equipment.id] || 0) - 1)
                              )}
                              disabled={!selectedEquipment[equipment.id]}
                              className="h-8 w-8"
                            >
                              -
                            </Button>
                            <span className="w-8 text-center font-medium">
                              {selectedEquipment[equipment.id] || 0}
                            </span>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleEquipmentChange(
                                equipment.id,
                                Math.min(equipment.available, (selectedEquipment[equipment.id] || 0) + 1)
                              )}
                              disabled={(selectedEquipment[equipment.id] || 0) >= equipment.available}
                              className="h-8 w-8"
                            >
                              +
                            </Button>
                          </div>
                        )}
                      </div>
                    </Card>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-muted-foreground">
                  Nenhum equipamento disponível para este horário.
                </p>
              </div>
            )}
          </div>
        )}

        <div className="flex justify-end gap-3 pt-4 border-t">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="w-32"
          >
            Cancelar
          </Button>
          <Button 
            onClick={handleConfirm}
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
