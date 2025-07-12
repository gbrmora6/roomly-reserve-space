import React from "react";

interface PageHeaderProps {
  title: string;
  description?: string;
  children?: React.ReactNode;
}

export const PageHeader: React.FC<PageHeaderProps> = ({
  title,
  description,
  children,
}) => {
  return (
    <div className="relative mb-8">
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-to-r from-primary/5 to-accent/5 rounded-xl -z-10" />
      
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 p-6">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            {title}
          </h1>
          {description && (
            <p className="text-muted-foreground text-lg">{description}</p>
          )}
        </div>
        {children && (
          <div className="flex-shrink-0">
            {children}
          </div>
        )}
      </div>
    </div>
  );
};