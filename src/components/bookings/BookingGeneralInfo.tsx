
import React from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { formatCurrency } from "@/utils/formatCurrency";

interface BookingGeneralInfoProps {
  startDate: Date;
  endDate: Date;
  totalPrice: number;
}

export const BookingGeneralInfo: React.FC<BookingGeneralInfoProps> = ({
  startDate,
  endDate,
  totalPrice,
}) => {
  const durationHours = (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60);
  const formattedDate = format(startDate, "dd 'de' MMMM 'de' yyyy", { locale: ptBR });
  const formattedStartTime = format(startDate, "HH:mm");
  const formattedEndTime = format(endDate, "HH:mm");

  return (
    <div>
      <h3 className="text-lg font-semibold mb-2">Informações Gerais</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <p className="text-sm text-muted-foreground">Data</p>
          <p className="font-medium">{formattedDate}</p>
        </div>
        <div>
          <p className="text-sm text-muted-foreground">Horário</p>
          <p className="font-medium">{formattedStartTime} às {formattedEndTime}</p>
        </div>
        <div>
          <p className="text-sm text-muted-foreground">Duração</p>
          <p className="font-medium">{durationHours} horas</p>
        </div>
        <div>
          <p className="text-sm text-muted-foreground">Valor Total</p>
          <p className="font-medium text-xl text-primary">{formatCurrency(totalPrice)}</p>
        </div>
      </div>
    </div>
  );
};
