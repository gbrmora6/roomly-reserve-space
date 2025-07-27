import React from "react";
import { cn } from "@/lib/utils";

interface FilterFieldProps {
  label: string;
  children: React.ReactNode;
  className?: string;
  required?: boolean;
  icon?: React.ReactNode;
}

export const FilterField: React.FC<FilterFieldProps> = ({
  label,
  children,
  className,
  required = false,
  icon,
}) => {
  return (
    <div className={cn("space-y-2", className)}>
      <label className="flex items-center gap-2 text-sm font-medium text-foreground">
        {icon}
        {label}
        {required && <span className="text-destructive">*</span>}
      </label>
      {children}
    </div>
  );
};