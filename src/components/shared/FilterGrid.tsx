import React from "react";
import { cn } from "@/lib/utils";

interface FilterGridProps {
  children: React.ReactNode;
  className?: string;
  columns?: 1 | 2 | 3 | 4 | 5 | 6;
}

export const FilterGrid: React.FC<FilterGridProps> = ({
  children,
  className,
  columns = 4,
}) => {
  const gridCols = {
    1: "grid-cols-1",
    2: "grid-cols-1 sm:grid-cols-2",
    3: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3", 
    4: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-4",
    5: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-5",
    6: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-6",
  };

  return (
    <div className={cn(
      "grid gap-4 items-end",
      gridCols[columns],
      className
    )}>
      {children}
    </div>
  );
};