import React from "react";
import { ItemCard } from "./ItemCard";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { 
  Search, 
  Package, 
  RefreshCw, 
  Grid3X3, 
  List,
  SortAsc,
  SortDesc
} from "lucide-react";
import { cn } from "@/lib/utils";

interface ListingGridProps {
  items?: Array<{
    id: string;
    title: string;
    description?: string | null;
    price?: number;
    priceLabel?: string;
    image?: string;
    status?: 'available' | 'unavailable' | 'limited' | 'active' | 'inactive';
    location?: string;
    features?: Array<{
      icon: React.ComponentType<{ className?: string }>;
      label: string;
      available: boolean;
    }>;
    stats?: Array<{
      icon: React.ComponentType<{ className?: string }>;
      label: string;
      value: string | number;
    }>;
    rating?: number;
    reviewCount?: number;
  }>;
  isLoading?: boolean;
  error?: Error | null;
  onItemAction?: (id: string) => void;
  actionLabel?: string;
  emptyTitle?: string;
  emptyDescription?: string;
  emptyIcon?: React.ComponentType<{ className?: string }>;
  variant?: 'room' | 'equipment' | 'product';
  viewMode?: 'grid' | 'list';
  onViewModeChange?: (mode: 'grid' | 'list') => void;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  onSortChange?: (sortBy: string, order: 'asc' | 'desc') => void;
  showFiltersMessage?: boolean;
  filtersMessage?: string;
  resultCount?: number;
  className?: string;
}

export const ListingGrid: React.FC<ListingGridProps> = ({
  items = [],
  isLoading = false,
  error,
  onItemAction,
  actionLabel = "Ver Detalhes",
  emptyTitle = "Nenhum item encontrado",
  emptyDescription = "Tente ajustar os filtros ou volte mais tarde",
  emptyIcon: EmptyIcon = Package,
  variant = 'room',
  viewMode = 'grid',
  onViewModeChange,
  sortBy,
  sortOrder = 'asc',
  onSortChange,
  showFiltersMessage = false,
  filtersMessage = "Selecione filtros para ver os resultados",
  resultCount,
  className,
}) => {
  // Loading state
  if (isLoading) {
    return (
      <div className={cn("space-y-4 md:space-y-6", className)}>
        {/* Loading header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
          <Skeleton className="h-5 w-32 sm:h-6 sm:w-48" />
          <div className="flex gap-2">
            <Skeleton className="h-8 w-16 sm:h-10 sm:w-24" />
            <Skeleton className="h-8 w-8 sm:h-10 sm:w-10" />
            <Skeleton className="h-8 w-8 sm:h-10 sm:w-10" />
          </div>
        </div>
        
        {/* Loading grid */}
        <div className={cn(
          "grid gap-4 md:gap-6",
          variant === 'product'
            ? "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
            : "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3"
        )}>
          {[...Array(8)].map((_, i) => (
            <ItemCard key={i} id={`loading-${i}`} title="" isLoading />
          ))}
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="text-center py-12 md:py-20 px-4">
        <div className="mx-auto w-12 h-12 md:w-16 md:h-16 bg-red-100 rounded-full flex items-center justify-center mb-3 md:mb-4">
          <RefreshCw className="h-6 w-6 md:h-8 md:w-8 text-red-600" />
        </div>
        <h3 className="text-base md:text-lg font-semibold text-red-900 mb-2">
          Erro ao carregar
        </h3>
        <p className="text-sm md:text-base text-red-600 mb-4">
          {error.message || "Ocorreu um erro inesperado"}
        </p>
        <Button onClick={() => window.location.reload()} size="sm" className="md:size-default">
          <RefreshCw className="mr-2 h-3 w-3 md:h-4 md:w-4" />
          Tentar Novamente
        </Button>
      </div>
    );
  }

  // Filters message state
  if (showFiltersMessage) {
    return (
      <div className="text-center py-12 md:py-20 px-4">
        <div className="mx-auto w-12 h-12 md:w-16 md:h-16 bg-primary/10 rounded-full flex items-center justify-center mb-3 md:mb-4">
          <Search className="h-6 w-6 md:h-8 md:w-8 text-primary" />
        </div>
        <h3 className="text-base md:text-lg font-semibold mb-2">
          {filtersMessage}
        </h3>
        <p className="text-sm md:text-base text-muted-foreground">
          Use os filtros acima para encontrar exatamente o que você precisa
        </p>
      </div>
    );
  }

  // Empty state
  if (items.length === 0) {
    return (
      <div className="text-center py-12 md:py-20 px-4">
        <div className="mx-auto w-12 h-12 md:w-16 md:h-16 bg-muted rounded-full flex items-center justify-center mb-3 md:mb-4">
          <EmptyIcon className="h-6 w-6 md:h-8 md:w-8 text-muted-foreground" />
        </div>
        <h3 className="text-base md:text-lg font-semibold mb-2">
          {emptyTitle}
        </h3>
        <p className="text-sm md:text-base text-muted-foreground">
          {emptyDescription}
        </p>
      </div>
    );
  }

  return (
    <div className={cn("space-y-4 md:space-y-6", className)}>
      {/* Header with controls */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 md:gap-4">
        <div className="flex items-center gap-2">
          <span className="text-xs sm:text-sm text-muted-foreground">
            {resultCount !== undefined ? `${resultCount} resultados` : `${items.length} itens`}
          </span>
        </div>

        <div className="flex items-center gap-1 md:gap-2 overflow-x-auto">
          {/* Sort controls */}
          {onSortChange && (
            <div className="flex items-center gap-1 flex-shrink-0">
              <Button
                variant="outline"
                size="sm"
                onClick={() => onSortChange('name', sortOrder === 'asc' ? 'desc' : 'asc')}
                className="gap-1 text-xs md:text-sm px-2 md:px-3"
              >
                {sortOrder === 'asc' ? <SortAsc className="h-3 w-3" /> : <SortDesc className="h-3 w-3" />}
                <span className="hidden sm:inline">Nome</span>
              </Button>
              {variant !== 'equipment' && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onSortChange('price', sortOrder === 'asc' ? 'desc' : 'asc')}
                  className="gap-1 text-xs md:text-sm px-2 md:px-3"
                >
                  {sortOrder === 'asc' ? <SortAsc className="h-3 w-3" /> : <SortDesc className="h-3 w-3" />}
                  <span className="hidden sm:inline">Preço</span>
                </Button>
              )}
            </div>
          )}

          {/* View mode toggle */}
          {onViewModeChange && (
            <div className="flex rounded-lg border flex-shrink-0">
              <Button
                variant={viewMode === 'grid' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => onViewModeChange('grid')}
                className="rounded-r-none px-2 md:px-3"
              >
                <Grid3X3 className="h-3 w-3 md:h-4 md:w-4" />
              </Button>
              <Button
                variant={viewMode === 'list' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => onViewModeChange('list')}
                className="rounded-l-none px-2 md:px-3"
              >
                <List className="h-3 w-3 md:h-4 md:w-4" />
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Items grid */}
      <div className={cn(
        "grid gap-4 md:gap-6",
        viewMode === 'grid' 
          ? variant === 'product'
            ? "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
            : "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3"
          : "grid-cols-1"
      )}>
        {items.map((item) => (
          <ItemCard
            key={item.id}
            {...item}
            variant={variant}
            onAction={() => onItemAction?.(item.id)}
            actionLabel={actionLabel}
            className={viewMode === 'list' ? "md:flex md:flex-row md:items-center" : undefined}
          />
        ))}
      </div>
    </div>
  );
};