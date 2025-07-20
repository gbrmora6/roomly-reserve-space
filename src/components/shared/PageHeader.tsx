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
    <div className="relative mb-6 md:mb-8">
      {/* 3D Background */}
      <div className="absolute inset-0 glass-intense rounded-xl md:rounded-2xl shadow-3d hover:shadow-3d-hover transition-all duration-500 -z-10" />
      <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-accent/5 to-primary/5 rounded-xl md:rounded-2xl -z-20" />
      
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 md:gap-4 p-4 sm:p-6 md:p-8">
        <div className="space-y-2 md:space-y-3">
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            {title}
          </h1>
          {description && (
            <p className="text-muted-foreground text-sm sm:text-base md:text-lg font-medium">{description}</p>
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