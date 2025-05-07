
# Guia de Segurança do Sistema

Este documento detalha os mecanismos de segurança implementados no sistema de reservas para garantir a proteção dos dados, autenticação segura e prevenção de acessos não autorizados.

## 1. Autenticação

O sistema utiliza o serviço de autenticação do Supabase, que implementa padrões modernos de segurança:

### 1.1 Fluxo de Autenticação

- **Registro de Usuários**: 
  - Validação de e-mail e senha
  - Opção para confirmação por e-mail (configurável)
  - Armazenamento seguro de senhas com hash bcrypt

- **Login de Usuários**:
  - Autenticação com e-mail e senha
  - Geração de tokens JWT (JSON Web Tokens)
  - Refreshing automático de tokens

```typescript
// Exemplo de implementação segura de login
const handleLogin = async () => {
  try {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    
    if (error) throw error;
  } catch (error) {
    // Tratamento de erros com mensagens genéricas para usuário
    // evitando exposição de informações sensíveis
  }
};
```

### 1.2 Persistência Segura de Sessão

- Utilização do hook `useSessionManager` para gerenciar estados de autenticação
- Implementação de criptografia client-side para dados sensíveis de sessão
- Monitoramento contínuo do estado de autenticação com `onAuthStateChange`

```typescript
// Exemplo do hook useSessionManager com tratamento seguro
export function useSessionManager() {
  // Inicializa estados
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Configura listener para mudanças de autenticação
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, currentSession) => {
      if (currentSession?.user) {
        // Log seguro que não expõe dados sensíveis em produção
        devLog("Auth state changed", { event, userId: currentSession.user.id });
        setSession(currentSession);
        setUser(currentSession.user);
        
        // Armazenamento criptografado de informações críticas
        if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
          secureSessionStore("admin_access_validated", isAdmin ? "true" : "false");
        }
      } else {
        // Limpeza segura de dados
        setSession(null);
        setUser(null);
        sessionStorage.clear();
      }
      
      setLoading(false);
    });

    // Cleanup
    return () => {
      subscription.unsubscribe();
    };
  }, []);

  return { user, session, loading };
}
```

## 2. Autorização

### 2.1 Row Level Security (RLS)

O sistema utiliza Políticas de Segurança em Nível de Linha (RLS) no PostgreSQL para restringir o acesso aos dados:

- Cada tabela possui políticas RLS que garantem que usuários só possam ver e interagir com seus próprios dados
- Administradores possuem acesso especial definido por políticas específicas
- Utilização de funções de segurança para verificar permissões de forma consistente

```sql
-- Exemplo de política RLS para a tabela de reservas
CREATE POLICY "Users can view their own bookings" 
  ON public.bookings 
  FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all bookings" 
  ON public.bookings 
  FOR SELECT 
  USING (is_admin_or_super());
```

### 2.2 Controle de Acesso Baseado em Papéis (RBAC)

- **Papéis de Usuário**:
  - Cliente: acesso básico para fazer e gerenciar suas próprias reservas
  - Administrador: acesso completo ao sistema, incluindo gerenciamento de salas, equipamentos e todas as reservas

- **Proteção de Rotas**:
  - Componente `ProtectedRoute` que verifica autenticação e papéis
  - Verificação contínua de permissões durante a sessão
  - Refresh periódico de claims de usuário para sincronizar permissões

```typescript
// Exemplo simplificado do componente ProtectedRoute
const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ 
  children, 
  requiredRole 
}) => {
  const { user, loading, refreshUserClaims } = useAuth();
  const [isAuthorized, setIsAuthorized] = useState<boolean | null>(null);

  useEffect(() => {
    const verifyAccess = async () => {
      if (!user) {
        setIsAuthorized(false);
        return;
      }

      try {
        // Refresh claims para garantir permissões atualizadas
        await refreshUserClaims();
        
        // Verificação de superadmin
        if (isSuperAdmin(user)) {
          setIsAuthorized(true);
          return;
        }

        // Verificação de papel específico
        if (requiredRole) {
          const userRole = user.user_metadata?.role;
          const isAdmin = user.user_metadata?.is_admin === true;
          
          if (requiredRole === "admin" && !isAdmin) {
            setIsAuthorized(false);
          } else if (requiredRole !== userRole && requiredRole !== "admin") {
            setIsAuthorized(false);
          } else {
            setIsAuthorized(true);
          }
        } else {
          setIsAuthorized(true);
        }
      } catch (error) {
        errorLog("Error verifying access", error);
        setIsAuthorized(false);
      }
    };

    verifyAccess();
  }, [user, requiredRole, refreshUserClaims]);

  // Redirecionamento para login ou página inicial baseado em permissões
  if (!isAuthorized) {
    // Implementação de redirecionamento seguro...
  }

  return <>{children}</>;
};
```

## 3. Criptografia e Proteção de Dados

### 3.1 Criptografia Client-Side

O sistema implementa criptografia no lado do cliente para dados sensíveis:

```typescript
// Exemplo do módulo de criptografia
export const encryptData = (data: string): string => {
  try {
    // Implementação real utiliza algoritmos de criptografia como AES
    // com chaves derivadas de forma segura
    return encryptedData;
  } catch (err) {
    errorLog("Encryption failed", err);
    return "";
  }
};

export const decryptData = (encryptedData: string): string => {
  try {
    // Implementação segura de descriptografia
    return decryptedData;
  } catch (err) {
    errorLog("Decryption failed", err);
    return "";
  }
};
```

### 3.2 Armazenamento Seguro de Sessão

O sistema utiliza técnicas seguras para armazenar informações de sessão críticas:

```typescript
// Exemplo de implementação de armazenamento seguro
export const secureSessionStore = (key: string, value: string): void => {
  try {
    const encryptedValue = encryptData(value);
    sessionStorage.setItem(key, encryptedValue);
  } catch (err) {
    errorLog("Failed to store session data", err);
  }
};

export const getSecureSessionItem = (key: string): string | null => {
  try {
    const encryptedValue = sessionStorage.getItem(key);
    if (!encryptedValue) return null;
    return decryptData(encryptedValue);
  } catch (err) {
    errorLog("Failed to retrieve session data", err);
    return null;
  }
};
```

## 4. Logging Seguro

O sistema implementa um mecanismo de logging que protege dados sensíveis, especialmente em ambiente de produção:

```typescript
// Sistema de logging com proteção de dados sensíveis
const isDev = import.meta.env.DEV || window.location.hostname === 'localhost';

export const devLog = (message: string, data?: any): void => {
  if (isDev) {
    if (data) {
      console.log(`[DEV] ${message}:`, data);
    } else {
      console.log(`[DEV] ${message}`);
    }
  }
};

export const errorLog = (message: string, error?: any): void => {
  if (isDev) {
    console.error(`[ERROR] ${message}:`, error);
  } else {
    // Em produção, não loga detalhes de erro potencialmente sensíveis
    console.error(`[ERROR] ${message}`);
  }
};
```

## 5. Proteção Contra Ataques Comuns

### 5.1 Limitação de Taxa (Rate Limiting)

- Implementação de proteção contra múltiplas tentativas de login
- Mecanismos para evitar sobrecarga de verificações de permissão

```typescript
// Exemplo de implementação de rate limiting para refresh de claims
export function useUserClaims() {
  const refreshUserClaims = useCallback(async () => {
    try {
      // Verifica timestamp do último refresh para prevenir abuso
      const lastRefreshStr = localStorage.getItem('last_claims_refresh');
      const lastRefresh = lastRefreshStr ? parseInt(decryptData(lastRefreshStr)) : 0;
      const now = Date.now();
      
      // Não permite refreshes mais frequentes que 60 segundos
      if (lastRefresh && (now - lastRefresh < 60000)) {
        devLog("Claims foram atualizadas recentemente, ignorando refresh");
        return;
      }
      
      // Implementa o refresh e armazena timestamp
      // ...
      
      localStorage.setItem('last_claims_refresh', encryptData(now.toString()));
    } catch (err) {
      errorLog("Error in refreshUserClaims", err);
    }
  }, []);

  return { refreshUserClaims };
}
```

### 5.2 Validação de Entradas

- Validação robusta de todos os campos de formulário usando ZOD ou outras bibliotecas
- Sanitização de entradas para prevenir injeção de SQL ou XSS

### 5.3 Proteção Contra CSRF

- Implementação de tokens de sessão e verificações adequadas
- Utilização de padrões seguros de autenticação do Supabase

## 6. Melhores Práticas Implementadas

1. **Princípio do Privilégio Mínimo**:
   - Usuários têm apenas as permissões necessárias para suas funções
   - Separação clara entre funções de administrador e cliente

2. **Defesa em Profundidade**:
   - Múltiplas camadas de verificação de segurança
   - Verificações de permissão tanto no cliente quanto no servidor (RLS)

3. **Segurança no Código**:
   - Evita exposição de informações sensíveis em logs
   - Tratamento adequado de erros sem vazamento de informações
   - Implementação de timeout para operações sensíveis

4. **Atualizações e Monitoramento**:
   - Verificação contínua do estado de autenticação
   - Refresh de claims de usuário para sincronização com o backend

## 7. Recomendações de Configuração

1. **Durante Desenvolvimento**:
   - Desativar confirmação por e-mail para agilizar testes
   - Utilizar logs detalhados para depuração (automaticamente habilitados em ambiente de desenvolvimento)

2. **Em Produção**:
   - Ativar confirmação por e-mail
   - Configurar domínios permitidos para redirecionamento de autenticação
   - Monitorar logs de autenticação para detectar atividades suspeitas

---

Este guia de segurança é um documento vivo que deve ser revisado e atualizado regularmente para garantir que o sistema permaneça seguro contra novas ameaças e vulnerabilidades.
