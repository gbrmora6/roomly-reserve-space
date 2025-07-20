import { Button } from "@/components/ui/button";
import { fixRoomSchedules } from "@/utils/fixRoomSchedules";
import { useState } from "react";
import { toast } from "sonner";

export const FixSchedulesButton = () => {
  const [isLoading, setIsLoading] = useState(false);

  const handleFixSchedules = async () => {
    setIsLoading(true);
    try {
      const success = await fixRoomSchedules();
      if (success) {
        toast.success("Horários das salas corrigidos com sucesso!");
        // Recarregar a página para atualizar os dados
        window.location.reload();
      } else {
        toast.error("Erro ao corrigir horários das salas");
      }
    } catch (error) {
      console.error("Erro:", error);
      toast.error("Erro ao corrigir horários das salas");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Button 
      onClick={handleFixSchedules} 
      disabled={isLoading}
      variant="outline"
      className="mb-4"
    >
      {isLoading ? "Corrigindo..." : "Corrigir Horários das Salas de Teste"}
    </Button>
  );
};