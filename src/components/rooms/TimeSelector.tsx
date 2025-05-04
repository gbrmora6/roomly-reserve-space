import React from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface TimeSelectorProps {
  availableHours: string[];
  blockedHours: string[];
  selectedStartTime: string | null;
  selectedEndTime: string | null;
  onSelectStartTime: (time: string) => void;
  onSelectEndTime: (time: string) => void;
}

// Backwards compatibility props for components that haven't been updated yet
interface LegacyTimeSelectorProps {
  hours: string[];
  blockedHours: any[];
  selectedHour: string;
  onSelectHour: (hour: string) => void;
  isEndTime?: boolean;
  startHour?: string;
}

// Type guard to check which prop interface is being used
const isLegacyProps = (props: TimeSelectorProps | LegacyTimeSelectorProps): props is LegacyTimeSelectorProps => {
  return 'hours' in props;
};

export const TimeSelector: React.FC<TimeSelectorProps | LegacyTimeSelectorProps> = (props) => {
  // Handle legacy props for backward compatibility
  if (isLegacyProps(props)) {
    const { hours, blockedHours, selectedHour, onSelectHour, isEndTime, startHour } = props;
    
    if (isEndTime && startHour) {
      // This is equivalent to the end time selector with a selected start time
      const availableEndTimes = hours.filter(time => time > startHour);
      
      return (
        <div className="space-y-2">
          <p className="text-sm mb-2">Selecione o horário de término:</p>
          <div className="grid grid-cols-3 gap-2">
            {availableEndTimes.map((hour) => {
              const isBlocked = blockedHours?.includes(hour);
              
              return (
                <Button
                  key={hour}
                  variant={selectedHour === hour ? "default" : (isBlocked ? "destructive" : "outline")}
                  onClick={() => {
                    if (!isBlocked) {
                      onSelectHour(hour);
                    }
                  }}
                  disabled={isBlocked}
                  className={isBlocked ? "bg-red-500 hover:bg-red-600 text-white" : ""}
                >
                  {hour}
                </Button>
              );
            })}
          </div>
        </div>
      );
    }
    
    // This is equivalent to the start time selector
    return (
      <div className="space-y-2">
        <p className="text-sm mb-2">Selecione o horário de início:</p>
        <div className="grid grid-cols-3 gap-2">
          {hours.map((hour, index) => {
            const isBlocked = blockedHours?.includes(hour);
            // Don't allow selecting the last hour as a start time
            const isLastHour = index === hours.length - 1;
            
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
                className={cn(
                  (isBlocked || isLastHour) ? "bg-red-500 hover:bg-red-600 text-white" : ""
                )}
              >
                {hour}
              </Button>
            );
          })}
        </div>
      </div>
    );
  }
  
  // Original implementation with new props
  const { availableHours, blockedHours, selectedStartTime, selectedEndTime, onSelectStartTime, onSelectEndTime } = props;
  
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
                className={cn(
                  isBlocked ? "bg-red-500 hover:bg-red-600 text-white" : ""
                )}
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
              className={cn(
                (isBlocked || isLastHour) ? "bg-red-500 hover:bg-red-600 text-white" : ""
              )}
            >
              {hour}
            </Button>
          );
        })}
      </div>
    </div>
  );
};
