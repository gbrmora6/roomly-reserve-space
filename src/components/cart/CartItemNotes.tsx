
import React, { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { MessageSquarePlus, Save, X } from "lucide-react";
import { useCart } from "@/hooks/useCart";

interface CartItemNotesProps {
  itemId: string;
  currentNotes?: string;
}

export const CartItemNotes: React.FC<CartItemNotesProps> = ({ 
  itemId, 
  currentNotes = "" 
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [notes, setNotes] = useState(currentNotes);
  const { updateCart } = useCart();

  const handleSaveNotes = () => {
    // For now, we'll just close the editor
    // In a real implementation, you would update the cart item metadata
    console.log("Saving notes for item:", itemId, notes);
    setIsEditing(false);
  };

  const handleCancel = () => {
    setNotes(currentNotes);
    setIsEditing(false);
  };

  return (
    <div className="mt-3">
      {!isEditing ? (
        <div>
          {currentNotes ? (
            <Card className="bg-blue-50 border-blue-200">
              <CardContent className="p-3">
                <p className="text-sm text-blue-800">
                  <strong>Observações:</strong> {currentNotes}
                </p>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsEditing(true)}
                  className="mt-1 h-auto p-1 text-blue-600 hover:text-blue-800"
                >
                  Editar observações
                </Button>
              </CardContent>
            </Card>
          ) : (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsEditing(true)}
              className="flex items-center gap-1 text-muted-foreground hover:text-foreground"
            >
              <MessageSquarePlus className="h-3 w-3" />
              Adicionar observações
            </Button>
          )}
        </div>
      ) : (
        <Card className="border-blue-200">
          <CardContent className="p-3 space-y-2">
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Adicione observações para esta reserva..."
              className="resize-none"
              rows={3}
            />
            <div className="flex gap-2">
              <Button
                variant="default"
                size="sm"
                onClick={handleSaveNotes}
                className="flex items-center gap-1"
              >
                <Save className="h-3 w-3" />
                Salvar
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleCancel}
                className="flex items-center gap-1"
              >
                <X className="h-3 w-3" />
                Cancelar
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
