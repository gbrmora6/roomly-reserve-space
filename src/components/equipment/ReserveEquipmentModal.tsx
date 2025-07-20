import React from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { ReserveEquipmentForm } from "@/components/equipment/ReserveEquipmentForm";
import { Database } from "@/integrations/supabase/types";

type Equipment = Database["public"]["Tables"]["equipment"]["Row"] & {
  equipment_photos?: { id: string; url: string }[];
  branches?: { id: string; name: string; city: string };
  available: number;
};

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
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto p-0" hideCloseButton>
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