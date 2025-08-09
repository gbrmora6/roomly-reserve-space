import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Plus, Trash2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useManualBlocks } from '@/hooks/useManualBlocks';

interface EquipmentAvailabilitySettingsProps {
  equipmentId: string;
  equipmentName: string;
  minimumInterval?: number;
  advanceBookingHours?: number;
  quantity?: number;
  onUpdate?: () => void;
}

export const EquipmentAvailabilitySettings: React.FC<EquipmentAvailabilitySettingsProps> = ({
  equipmentId,
  equipmentName,
  minimumInterval = 60,
  advanceBookingHours = 1,
  quantity = 1,
  onUpdate,
}) => {
  const [newMinimumInterval, setNewMinimumInterval] = useState(minimumInterval);
  const [newAdvanceBookingHours, setNewAdvanceBookingHours] = useState(advanceBookingHours);
  const [newQuantity, setNewQuantity] = useState(quantity);
  const [blockStartDate, setBlockStartDate] = useState('');
  const [blockStartTime, setBlockStartTime] = useState('');
  const [blockEndDate, setBlockEndDate] = useState('');
  const [blockEndTime, setBlockEndTime] = useState('');
  const [blockReason, setBlockReason] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);

  const { blocks, isLoading, addBlock, removeBlock } = useManualBlocks('equipment', equipmentId);

  const updateEquipmentSettings = async () => {
    setIsUpdating(true);
    try {
      const { error } = await supabase
        .from('equipment')
        .update({
          minimum_interval_minutes: newMinimumInterval,
          advance_booking_hours: newAdvanceBookingHours,
          quantity: newQuantity,
        })
        .eq('id', equipmentId);

      if (error) {
        toast.error('Erro ao atualizar configurações do equipamento');
        return;
      }

      toast.success('Configurações do equipamento atualizadas com sucesso');
      onUpdate?.();
    } catch (error) {
      toast.error('Erro ao atualizar configurações');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleAddBlock = async () => {
    if (!blockStartDate || !blockStartTime || !blockEndDate || !blockEndTime) {
      toast.error('Preencha todos os campos de data e horário');
      return;
    }

    const startDateTime = `${blockStartDate}T${blockStartTime}:00Z`;
    const endDateTime = `${blockEndDate}T${blockEndTime}:00Z`;

    if (new Date(startDateTime) >= new Date(endDateTime)) {
      toast.error('Data/horário de início deve ser anterior ao término');
      return;
    }

    const success = await addBlock(startDateTime, endDateTime, blockReason);
    
    if (success) {
      toast.success('Bloqueio adicionado com sucesso');
      setBlockStartDate('');
      setBlockStartTime('');
      setBlockEndDate('');
      setBlockEndTime('');
      setBlockReason('');
    } else {
      toast.error('Erro ao adicionar bloqueio');
    }
  };

  const handleRemoveBlock = async (blockId: string) => {
    const success = await removeBlock(blockId);
    
    if (success) {
      toast.success('Bloqueio removido com sucesso');
    } else {
      toast.error('Erro ao remover bloqueio');
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Configurações de Disponibilidade - {equipmentName}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="minimumInterval">Intervalo Mínimo (minutos)</Label>
              <Input
                id="minimumInterval"
                type="number"
                min="15"
                max="480"
                step="15"
                value={newMinimumInterval}
                onChange={(e) => setNewMinimumInterval(parseInt(e.target.value) || 60)}
              />
            </div>
            <div>
              <Label htmlFor="advanceBooking">Antecedência Mínima (horas)</Label>
              <Input
                id="advanceBooking"
                type="number"
                min="0"
                max="168"
                value={newAdvanceBookingHours}
                onChange={(e) => setNewAdvanceBookingHours(parseInt(e.target.value) || 1)}
              />
            </div>
            <div>
              <Label htmlFor="quantity">Quantidade Disponível</Label>
              <Input
                id="quantity"
                type="number"
                min="1"
                max="100"
                value={newQuantity}
                onChange={(e) => setNewQuantity(parseInt(e.target.value) || 1)}
              />
            </div>
          </div>
          <Button 
            onClick={updateEquipmentSettings} 
            disabled={isUpdating}
            className="w-full"
          >
            {isUpdating ? 'Atualizando...' : 'Atualizar Configurações'}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Bloqueios Manuais</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="blockStartDate">Data/Hora de Início</Label>
              <div className="flex gap-2">
                <Input
                  id="blockStartDate"
                  type="date"
                  value={blockStartDate}
                  onChange={(e) => setBlockStartDate(e.target.value)}
                />
                <Input
                  type="time"
                  value={blockStartTime}
                  onChange={(e) => setBlockStartTime(e.target.value)}
                />
              </div>
            </div>
            <div>
              <Label htmlFor="blockEndDate">Data/Hora de Término</Label>
              <div className="flex gap-2">
                <Input
                  id="blockEndDate"
                  type="date"
                  value={blockEndDate}
                  onChange={(e) => setBlockEndDate(e.target.value)}
                />
                <Input
                  type="time"
                  value={blockEndTime}
                  onChange={(e) => setBlockEndTime(e.target.value)}
                />
              </div>
            </div>
          </div>
          <div>
            <Label htmlFor="blockReason">Motivo do Bloqueio (opcional)</Label>
            <Input
              id="blockReason"
              value={blockReason}
              onChange={(e) => setBlockReason(e.target.value)}
              placeholder="Ex: Manutenção, evento especial..."
            />
          </div>
          <Button onClick={handleAddBlock} className="w-full">
            <Plus className="mr-2 h-4 w-4" />
            Adicionar Bloqueio
          </Button>

          {isLoading ? (
            <p>Carregando bloqueios...</p>
          ) : blocks.length > 0 ? (
            <div className="space-y-2">
              <h4 className="font-medium">Bloqueios Ativos:</h4>
              {blocks.map((block) => (
                <div key={block.id} className="flex items-center justify-between p-3 border rounded">
                  <div>
                    <p className="font-medium">
                      {new Date(block.start_time).toLocaleString('pt-BR')} - {new Date(block.end_time).toLocaleString('pt-BR')}
                    </p>
                    {block.reason && <p className="text-sm text-muted-foreground">{block.reason}</p>}
                  </div>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => handleRemoveBlock(block.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground">Nenhum bloqueio ativo</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
};