
import React from "react";
import { Skeleton } from "@/components/ui/skeleton";

export const LoadingBookings = () => {
  return (
    <div className="space-y-3">
      <Skeleton className="h-8 w-64" />
      <Skeleton className="h-10 w-full" />
      <Skeleton className="h-10 w-full" />
      <Skeleton className="h-10 w-full" />
    </div>
  );
};
