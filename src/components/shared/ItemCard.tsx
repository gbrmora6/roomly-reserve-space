import React from "react";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { 
  MapPin, 
  Clock, 
  Users, 
  Wifi, 
  Monitor, 
  Coffee, 
  Car, 
  Eye, 
  Heart,
  Star,
  ShoppingBag
} from "lucide-react";
import { formatCurrency } from "@/utils/formatCurrency";
import { cn } from "@/lib/utils";

interface ItemCardProps {
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
  onAction?: () => void;
  actionLabel?: string;
  onSecondaryAction?: () => void;
  secondaryActionLabel?: string;
  className?: string;
  variant?: 'room' | 'equipment' | 'product';
  isLoading?: boolean;
}

const statusConfig = {
  available: { label: "Disponível", className: "bg-green-100 text-green-800 border-green-200" },
  unavailable: { label: "Indisponível", className: "bg-red-100 text-red-800 border-red-200" },
  limited: { label: "Limitado", className: "bg-yellow-100 text-yellow-800 border-yellow-200" },
  active: { label: "Ativo", className: "bg-green-100 text-green-800 border-green-200" },
  inactive: { label: "Inativo", className: "bg-gray-100 text-gray-800 border-gray-200" },
};

export const ItemCard: React.FC<ItemCardProps> = ({
  id,
  title,
  description,
  price,
  priceLabel = "por hora",
  image,
  status,
  location,
  features = [],
  stats = [],
  rating,
  reviewCount,
  onAction,
  actionLabel = "Ver Detalhes",
  onSecondaryAction,
  secondaryActionLabel,
  className,
  variant = 'room',
  isLoading = false,
}) => {
  if (isLoading) {
    return (
      <Card className={cn("overflow-hidden animate-pulse", className)}>
        <div className="h-48 bg-muted" />
        <CardHeader className="space-y-2">
          <div className="h-6 bg-muted rounded" />
          <div className="h-4 bg-muted rounded w-3/4" />
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="h-4 bg-muted rounded" />
          <div className="h-4 bg-muted rounded w-1/2" />
        </CardContent>
        <CardFooter>
          <div className="h-10 bg-muted rounded w-full" />
        </CardFooter>
      </Card>
    );
  }

  return (
    <Card className={cn(
      "group card-3d overflow-hidden border-border/30 bg-card/70 backdrop-blur-xl glass-intense transform-gpu perspective-1000",
      className
    )}>
      {/* Image */}
      <div className="relative h-48 overflow-hidden">
        {image ? (
          <img
            src={image}
            alt={title}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-muted to-muted/50 flex items-center justify-center">
            {variant === 'room' && <Monitor className="h-16 w-16 text-muted-foreground/50" />}
            {variant === 'equipment' && <Coffee className="h-16 w-16 text-muted-foreground/50" />}
            {variant === 'product' && <ShoppingBag className="h-16 w-16 text-muted-foreground/50" />}
          </div>
        )}
        
        {/* Status badge */}
        {status && (
          <Badge 
            className={cn(
              "absolute top-3 right-3 border backdrop-blur-sm shadow-medium",
              status === 'available' && "bg-green-500/20 text-green-400 border-green-400/40",
              status === 'unavailable' && "bg-destructive/20 text-destructive border-destructive/40",
              status === 'limited' && "bg-yellow-500/20 text-yellow-400 border-yellow-400/40",
              status === 'active' && "bg-green-500/20 text-green-400 border-green-400/40",
              status === 'inactive' && "bg-muted/20 text-muted-foreground border-muted/40"
            )}
          >
            {statusConfig[status].label}
          </Badge>
        )}

        {/* Favorite button */}
        {onSecondaryAction && (
          <Button
            variant="ghost"
            size="icon"
            className="absolute top-3 left-3 bg-background/80 backdrop-blur-sm hover:bg-background/90"
            onClick={(e) => {
              e.stopPropagation();
              onSecondaryAction();
            }}
          >
            <Heart className="h-4 w-4" />
          </Button>
        )}

        {/* Price overlay */}
        {price && (
          <div className="absolute bottom-3 left-3 glass-intense rounded-xl px-4 py-2 shadow-soft border border-primary/20">
            <div className="text-lg font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              {formatCurrency(price)}
            </div>
            <div className="text-xs text-muted-foreground font-medium">
              {priceLabel}
            </div>
          </div>
        )}
      </div>

      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-bold text-lg leading-tight line-clamp-2 group-hover:text-primary transition-all duration-300">
            {title}
          </h3>
        </div>
        
        {rating && (
          <div className="flex items-center gap-1">
            <div className="flex items-center">
              {[...Array(5)].map((_, i) => (
                <Star
                  key={i}
                  className={cn(
                    "h-3 w-3",
                    i < Math.floor(rating) ? "fill-yellow-400 text-yellow-400" : "text-gray-300"
                  )}
                />
              ))}
            </div>
            <span className="text-sm text-muted-foreground">
              ({reviewCount || 0})
            </span>
          </div>
        )}

        {location && (
          <div className="flex items-center gap-1 text-sm text-muted-foreground">
            <MapPin className="h-3 w-3" />
            {location}
          </div>
        )}
      </CardHeader>

      <CardContent className="pb-3 space-y-3">
        {description && (
          <p className="text-sm text-muted-foreground line-clamp-2">
            {description}
          </p>
        )}

        {/* Features */}
        {features.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {features.slice(0, 6).map((feature, index) => (
              <div
                key={index}
                className={cn(
                  "flex items-center gap-1 text-xs px-3 py-1.5 rounded-full border backdrop-blur-sm transition-all duration-200 hover:scale-105",
                  feature.available 
                    ? "bg-green-500/10 text-green-400 border-green-400/30 hover:bg-green-500/20 hover:shadow-soft" 
                    : "bg-muted/30 text-muted-foreground border-muted/40 hover:bg-muted/40"
                )}
              >
                <feature.icon className="h-3 w-3" />
                {feature.label}
              </div>
            ))}
          </div>
        )}

        {/* Stats */}
        {stats.length > 0 && (
          <div className="grid grid-cols-2 gap-2">
            {stats.slice(0, 4).map((stat, index) => (
              <div key={index} className="flex items-center gap-1 text-sm text-muted-foreground">
                <stat.icon className="h-3 w-3" />
                <span className="font-medium">{stat.value}</span>
                <span className="text-xs">{stat.label}</span>
              </div>
            ))}
          </div>
        )}
      </CardContent>

      <CardFooter className="pt-0">
        <div className="w-full space-y-3">
          <Button
            onClick={onAction}
            variant="premium"
            className="w-full"
          >
            <Eye className="mr-2 h-4 w-4" />
            {actionLabel}
          </Button>
          
          {secondaryActionLabel && onSecondaryAction && (
            <Button
              variant="outline"
              onClick={onSecondaryAction}
              className="w-full glass-intense"
            >
              {secondaryActionLabel}
            </Button>
          )}
        </div>
      </CardFooter>
    </Card>
  );
};