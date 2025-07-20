import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Clock, Save, AlertCircle, RefreshCw } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { supabase } from '@/integrations/supabase/client';

interface ExpirationSettings {
  room_expiration_seconds: number;
  equipment_expiration_seconds: number;
}

export default function ExpirationSettings() {
  const [settings, setSettings] = useState<ExpirationSettings>({
    room_expiration_seconds: 900, // 15 minutos padrão
    equipment_expiration_seconds: 900, // 15 minutos padrão
  });
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // Função para converter segundos em formato legível
  const formatTime = (seconds: number) => {
    if (seconds < 60) {
      return `${seconds} segundo${seconds !== 1 ? 's' : ''}`;
    } else if (seconds < 3600) {
      const minutes = Math.floor(seconds / 60);
      const remainingSeconds = seconds % 60;
      if (remainingSeconds === 0) {
        return `${minutes} minuto${minutes !== 1 ? 's' : ''}`;
      }
      return `${minutes} minuto${minutes !== 1 ? 's' : ''} e ${remainingSeconds} segundo${remainingSeconds !== 1 ? 's' : ''}`;
    } else {
      const hours = Math.floor(seconds / 3600);
      const minutes = Math.floor((seconds % 3600) / 60);
      if (minutes === 0) {
        return `${hours} hora${hours !== 1 ? 's' : ''}`;
      }
      return `${hours} hora${hours !== 1 ? 's' : ''} e ${minutes} minuto${minutes !== 1 ? 's' : ''}`;
    }
  };

  // Função para converter valor de tempo para segundos
  const parseTimeToSeconds = (timeValue: any): number => {
    try {
      // Se for uma string JSON, fazer parse primeiro
      const parsedValue = typeof timeValue === 'string' ? JSON.parse(timeValue) : timeValue;
      
      if (typeof parsedValue === 'string') {
        // Parse strings like "20 seconds", "5 minutes", etc.
        const match = parsedValue.match(/(\d+)\s*(second|minute|hour)s?/i);
        if (match) {
          const value = parseInt(match[1]);
          const unit = match[2].toLowerCase();
          
          switch (unit) {
            case 'second': return value;
            case 'minute': return value * 60;
            case 'hour': return value * 3600;
            default: return value;
          }
        }
      }
      return typeof parsedValue === 'number' ? parsedValue : 900;
    } catch {
      return 900;
    }
  };

  // Função para buscar configurações atuais
  const fetchCurrentSettings = async () => {
    setLoading(true);
    try {
      // Buscar configurações da tabela system_settings
      const { data, error } = await supabase
        .from('system_settings')
        .select('setting_key, setting_value')
        .in('setting_key', ['cart_expiration_room', 'cart_expiration_equipment']);

      if (error) throw error;

      if (data && data.length > 0) {
        const roomSetting = data.find(s => s.setting_key === 'cart_expiration_room');
        const equipmentSetting = data.find(s => s.setting_key === 'cart_expiration_equipment');

        setSettings({
          room_expiration_seconds: roomSetting ? parseTimeToSeconds(roomSetting.setting_value) : 900,
          equipment_expiration_seconds: equipmentSetting ? parseTimeToSeconds(equipmentSetting.setting_value) : 900,
        });
      }
    } catch (error) {
      console.error('Erro ao carregar configurações:', error);
      toast({
        title: "Erro",
        description: "Erro ao carregar configurações de expiração",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Função para converter valor e unidade em segundos
  const convertToSeconds = (value: number, unit: string): number => {
    switch (unit.toLowerCase()) {
      case 'second':
      case 'seconds':
        return value;
      case 'minute':
      case 'minutes':
        return value * 60;
      case 'hour':
      case 'hours':
        return value * 3600;
      default:
        return value * 60; // padrão para minutos
    }
  };

  // Função para converter segundos em INTERVAL do PostgreSQL
  const convertToInterval = (seconds: number): string => {
    if (seconds < 60) {
      return `${seconds} seconds`;
    } else if (seconds < 3600) {
      const minutes = Math.floor(seconds / 60);
      const remainingSeconds = seconds % 60;
      if (remainingSeconds === 0) {
        return `${minutes} minutes`;
      }
      return `${minutes} minutes ${remainingSeconds} seconds`;
    } else {
      const hours = Math.floor(seconds / 3600);
      const minutes = Math.floor((seconds % 3600) / 60);
      if (minutes === 0) {
        return `${hours} hours`;
      }
      return `${hours} hours ${minutes} minutes`;
    }
  };

  // Função para formatar segundos para formato de intervalo
  const formatSecondsToInterval = (seconds: number): string => {
    if (seconds < 60) {
      return `${seconds} seconds`;
    } else if (seconds < 3600) {
      const minutes = Math.floor(seconds / 60);
      const remainingSeconds = seconds % 60;
      if (remainingSeconds === 0) {
        return `${minutes} minutes`;
      }
      return `${minutes} minutes ${remainingSeconds} seconds`;
    } else {
      const hours = Math.floor(seconds / 3600);
      const minutes = Math.floor((seconds % 3600) / 60);
      if (minutes === 0) {
        return `${hours} hours`;
      }
      return `${hours} hours ${minutes} minutes`;
    }
  };

  // Função para salvar configurações
  const saveSettings = async () => {
    setSaving(true);
    try {
      // Salvar na tabela system_settings
      const updates = [
        {
          setting_key: 'cart_expiration_room',
          setting_value: JSON.stringify(formatSecondsToInterval(settings.room_expiration_seconds)),
          description: 'Tempo de expiração para itens de sala no carrinho'
        },
        {
          setting_key: 'cart_expiration_equipment', 
          setting_value: JSON.stringify(formatSecondsToInterval(settings.equipment_expiration_seconds)),
          description: 'Tempo de expiração para itens de equipamento no carrinho'
        }
      ];

      for (const update of updates) {
        const { error } = await supabase
          .from('system_settings')
          .upsert(update, { onConflict: 'setting_key' });
        
        if (error) throw error;
      }

      // Aplicar migração diretamente para atualizar a função add_to_cart
       const migrationSQL = `
         CREATE OR REPLACE FUNCTION add_to_cart(
           p_user_id UUID,
           p_item_type TEXT,
           p_item_id UUID,
           p_quantity INTEGER,
           p_price NUMERIC,
           p_metadata JSONB DEFAULT '{}',
           p_branch_id UUID DEFAULT NULL
         )
         RETURNS UUID AS $$
         DECLARE
           v_cart_item_id UUID;
           v_booking_id UUID;
           v_equipment_booking_id UUID;
           v_expiration_interval INTERVAL;
         BEGIN
           -- Determine expiration time based on item type
           IF p_item_type = 'room' THEN
             v_expiration_interval := INTERVAL '${formatSecondsToInterval(settings.room_expiration_seconds)}';
           ELSIF p_item_type = 'equipment' THEN
             v_expiration_interval := INTERVAL '${formatSecondsToInterval(settings.equipment_expiration_seconds)}';
           ELSE
             v_expiration_interval := INTERVAL '15 minutes'; -- Default for products
           END IF;
         
           -- Insert into cart_items
           INSERT INTO cart_items (
             user_id, item_type, item_id, quantity, price, metadata, branch_id, expires_at
           ) VALUES (
             p_user_id, p_item_type, p_item_id, p_quantity, p_price, p_metadata, p_branch_id,
             NOW() + v_expiration_interval
           ) RETURNING id INTO v_cart_item_id;
         
           -- Create booking reservation if it's a room
           IF p_item_type = 'room' THEN
             INSERT INTO bookings (
               user_id, room_id, start_time, end_time, status, total_price, branch_id
             ) VALUES (
               p_user_id, p_item_id, 
               (p_metadata->>'start_time')::timestamptz,
               (p_metadata->>'end_time')::timestamptz,
               'in_process', p_price, p_branch_id
             ) RETURNING id INTO v_booking_id;
             
             -- Update cart item with booking reference
             UPDATE cart_items 
             SET reserved_booking_id = v_booking_id 
             WHERE id = v_cart_item_id;
           END IF;
         
           -- Create equipment booking reservation if it's equipment
           IF p_item_type = 'equipment' THEN
             INSERT INTO booking_equipment (
               user_id, equipment_id, quantity, start_time, end_time, status, total_price, branch_id
             ) VALUES (
               p_user_id, p_item_id, p_quantity,
               (p_metadata->>'start_time')::timestamptz,
               (p_metadata->>'end_time')::timestamptz,
               'in_process', p_price, p_branch_id
             ) RETURNING id INTO v_equipment_booking_id;
             
             -- Update cart item with equipment booking reference
             UPDATE cart_items 
             SET reserved_equipment_booking_id = v_equipment_booking_id 
             WHERE id = v_cart_item_id;
           END IF;
         
           RETURN v_cart_item_id;
         END;
         $$ LANGUAGE plpgsql SECURITY DEFINER;
       `;

       // Executar SQL usando a função exec_sql
       const { error: sqlError } = await supabase.rpc('exec_sql', {
         sql: migrationSQL
       });

       if (sqlError) throw sqlError;

      toast({
        title: "Sucesso",
        description: "Configurações de expiração atualizadas com sucesso!",
      });

      // Recarregar configurações para confirmar
      await fetchCurrentSettings();
    } catch (error) {
      console.error('Erro ao salvar configurações:', error);
      toast({
        title: "Erro",
        description: "Erro ao salvar configurações de expiração",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => {
    fetchCurrentSettings();
  }, []);

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center gap-3 mb-6">
        <Clock className="h-8 w-8 text-blue-600" />
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Configurações de Expiração</h1>
          <p className="text-gray-600 mt-1">
            Configure o tempo de expiração para itens no carrinho
          </p>
        </div>
      </div>

      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          Estas configurações definem quanto tempo os itens ficam reservados no carrinho antes de expirarem automaticamente.
        </AlertDescription>
      </Alert>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Configuração de Salas */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-blue-600" />
              Expiração de Salas
            </CardTitle>
            <CardDescription>
              Tempo que uma reserva de sala fica no carrinho antes de expirar
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="room-expiration">Tempo em segundos</Label>
              <Input
                id="room-expiration"
                type="number"
                min="1"
                value={settings.room_expiration_seconds}
                onChange={(e) => setSettings(prev => ({
                  ...prev,
                  room_expiration_seconds: parseInt(e.target.value) || 1
                }))}
                disabled={loading || saving}
              />
              <p className="text-sm text-gray-500">
                Equivale a: <strong>{formatTime(settings.room_expiration_seconds)}</strong>
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Configuração de Equipamentos */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-green-600" />
              Expiração de Equipamentos
            </CardTitle>
            <CardDescription>
              Tempo que uma reserva de equipamento fica no carrinho antes de expirar
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="equipment-expiration">Tempo em segundos</Label>
              <Input
                id="equipment-expiration"
                type="number"
                min="1"
                value={settings.equipment_expiration_seconds}
                onChange={(e) => setSettings(prev => ({
                  ...prev,
                  equipment_expiration_seconds: parseInt(e.target.value) || 1
                }))}
                disabled={loading || saving}
              />
              <p className="text-sm text-gray-500">
                Equivale a: <strong>{formatTime(settings.equipment_expiration_seconds)}</strong>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Separator />

      {/* Botão de Salvar */}
      <div className="flex justify-end">
        <Button 
          onClick={saveSettings} 
          disabled={loading || saving}
          className="flex items-center gap-2"
        >
          <Save className="h-4 w-4" />
          {saving ? 'Salvando...' : 'Salvar Configurações'}
        </Button>
      </div>

      {/* Configurações Rápidas */}
      <Card>
        <CardHeader>
          <CardTitle>Configurações Rápidas</CardTitle>
          <CardDescription>
            Clique para aplicar configurações pré-definidas
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 md:grid-cols-4">
            <Button 
              variant="outline" 
              onClick={() => setSettings({ room_expiration_seconds: 20, equipment_expiration_seconds: 20 })}
              disabled={loading || saving}
            >
              20 segundos
            </Button>
            <Button 
              variant="outline" 
              onClick={() => setSettings({ room_expiration_seconds: 60, equipment_expiration_seconds: 60 })}
              disabled={loading || saving}
            >
              1 minuto
            </Button>
            <Button 
              variant="outline" 
              onClick={() => setSettings({ room_expiration_seconds: 300, equipment_expiration_seconds: 300 })}
              disabled={loading || saving}
            >
              5 minutos
            </Button>
            <Button 
              variant="outline" 
              onClick={() => setSettings({ room_expiration_seconds: 900, equipment_expiration_seconds: 900 })}
              disabled={loading || saving}
            >
              15 minutos
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}