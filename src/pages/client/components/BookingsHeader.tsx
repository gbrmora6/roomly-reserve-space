
import React from "react";
import { MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";

interface BookingsHeaderProps {
  onShowAddress: () => void;
}

export const BookingsHeader = ({ onShowAddress }: BookingsHeaderProps) => {
  return (
    <div className="flex justify-between items-center mb-6">
      <h1 className="text-2xl font-bold">Minhas Reservas</h1>
      <Button 
        onClick={onShowAddress} 
        variant="outline" 
        size="lg" 
        className="bg-primary/10 hover:bg-primary/20 border-primary/30"
      >
        <MapPin className="mr-2 h-5 w-5" />
        Ver Endereço
      </Button>
    </div>
  );
};
