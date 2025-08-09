import React from "react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import ReserveRoomForm from "@/components/rooms/ReserveRoomForm";
import { Room } from "@/types/room";

interface ReserveRoomModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  selectedRoom: Room | null;
}

export const ReserveRoomModal: React.FC<ReserveRoomModalProps> = ({
  isOpen,
  onOpenChange,
  selectedRoom,
}) => {
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto p-0" hideCloseButton>
        <DialogTitle className="sr-only">
          Reservar {selectedRoom?.name || 'Sala'}
        </DialogTitle>
        {selectedRoom && (
          <ReserveRoomForm
            room={selectedRoom}
            onClose={() => onOpenChange(false)}
          />
        )}
      </DialogContent>
    </Dialog>
  );
};