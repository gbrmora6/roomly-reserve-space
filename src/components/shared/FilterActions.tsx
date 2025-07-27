import React from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SlidersHorizontal, X, Filter, RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils";

interface FilterActionsProps {
  onFilter?: () => void;
  onClear?: () => void;
  isFilterDisabled?: boolean;
  isClearDisabled?: boolean;
  hasActiveFilters?: boolean;
  activeFilterCount?: number;
  className?: string;
  showFilterCount?: boolean;
}

export const FilterActions: React.FC<FilterActionsProps> = ({
  onFilter,
  onClear,
  isFilterDisabled = false,
  isClearDisabled = false,
  hasActiveFilters = false,
  activeFilterCount = 0,
  className,
  showFilterCount = true,
}) => {
  return (
    <div className={cn("flex flex-col sm:flex-row gap-3", className)}>
      <div className="flex gap-2 flex-1">
        {onFilter && (
          <Button
            onClick={onFilter}
            className="flex-1 h-11 bg-primary hover:bg-primary/90 text-primary-foreground shadow-soft hover:shadow-medium transition-all duration-200"
            disabled={isFilterDisabled}
          >
            <Filter className="mr-2 h-4 w-4" />
            Filtrar
          </Button>
        )}
        
        {onClear && hasActiveFilters && (
          <Button
            variant="outline"
            onClick={onClear}
            className="h-11 px-4 bg-white/80 border-secondary/40 text-secondary-foreground hover:bg-secondary/10 hover:border-secondary/60 transition-all duration-200"
            disabled={isClearDisabled}
          >
            <RotateCcw className="h-4 w-4" />
          </Button>
        )}
      </div>
      
      {showFilterCount && hasActiveFilters && (
        <div className="flex items-center">
          <Badge className="bg-accent/15 text-accent-foreground border-accent/30 px-3 py-1">
            <SlidersHorizontal className="mr-1 h-3 w-3" />
            {activeFilterCount} {activeFilterCount === 1 ? 'filtro' : 'filtros'}
          </Badge>
        </div>
      )}
    </div>
  );
};