import React from "react";
import { MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";

interface BookingsHeaderProps {
  onShowAddress: () => void;
  title?: string;
}

export const BookingsHeader = ({ onShowAddress, title = "Minhas Reservas" }: BookingsHeaderProps) => {
  return (
    <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6 gap-4">
      <h1 className="text-2xl font-bold text-roomly-800">
        {title}
      </h1>
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
