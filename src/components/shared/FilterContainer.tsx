import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface FilterContainerProps {
  children: React.ReactNode;
  className?: string;
  title?: string;
  description?: string;
}

export const FilterContainer: React.FC<FilterContainerProps> = ({
  children,
  className,
  title,
  description,
}) => {
  return (
    <Card className={cn(
      "card-3d bg-white/90 backdrop-blur-sm border-primary/20 shadow-3d hover:shadow-3d-hover transition-all duration-300 mb-6",
      className
    )}>
      <CardContent className="p-4 md:p-6">
        {(title || description) && (
          <div className="mb-4 md:mb-6">
            {title && (
              <h2 className="text-lg md:text-xl font-semibold text-primary mb-2">{title}</h2>
            )}
            {description && (
              <p className="text-sm text-muted-foreground">{description}</p>
            )}
          </div>
        )}
        {children}
      </CardContent>
    </Card>
  );
};