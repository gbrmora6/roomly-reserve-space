import React from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";

interface Room {
  id?: string;
  name: string;
  description: string | null;
  has_wifi: boolean | null;
  has_ac: boolean | null;
  has_chairs: boolean | null;
  has_tables: boolean | null;
  price_per_hour: number;
  open_time: string | null;
  close_time: string | null;
  open_days: number[] | null;
}

interface RoomBasicFieldsProps {
  room: Partial<Room>;
  onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
  onCheckboxChange: (name: string, checked: boolean) => void;
}

export const RoomBasicFields: React.FC<RoomBasicFieldsProps> = ({
  room,
  onChange,
  onCheckboxChange,
}) => {
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="name">Nome da Sala</Label>
        <Input
          id="name"
          name="name"
          value={room.name || ""}
          onChange={onChange}
          required
        />
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="description">Descrição</Label>
        <Textarea
          id="description"
          name="description"
          value={room.description || ""}
          onChange={onChange}
          rows={4}
        />
      </div>
      
      <div className="space-y-4">
        <div className="flex items-center space-x-2">
          <Checkbox
            id="has_wifi"
            checked={!!room.has_wifi}
            onCheckedChange={(checked) => 
              onCheckboxChange("has_wifi", !!checked)
            }
          />
          <Label htmlFor="has_wifi">Possui Wi-Fi</Label>
        </div>
        
        <div className="flex items-center space-x-2">
          <Checkbox
            id="has_ac"
            checked={!!room.has_ac}
            onCheckedChange={(checked) => 
              onCheckboxChange("has_ac", !!checked)
            }
          />
          <Label htmlFor="has_ac">Possui Ar-Condicionado</Label>
        </div>
        
        <div className="flex items-center space-x-2">
          <Checkbox
            id="has_chairs"
            checked={!!room.has_chairs}
            onCheckedChange={(checked) => 
              onCheckboxChange("has_chairs", !!checked)
            }
          />
          <Label htmlFor="has_chairs">Possui Cadeiras</Label>
        </div>
        
        <div className="flex items-center space-x-2">
          <Checkbox
            id="has_tables"
            checked={!!room.has_tables}
            onCheckedChange={(checked) => 
              onCheckboxChange("has_tables", !!checked)
            }
          />
          <Label htmlFor="has_tables">Possui Mesas</Label>
        </div>
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="price_per_hour">Preço por Hora</Label>
        <Input
          id="price_per_hour"
          name="price_per_hour"
          type="number"
          step="0.01"
          value={room.price_per_hour || 0}
          onChange={onChange}
          required
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="open_time">Horário de Abertura</Label>
          <Input
            id="open_time"
            name="open_time"
            type="time"
            value={room.open_time?.substring(0, 5) || "08:00"}
            onChange={onChange}
            required
          />
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="close_time">Horário de Fechamento</Label>
          <Input
            id="close_time"
            name="close_time"
            type="time"
            value={room.close_time?.substring(0, 5) || "18:00"}
            onChange={onChange}
            required
          />
        </div>
      </div>
    </div>
  );
};