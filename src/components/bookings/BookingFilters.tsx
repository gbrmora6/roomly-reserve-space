
import React from "react";
import { Button } from "@/components/ui/button";
import { Database } from "@/integrations/supabase/types";

type BookingStatus = Database["public"]["Enums"]["booking_status"];

interface BookingFiltersProps {
  filter: BookingStatus | "all";
  onFilterChange: (filter: BookingStatus | "all") => void;
}

export const BookingFilters = ({ filter, onFilterChange }: BookingFiltersProps) => {
  return (
    <div className="flex gap-2 mb-4">
      {(["all", "pending", "confirmed", "cancelled"] as const).map((status) => (
        <Button
          key={status}
          variant={filter === status ? "default" : "outline"}
          onClick={() => onFilterChange(status)}
        >
          {status === "all" && "Todas"}
          {status === "pending" && "Pendentes"}
          {status === "confirmed" && "Confirmadas"}
          {status === "cancelled" && "Canceladas"}
        </Button>
      ))}
    </div>
  );
};
