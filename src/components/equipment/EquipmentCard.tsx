
import React from "react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Package, Clock } from "lucide-react";
import { formatCurrency } from "@/utils/formatCurrency";

interface Equipment {
  id: string;
  name: string;
  description: string | null;
  quantity: number;
  price_per_hour: number;
  is_active: boolean;
  open_time: string | null;
  close_time: string | null;
}

interface EquipmentCardProps {
  equipment: Equipment;
}

const EquipmentCard: React.FC<EquipmentCardProps> = ({ equipment }) => {
  return (
    <Card className="h-full flex flex-col hover:shadow-lg transition-shadow">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Package className="h-4 w-4 text-muted-foreground" />
          {equipment.name}
        </CardTitle>
        <p className="text-sm text-muted-foreground line-clamp-2">
          {equipment.description || "Equipamento disponível para reserva"}
        </p>
      </CardHeader>

      <CardContent className="flex-1 space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-2xl font-bold text-primary">
            {formatCurrency(equipment.price_per_hour)}
          </span>
          <span className="text-sm text-muted-foreground">/hora</span>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Disponível:</span>
            <Badge variant="secondary">
              {equipment.quantity} unidades
            </Badge>
          </div>

          {/* Horário de funcionamento */}
          {equipment.open_time && equipment.close_time && (
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Clock className="h-3 w-3" />
              {equipment.open_time} às {equipment.close_time}
            </div>
          )}
        </div>
      </CardContent>

      <CardFooter className="pt-3">
        <Button asChild className="w-full">
          <Link to={`/equipment/${equipment.id}`}>
            Ver Detalhes e Reservar
          </Link>
        </Button>
      </CardFooter>
    </Card>
  );
};

export default EquipmentCard;
