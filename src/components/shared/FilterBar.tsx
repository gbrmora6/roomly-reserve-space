import React from "react";
import { CalendarIcon, Clock, Search, X, SlidersHorizontal, MapPin } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CityFilter } from "@/components/shared/CityFilter";
import { cn } from "@/lib/utils";

interface FilterBarProps {
  searchTerm?: string;
  onSearchChange?: (value: string) => void;
  filters?: {
    date?: Date | null;
    startTime?: string | null;
    endTime?: string | null;
    city?: string | null;
    category?: string | null;
    priceRange?: [number, number] | null;
  };
  onFiltersChange?: (filters: any) => void;
  onFilter?: () => void;
  onClear?: () => void;
  showDateTimeFilters?: boolean;
  showLocationFilter?: boolean;
  showPriceFilter?: boolean;
  showCategoryFilter?: boolean;
  categories?: string[];
  placeholder?: string;
  className?: string;
}

const timeOptions = [
  "07:00", "08:00", "09:00", "10:00", "11:00", "12:00",
  "13:00", "14:00", "15:00", "16:00", "17:00", "18:00", "19:00", "20:00", "21:00", "22:00"
];

export const FilterBar: React.FC<FilterBarProps> = ({
  searchTerm = "",
  onSearchChange,
  filters = {},
  onFiltersChange,
  onFilter,
  onClear,
  showDateTimeFilters = false,
  showLocationFilter = false,
  showPriceFilter = false,
  showCategoryFilter = false,
  categories = [],
  placeholder = "Buscar...",
  className,
}) => {
  const hasActiveFilters = Boolean(
    filters.date || filters.startTime || filters.endTime || 
    filters.city || filters.category || filters.priceRange
  );

  const activeFilterCount = [
    filters.date,
    filters.startTime,
    filters.endTime,
    filters.city,
    filters.category,
    filters.priceRange,
  ].filter(Boolean).length;

  const updateFilter = (key: string, value: any) => {
    if (onFiltersChange) {
      onFiltersChange({ ...filters, [key]: value });
    }
  };

  const clearAllFilters = () => {
    if (onFiltersChange) {
      onFiltersChange({});
    }
    if (onClear) {
      onClear();
    }
  };

  return (
    <Card className={cn("mb-8 card-3d bg-white/90 backdrop-blur-sm border-primary/20 shadow-3d hover:shadow-3d-hover transition-all duration-300", className)}>
      <CardContent className="p-6">
        <div className="space-y-4">
          {/* Search bar */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={placeholder}
              value={searchTerm}
              onChange={(e) => onSearchChange?.(e.target.value)}
              className="pl-10 h-11 text-base bg-white/80 backdrop-blur-sm border-secondary/30 focus:border-primary/50 focus:shadow-soft focus:bg-white transition-all duration-200 placeholder:text-muted-foreground/70"
            />
          </div>

          {/* Filters grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4 items-end">
            {/* City filter */}
            {showLocationFilter && (
              <div className="space-y-2">
                <label className="text-sm font-medium flex items-center gap-2 text-primary">
                  <MapPin className="h-3 w-3" />
                  Cidade
                </label>
                <CityFilter
                  selectedCity={filters.city || "all"}
                  onCityChange={(value) => updateFilter('city', value === "all" ? null : value)}
                  placeholder="Todas as cidades"
                />
              </div>
            )}

            {/* Date filter */}
            {showDateTimeFilters && (
              <div className="space-y-2">
                <label className="text-sm font-medium text-primary">Data</label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal h-11 bg-white/80 border-secondary/40 hover:bg-secondary/10 hover:border-primary/50 transition-all duration-200",
                        !filters.date && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {filters.date ? (
                        format(filters.date, "dd/MM/yyyy", { locale: ptBR })
                      ) : (
                        <span>Selecionar data</span>
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={filters.date || undefined}
                      onSelect={(date) => updateFilter('date', date)}
                      disabled={(date) => date < new Date()}
                      initialFocus
                      className="pointer-events-auto"
                    />
                  </PopoverContent>
                </Popover>
              </div>
            )}

            {/* Start time filter */}
            {showDateTimeFilters && (
              <div className="space-y-2">
                <label className="text-sm font-medium text-primary">Início</label>
                <Select
                  value={filters.startTime || ""}
                  onValueChange={(value) => updateFilter('startTime', value || null)}
                >
                  <SelectTrigger className="h-11 bg-white/80 border-secondary/40 hover:border-primary/50 transition-all duration-200">
                    <Clock className="mr-2 h-4 w-4" />
                    <SelectValue placeholder="Horário" />
                  </SelectTrigger>
                  <SelectContent>
                    {timeOptions.map((time) => (
                      <SelectItem key={time} value={time}>
                        {time}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* End time filter */}
            {showDateTimeFilters && (
              <div className="space-y-2">
                <label className="text-sm font-medium text-primary">Fim</label>
                <Select
                  value={filters.endTime || ""}
                  onValueChange={(value) => updateFilter('endTime', value || null)}
                  disabled={!filters.startTime}
                >
                  <SelectTrigger className="h-11 bg-white/80 border-secondary/40 hover:border-primary/50 transition-all duration-200">
                    <Clock className="mr-2 h-4 w-4" />
                    <SelectValue placeholder="Horário" />
                  </SelectTrigger>
                  <SelectContent>
                    {timeOptions
                      .filter(time => !filters.startTime || time > filters.startTime)
                      .map((time) => (
                        <SelectItem key={time} value={time}>
                          {time}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Category filter */}
            {showCategoryFilter && categories.length > 0 && (
              <div className="space-y-2">
                <label className="text-sm font-medium text-primary">Categoria</label>
                <Select
                  value={filters.category || "all"}
                  onValueChange={(value) => updateFilter('category', value === "all" ? null : value)}
                >
                  <SelectTrigger className="h-11 bg-white/80 border-secondary/40 hover:border-primary/50 transition-all duration-200">
                    <SelectValue placeholder="Todas" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas</SelectItem>
                    {categories.map((category) => (
                      <SelectItem key={category} value={category}>
                        {category}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Action buttons */}
            <div className="flex gap-2 lg:col-span-2">
              <Button
                onClick={onFilter}
                className="flex-1 h-11 bg-primary hover:bg-primary/90 text-primary-foreground shadow-soft hover:shadow-medium transition-all duration-200"
                disabled={showDateTimeFilters && (!filters.date || !filters.startTime || !filters.endTime)}
              >
                <SlidersHorizontal className="mr-2 h-4 w-4" />
                Filtrar
              </Button>
              {hasActiveFilters && (
                <Button
                  variant="outline"
                  onClick={clearAllFilters}
                  className="h-11 px-3 bg-white/80 border-secondary/40 hover:bg-secondary/10 hover:border-secondary/60 transition-all duration-200"
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>

          {/* Active filters */}
          {hasActiveFilters && (
            <div className="flex flex-wrap gap-2 pt-2 border-t">
              <span className="text-sm text-muted-foreground flex items-center gap-1">
                <SlidersHorizontal className="h-3 w-3 text-primary" />
                Filtros ativos ({activeFilterCount}):
              </span>
              {filters.city && (
                <Badge className="bg-secondary/15 text-secondary-foreground border-secondary/40 gap-1 px-3 py-1">
                  {filters.city}
                  <X 
                    className="h-3 w-3 cursor-pointer hover:text-destructive transition-colors" 
                    onClick={() => updateFilter('city', null)}
                  />
                </Badge>
              )}
              {filters.date && (
                <Badge className="bg-accent/15 text-accent-foreground border-accent/40 gap-1 px-3 py-1">
                  {format(filters.date, "dd/MM/yyyy")}
                  <X 
                    className="h-3 w-3 cursor-pointer hover:text-destructive transition-colors" 
                    onClick={() => updateFilter('date', null)}
                  />
                </Badge>
              )}
              {filters.startTime && (
                <Badge className="bg-accent/15 text-accent-foreground border-accent/40 gap-1 px-3 py-1">
                  {filters.startTime}
                  <X 
                    className="h-3 w-3 cursor-pointer hover:text-destructive transition-colors" 
                    onClick={() => updateFilter('startTime', null)}
                  />
                </Badge>
              )}
              {filters.endTime && (
                <Badge className="bg-accent/15 text-accent-foreground border-accent/40 gap-1 px-3 py-1">
                  {filters.endTime}
                  <X 
                    className="h-3 w-3 cursor-pointer hover:text-destructive transition-colors" 
                    onClick={() => updateFilter('endTime', null)}
                  />
                </Badge>
              )}
              {filters.category && (
                <Badge className="bg-accent/15 text-accent-foreground border-accent/40 gap-1 px-3 py-1">
                  {filters.category}
                  <X 
                    className="h-3 w-3 cursor-pointer hover:text-destructive transition-colors" 
                    onClick={() => updateFilter('category', null)}
                  />
                </Badge>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};