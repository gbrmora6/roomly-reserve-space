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
      <div className={cn("space-y-6", className)}>
        {/* Loading header */}
        <div className="flex items-center justify-between">
          <Skeleton className="h-6 w-48" />
          <div className="flex gap-2">
            <Skeleton className="h-10 w-24" />
            <Skeleton className="h-10 w-10" />
            <Skeleton className="h-10 w-10" />
          </div>
        </div>
        
        {/* Loading grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
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
      <div className="text-center py-20">
        <div className="mx-auto w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
          <RefreshCw className="h-8 w-8 text-red-600" />
        </div>
        <h3 className="text-lg font-semibold text-red-900 mb-2">
          Erro ao carregar
        </h3>
        <p className="text-red-600 mb-4">
          {error.message || "Ocorreu um erro inesperado"}
        </p>
        <Button onClick={() => window.location.reload()}>
          <RefreshCw className="mr-2 h-4 w-4" />
          Tentar Novamente
        </Button>
      </div>
    );
  }

  // Filters message state
  if (showFiltersMessage) {
    return (
      <div className="text-center py-20">
        <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4">
          <Search className="h-8 w-8 text-primary" />
        </div>
        <h3 className="text-lg font-semibold mb-2">
          {filtersMessage}
        </h3>
        <p className="text-muted-foreground">
          Use os filtros acima para encontrar exatamente o que você precisa
        </p>
      </div>
    );
  }

  // Empty state
  if (items.length === 0) {
    return (
      <div className="text-center py-20">
        <div className="mx-auto w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4">
          <EmptyIcon className="h-8 w-8 text-muted-foreground" />
        </div>
        <h3 className="text-lg font-semibold mb-2">
          {emptyTitle}
        </h3>
        <p className="text-muted-foreground">
          {emptyDescription}
        </p>
      </div>
    );
  }

  return (
    <div className={cn("space-y-6", className)}>
      {/* Header with controls */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">
            {resultCount !== undefined ? `${resultCount} resultados` : `${items.length} itens`}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* Sort controls */}
          {onSortChange && (
            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="sm"
                onClick={() => onSortChange('name', sortOrder === 'asc' ? 'desc' : 'asc')}
                className="gap-1"
              >
                {sortOrder === 'asc' ? <SortAsc className="h-3 w-3" /> : <SortDesc className="h-3 w-3" />}
                Nome
              </Button>
              {variant !== 'equipment' && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onSortChange('price', sortOrder === 'asc' ? 'desc' : 'asc')}
                  className="gap-1"
                >
                  {sortOrder === 'asc' ? <SortAsc className="h-3 w-3" /> : <SortDesc className="h-3 w-3" />}
                  Preço
                </Button>
              )}
            </div>
          )}

          {/* View mode toggle */}
          {onViewModeChange && (
            <div className="flex rounded-lg border">
              <Button
                variant={viewMode === 'grid' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => onViewModeChange('grid')}
                className="rounded-r-none"
              >
                <Grid3X3 className="h-4 w-4" />
              </Button>
              <Button
                variant={viewMode === 'list' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => onViewModeChange('list')}
                className="rounded-l-none"
              >
                <List className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Items grid */}
      <div className={cn(
        "grid gap-6",
        viewMode === 'grid' 
          ? "grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
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