import React from "react";
import { Button } from "@/components/ui/button";

interface TimeSelectorProps {
  availableHours: string[];
  blockedHours: string[];
  selectedStartTime: string | null;
  selectedEndTime: string | null;
  onSelectStartTime: (time: string) => void;
  onSelectEndTime: (time: string) => void;
}

export const TimeSelector: React.FC<TimeSelectorProps> = ({
  availableHours,
  blockedHours,
  selectedStartTime,
  selectedEndTime,
  onSelectStartTime,
  onSelectEndTime
}) => {
  // If we have selected a start time, show available end times
  if (selectedStartTime) {
    const availableEndTimes = availableHours.filter(time => time > selectedStartTime);
    
    return (
      <div className="space-y-2">
        <p className="font-medium text-sm">Horário de início selecionado: <span className="font-bold">{selectedStartTime}</span></p>
        <p className="text-sm mb-2">Selecione o horário de término:</p>
        
        <div className="grid grid-cols-3 gap-2">
          {availableEndTimes.map((hour) => {
            const isBlocked = blockedHours.includes(hour);
            
            return (
              <Button
                key={hour}
                variant={selectedEndTime === hour ? "default" : (isBlocked ? "destructive" : "outline")}
                onClick={() => {
                  if (!isBlocked) {
                    onSelectEndTime(hour);
                  }
                }}
                disabled={isBlocked}
              >
                {hour}
              </Button>
            );
          })}
        </div>
      </div>
    );
  }
  
  // Otherwise show available start times
  return (
    <div className="space-y-2">
      <p className="text-sm mb-2">Selecione o horário de início:</p>
      <div className="grid grid-cols-3 gap-2">
        {availableHours.map((hour, index) => {
          const isBlocked = blockedHours.includes(hour);
          // Don't allow selecting the last hour as a start time
          const isLastHour = index === availableHours.length - 1;
          
          return (
            <Button
              key={hour}
              variant={selectedStartTime === hour ? "default" : (isBlocked || isLastHour) ? "destructive" : "outline"}
              onClick={() => {
                if (!isBlocked && !isLastHour) {
                  onSelectStartTime(hour);
                }
              }}
              disabled={isBlocked || isLastHour}
            >
              {hour}
            </Button>
          );
        })}
      </div>
    </div>
  );
};
