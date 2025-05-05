
import React from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { ReserveEquipmentForm } from "@/components/equipment/ReserveEquipmentForm";
import { Database } from "@/integrations/supabase/types";

// Updated Equipment interface to use the correct open_days type
interface Equipment {
  id: string;
  name: string;
  description: string | null;
  quantity: number;
  price_per_hour: number;
  available: number;
  open_time?: string;
  close_time?: string;
  open_days?: Database["public"]["Enums"]["weekday"][];
}

interface FilterState {
  date: Date | null;
  startTime: string | null;
  endTime: string | null;
}

interface ReserveEquipmentModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  selectedEquipment: Equipment | null;
  filters: FilterState;
}

export const ReserveEquipmentModal: React.FC<ReserveEquipmentModalProps> = ({
  isOpen,
  onOpenChange,
  selectedEquipment,
  filters,
}) => {
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md p-0" hideCloseButton>
        {selectedEquipment && (
          <ReserveEquipmentForm
            equipment={selectedEquipment}
            onClose={() => onOpenChange(false)}
            filters={filters}
          />
        )}
      </DialogContent>
    </Dialog>
  );
};
