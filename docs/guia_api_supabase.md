
# Guia de API Supabase

Este documento detalha as principais interfaces e serviços utilizados para interação com o Supabase no sistema de reservas.

## 1. Configuração do Cliente

O cliente Supabase é configurado em `src/integrations/supabase/client.ts`:

```typescript
import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

const SUPABASE_URL = "https://fgiidcdsvmqxdkclgety.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZnaWlkY2Rzdm1xeGRrY2xnZXR5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDU0NDY3NDksImV4cCI6MjA2MTAyMjc0OX0.Wwc-QQghL_Z7XE4S_VuweP01TCW6id07LZRht6gynAM";

export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);
```

## 2. Autenticação e Gerenciamento de Usuários

### 2.1 Contexto de Autenticação

O sistema utiliza um contexto React (`src/contexts/AuthContext.tsx`) para gerenciar o estado de autenticação globalmente:

```typescript
export interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  refreshUserClaims: () => Promise<void>;
  // ... outros métodos
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
```

### 2.2 Operações de Autenticação

As operações de autenticação são encapsuladas no hook `useAuthOperations`:

```typescript
export function useAuthOperations() {
  const handleSignUp = async (email: string, password: string, firstName: string, lastName: string) => {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            first_name: firstName,
            last_name: lastName,
          },
        },
      });
      
      // Tratamento de resposta...
    } catch (error) {
      // Tratamento de erro...
    }
  };

  const handleSignIn = async (email: string, password: string) => {
    // Implementação de login...
  };

  const handleSignOut = async () => {
    // Implementação de logout...
  };

  return {
    handleSignUp,
    handleSignIn,
    handleSignOut,
  };
}
```

## 3. Serviços de Dados

### 3.1 Serviço de Salas

Gerencia operações relacionadas às salas:

```typescript
// src/services/roomService.ts
export const roomService = {
  async getAllRooms(): Promise<Room[] | null> {
    const { data, error } = await supabase
      .from("rooms")
      .select(`
        *,
        room_photos (
          id,
          url
        )
      `)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Erro ao buscar salas:", error);
      throw new Error("Erro ao carregar salas.");
    }

    return data as unknown as Room[];
  },
};
```

### 3.2 Hooks de Dados

O sistema utiliza React Query com hooks personalizados para busca e gerenciamento de dados:

#### Hook de Reservas

```typescript
// src/hooks/useBookingData.ts
export function useBookingData(initialFilter: BookingStatus | "all" = "all") {
  const [filter, setFilter] = useState<BookingStatus | "all">(initialFilter);

  const { data: bookings, isLoading, refetch } = useQuery({
    queryKey: ["bookings", filter],
    queryFn: async () => {
      let query = supabase
        .from("bookings")
        .select(`
          *,
          room:rooms(name, price_per_hour),
          user:profiles(first_name, last_name),
          booking_equipment:booking_equipment(
            quantity,
            equipment:equipment(name, price_per_hour)
          )
        `)
        .order("start_time", { ascending: false });

      if (filter !== "all") {
        query = query.eq("status", filter);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    meta: {
      onError: (err: any) => {
        toast({
          variant: "destructive",
          title: "Erro ao carregar reservas",
          description: err.message,
        });
      }
    },
  });

  return { bookings, isLoading, refetch, filter, setFilter };
}
```

#### Hook de Perfil

```typescript
// src/hooks/useProfile.ts
export function useProfile(userId: string | undefined) {
  const { data: profile, isLoading, error, refetch } = useQuery({
    queryKey: ["profile", userId],
    queryFn: async () => {
      if (!userId) throw new Error("ID do usuário não fornecido");

      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!userId,
  });

  return { profile, isLoading, error, refetch };
}
```

## 4. Gerenciamento de Disponibilidade

### 4.1 Verificação de Disponibilidade de Salas

```typescript
// src/hooks/useRoomAvailability.ts
export function useRoomAvailability(date: Date | null, startTime: string, endTime: string) {
  const [availableRooms, setAvailableRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchAvailableRooms = async () => {
      if (!date || !startTime || !endTime) {
        setAvailableRooms([]);
        return;
      }

      setLoading(true);

      try {
        // Construir data/hora completas
        const startDate = new Date(date);
        // ... definição de datas e horas

        // Buscar todas as salas
        const { data: rooms, error: roomsError } = await supabase
          .from("rooms")
          .select("*, room_photos(*)")
          .eq("is_active", true);

        if (roomsError) throw roomsError;

        // Buscar reservas existentes que conflitam com o período
        const { data: conflictingBookings, error: bookingsError } = await supabase
          .from("bookings")
          .select("room_id")
          .not("status", "eq", "cancelled")
          .lt("start_time", endDateTime.toISOString())
          .gt("end_time", startDateTime.toISOString());

        if (bookingsError) throw bookingsError;

        // Filtrar salas disponíveis
        const bookedRoomIds = conflictingBookings.map(booking => booking.room_id);
        const available = rooms.filter(room => !bookedRoomIds.includes(room.id));

        setAvailableRooms(available);
      } catch (error) {
        console.error("Error fetching available rooms:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchAvailableRooms();
  }, [date, startTime, endTime]);

  return { availableRooms, loading };
}
```

### 4.2 Verificação de Disponibilidade de Equipamentos

```typescript
// src/hooks/useEquipmentAvailability.ts
export function useEquipmentAvailability(startTime: Date | null, endTime: Date | null) {
  const [availableEquipment, setAvailableEquipment] = useState<Array<{
    id: string;
    name: string;
    description: string | null;
    quantity: number;
    available: number;
    price_per_hour: number;
  }>>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchEquipment = async () => {
      // Implementação similar à disponibilidade de salas,
      // mas considera quantidade disponível de cada equipamento
    };

    if (startTime && endTime) {
      fetchEquipment();
    } else {
      setLoading(false);
    }
  }, [startTime, endTime]);

  return { availableEquipment, loading };
}
```

## 5. Gerenciamento de Claims e Sessão

### 5.1 Claims de Usuário

```typescript
// src/hooks/useUserClaims.ts
export function useUserClaims() {
  const refreshUserClaims = useCallback(async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        devLog("No active session found, skipping claims refresh");
        return;
      }
      
      // Verifica timestamp do último refresh para prevenir abuso
      // ... implementação de rate limiting
      
      // Verifica se o usuário é superadmin por e-mail
      // ... verificação de superadmin
      
      // Para usuários regulares, busca perfil para verificar papel
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', session.user.id)
        .single();
      
      // Atualiza metadados do usuário se necessário
      // ... atualização de claims
      
      // Atualiza token JWT
      const { error: refreshError } = await supabase.auth.refreshSession();
      // ... tratamento de refresh
    } catch (err) {
      errorLog("Error in refreshUserClaims", err);
    }
  }, []);

  return { refreshUserClaims };
}
```

### 5.2 Gerenciamento de Sessão

```typescript
// src/hooks/useSessionManager.ts
export function useSessionManager() {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Configuração do listener de eventos de autenticação
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, currentSession) => {
      // ... tratamento de mudanças de estado de autenticação
    });

    // Verificação de sessão existente
    const initializeSession = async () => {
      // ... inicialização de sessão existente
    };
    
    initializeSession();

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  return { user, session, loading };
}
```

## 6. Segurança e Criptografia

### 6.1 Utilitários de Encriptação

```typescript
// src/utils/encryption.ts
export const encryptData = (data: string): string => {
  // Implementação de encriptação
};

export const decryptData = (encryptedData: string): string => {
  // Implementação de decriptação
};

export const secureSessionStore = (key: string, value: string): void => {
  // Armazenamento seguro
};

export const getSecureSessionItem = (key: string): string | null => {
  // Recuperação segura
};
```

### 6.2 Logging Seguro

```typescript
// src/utils/logger.ts
export const devLog = (message: string, data?: any): void => {
  // Log apenas em desenvolvimento
};

export const errorLog = (message: string, error?: any): void => {
  // Log de erro com proteção para produção
};

export const infoLog = (message: string, data?: any): void => {
  // Log de informações gerais
};
```

## 7. Funções do Banco de Dados

O sistema utiliza funções PostgreSQL para lógica de negócios crítica e segurança:

### 7.1 Verificação de Disponibilidade

```sql
CREATE OR REPLACE FUNCTION public.check_equipment_availability(
  p_equipment_id uuid,
  p_start_time timestamp with time zone,
  p_end_time timestamp with time zone,
  p_requested_quantity integer
) RETURNS boolean AS $$
DECLARE
  available_quantity INTEGER;
  total_quantity INTEGER;
BEGIN
  -- Busca quantidade total do equipamento
  SELECT quantity INTO total_quantity
  FROM equipment
  WHERE id = p_equipment_id;

  -- Calcula quanto já está reservado neste período
  SELECT COALESCE(SUM(be.quantity), 0) INTO available_quantity
  FROM booking_equipment be
  JOIN bookings b ON b.id = be.booking_id
  WHERE be.equipment_id = p_equipment_id
  AND b.status != 'cancelled'
  AND b.start_time < p_end_time
  AND b.end_time > p_start_time;

  -- Verifica se há quantidade suficiente disponível
  RETURN (total_quantity - available_quantity) >= p_requested_quantity;
END;
$$ LANGUAGE plpgsql;
```

### 7.2 Cálculo de Preço

```sql
CREATE OR REPLACE FUNCTION public.calculate_booking_price()
RETURNS trigger AS $$
DECLARE
    room_price DECIMAL(10, 2);
    equipment_total DECIMAL(10, 2);
    hours_booked DECIMAL(10, 2);
BEGIN
    -- Busca preço por hora da sala
    SELECT price_per_hour INTO room_price
    FROM rooms
    WHERE id = NEW.room_id;

    -- Calcula horas entre início e fim
    hours_booked := EXTRACT(EPOCH FROM (NEW.end_time - NEW.start_time)) / 3600;

    -- Calcula total de equipamentos
    SELECT COALESCE(SUM(e.price_per_hour * be.quantity), 0) INTO equipment_total
    FROM booking_equipment be
    JOIN equipment e ON e.id = be.equipment_id
    WHERE be.booking_id = NEW.id;

    -- Define preço total (sala + equipamentos * horas)
    NEW.total_price := (room_price + equipment_total) * hours_booked;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

### 7.3 Verificação de Permissões

```sql
CREATE OR REPLACE FUNCTION public.is_admin_or_super()
RETURNS boolean AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
    AND role = 'admin'::user_role
  );
$$ LANGUAGE sql STABLE SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.is_owner_or_admin(record_user_id uuid)
RETURNS boolean AS $$
  SELECT 
    record_user_id = auth.uid() 
    OR EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
      AND role = 'admin'::user_role
    );
$$ LANGUAGE sql STABLE SECURITY DEFINER;
```

## 8. Considerações sobre Desempenho

1. **Uso de React Query**:
   - Caching eficiente de dados
   - Refetch automático em foco
   - Gestão de estado de carregamento e erro

2. **Queries Eficientes**:
   - Seleção específica de colunas
   - Join de tabelas relacionadas em uma única query
   - Filtros aplicados no lado do servidor

3. **Rate Limiting**:
   - Controle para prevenir excesso de chamadas para refreshUserClaims
   - Caching de resultado de verificações de permissão

## 9. Exemplos de Uso

### 9.1 Criação de Reserva

```typescript
const createBooking = async () => {
  try {
    // Construir objetos de data
    const startDate = new Date(selectedDate);
    const endDate = new Date(selectedDate);
    
    // Configurar horas
    const [startHours, startMinutes] = startTime.split(":");
    const [endHours, endMinutes] = endTime.split(":");
    
    startDate.setHours(parseInt(startHours), parseInt(startMinutes));
    endDate.setHours(parseInt(endHours), parseInt(endMinutes));

    // Calcular duração e preço preliminar
    const durationHours = (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60);
    const preliminaryPrice = selectedRoom.price_per_hour * durationHours;

    // Inserir reserva principal
    const { data: bookingData, error: bookingError } = await supabase
      .from("bookings")
      .insert({
        user_id: user.id,
        room_id: selectedRoom.id,
        start_time: startDate.toISOString(),
        end_time: endDate.toISOString(),
        total_price: preliminaryPrice
      })
      .select()
      .single();

    if (bookingError) throw bookingError;

    // Adicionar equipamentos se selecionados
    if (selectedEquipment.length > 0) {
      const equipmentRecords = selectedEquipment.map(item => ({
        booking_id: bookingData.id,
        equipment_id: item.id,
        quantity: item.quantity,
        user_id: user.id,
        start_time: startDate.toISOString(),
        end_time: endDate.toISOString()
      }));

      const { error: equipmentError } = await supabase
        .from("booking_equipment")
        .insert(equipmentRecords);

      if (equipmentError) throw equipmentError;
    }

    // Sucesso!
    return bookingData.id;
  } catch (error) {
    // Tratamento de erro
    throw error;
  }
};
```

### 9.2 Busca de Dados do Perfil

```typescript
const fetchProfileData = async (userId) => {
  try {
    // Buscar dados básicos do perfil
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .single();
      
    if (profileError) throw profileError;
    
    // Buscar reservas do usuário
    const { data: bookings, error: bookingsError } = await supabase
      .from("bookings")
      .select(`
        id, 
        start_time, 
        end_time, 
        status,
        room:rooms(name)
      `)
      .eq("user_id", userId)
      .order("start_time", { ascending: false });
      
    if (bookingsError) throw bookingsError;
    
    return {
      profile,
      bookings
    };
  } catch (error) {
    console.error("Error fetching profile data:", error);
    throw error;
  }
};
```

### 9.3 Atualização de Status de Reserva

```typescript
const updateBookingStatus = async (bookingId, newStatus) => {
  try {
    const { error } = await supabase
      .from("bookings")
      .update({ status: newStatus })
      .eq("id", bookingId);
      
    if (error) throw error;
    
    return true;
  } catch (error) {
    console.error("Error updating booking status:", error);
    throw error;
  }
};
```

Este guia de API cobre os principais aspectos da interação com o Supabase no sistema. Consulte o código fonte para detalhes específicos de implementação de cada componente ou serviço.
