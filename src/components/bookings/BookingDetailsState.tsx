
import React from "react";
import { Card, CardContent } from "@/components/ui/card";

interface BookingDetailsStateProps {
  loading: boolean;
  error: string | null;
}

export const BookingDetailsState: React.FC<BookingDetailsStateProps> = ({
  loading,
  error,
}) => {
  if (loading) {
    return (
      <div className="container py-8">
        <p>Carregando detalhes da reserva...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container py-8">
        <Card>
          <CardContent className="pt-6">
            <p className="text-red-500">{error}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return null;
};
