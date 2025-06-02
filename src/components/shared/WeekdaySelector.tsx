
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
}

export function WeekdaySelector({ selectedDays, onChange }: WeekdaySelectorProps) {
  const toggleDay = (day: string) => {
    if (selectedDays.includes(day)) {
      onChange(selectedDays.filter(d => d !== day));
    } else {
      onChange([...selectedDays, day]);
    }
  };

  return (
    <div className="flex flex-wrap gap-2">
      {WEEKDAYS.map((day) => (
        <Button
          key={day.value}
          type="button"
          variant={selectedDays.includes(day.value) ? "default" : "outline"}
          onClick={() => toggleDay(day.value)}
          className="w-14"
        >
          {day.label}
        </Button>
      ))}
    </div>
  );
}
