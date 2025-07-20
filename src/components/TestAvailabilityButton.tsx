import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { testRoomAvailability } from '@/utils/testRoomAvailability';
import { useToast } from '@/hooks/use-toast';

export const TestAvailabilityButton = () => {
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleTest = async () => {
    setIsLoading(true);
    try {
      const result = await testRoomAvailability();
      
      if (result.success) {
        toast({
          title: "Teste concluído",
          description: result.message,
        });
      } else {
        toast({
          title: "Erro no teste",
          description: result.message,
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Erro",
        description: "Erro ao executar teste",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Button 
      onClick={handleTest} 
      disabled={isLoading}
      variant="outline"
      className="mb-4"
    >
      {isLoading ? 'Testando...' : 'Testar Disponibilidade'}
    </Button>
  );
};