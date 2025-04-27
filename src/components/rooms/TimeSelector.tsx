
import React from "react";
import { Button } from "@/components/ui/button";

interface TimeSelectorProps {
  hours: string[];
  blockedHours: string[];
  selectedHour: string;
  onSelectHour: (hour: string) => void;
  isEndTime?: boolean;
  startHour?: string;
}

export const TimeSelector: React.FC<TimeSelectorProps> = ({
  hours,
  blockedHours,
  selectedHour,
  onSelectHour,
  isEndTime,
  startHour,
}) => {
  const filteredHours = isEndTime
    ? hours.filter((hour) => hour > (startHour || ""))
    : hours;

  return (
    <div className="grid grid-cols-3 gap-2 mb-6">
      {filteredHours.map((hour) => {
        const isBlocked = blockedHours.includes(hour);
        const isLastHour = !isEndTime && hour === hours[hours.length - 1];

        return (
          <Button
            key={hour}
            variant={selectedHour === hour ? "default" : (isBlocked || isLastHour) ? "destructive" : "outline"}
            onClick={() => {
              if (!isBlocked && !isLastHour) {
                onSelectHour(hour);
              }
            }}
            disabled={isBlocked || isLastHour}
          >
            {hour}
          </Button>
        );
      })}
    </div>
  );
};
