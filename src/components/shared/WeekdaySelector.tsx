
import React from "react";
import { Button } from "@/components/ui/button";

const WEEKDAYS = [
  { value: "monday", label: "Seg" },
  { value: "tuesday", label: "Ter" },
  { value: "wednesday", label: "Qua" },
  { value: "thursday", label: "Qui" },
  { value: "friday", label: "Sex" },
  { value: "saturday", label: "Sáb" },
  { value: "sunday", label: "Dom" },
];

interface WeekdaySelectorProps {
  selectedDays: string[];
  onChange: (days: string[]) => void;
  value?: string[];
}

export function WeekdaySelector({ selectedDays, onChange, value }: WeekdaySelectorProps) {
  // Use value prop if provided, otherwise use selectedDays
  const activeDays = value || selectedDays;
  
  const toggleDay = (day: string) => {
    if (activeDays.includes(day)) {
      onChange(activeDays.filter(d => d !== day));
    } else {
      onChange([...activeDays, day]);
    }
  };

  return (
    <div className="flex flex-wrap gap-2">
      {WEEKDAYS.map((day) => (
        <Button
          key={day.value}
          type="button"
          variant={activeDays.includes(day.value) ? "default" : "outline"}
          onClick={() => toggleDay(day.value)}
          className="w-14"
        >
          {day.label}
        </Button>
      ))}
    </div>
  );
}
