import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';

export async function testRoomAvailability() {
  try {
    console.log('=== TESTE DE DISPONIBILIDADE DE SALA ===');
    
    // 1. Buscar uma sala de teste
    const { data: rooms } = await supabase
      .from('rooms')
      .select('id, name')
      .ilike('name', '%teste%')
      .eq('is_active', true)
      .limit(1);
    
    if (!rooms || rooms.length === 0) {
      console.log('❌ Nenhuma sala de teste encontrada');
      return { success: false, message: 'Nenhuma sala de teste encontrada' };
    }
    
    const room = rooms[0];
    console.log(`✅ Sala encontrada: ${room.name} (${room.id})`);
    
    // 2. Verificar horários da sala para hoje
    const today = new Date();
    const weekdays = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const weekday = weekdays[today.getDay()];
    
    console.log(`📅 Verificando horários para ${weekday}`);
    
    const { data: schedules } = await supabase
      .from('room_schedules')
      .select('start_time, end_time')
      .eq('room_id', room.id)
      .eq('weekday', weekday as any);
    
    console.log('📋 Horários cadastrados:', schedules);
    
    // 3. Testar função get_room_availability
    const dateStr = format(today, 'yyyy-MM-dd');
    console.log(`🔍 Testando get_room_availability para ${dateStr}`);
    
    const { data: availability, error } = await supabase.rpc('get_room_availability', {
      p_room_id: room.id,
      p_date: dateStr
    });
    
    if (error) {
      console.error('❌ Erro na função get_room_availability:', error);
      return { success: false, message: `Erro na função: ${error.message}` };
    }
    
    console.log('⏰ Disponibilidade retornada pela função:');
    if (availability && Array.isArray(availability)) {
      availability.forEach((slot: any) => {
        console.log(`  ${slot.hour}: ${slot.is_available ? '✅ Disponível' : '❌ ' + slot.blocked_reason}`);
      });
      
      // Verificar se há horários antes das 10:00
      const earlyHours = availability.filter((slot: any) => {
        const hour = parseInt(slot.hour.split(':')[0]);
        return hour < 10;
      });
      
      console.log(`🌅 Horários antes das 10:00: ${earlyHours.length} encontrados`);
      
      if (earlyHours.length > 0) {
        console.log('✅ A função está retornando horários antes das 10:00!');
      } else {
        console.log('❌ A função NÃO está retornando horários antes das 10:00');
      }
      
    } else {
      console.log('❌ Dados inválidos retornados pela função');
    }
    
    return { 
      success: true, 
      message: 'Teste concluído - verifique o console para detalhes',
      room: room.name,
      schedules,
      availability
    };
    
  } catch (error) {
    console.error('❌ Erro no teste:', error);
    return { success: false, message: `Erro: ${error.message}` };
  }
}