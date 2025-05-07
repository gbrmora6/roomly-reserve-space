
# Fluxos de Reserva do Sistema

## Fluxo de Reserva para Clientes

### Reserva de Sala

```mermaid
sequenceDiagram
    actor Cliente
    participant Sistema
    participant Supabase
    participant Admin
    
    Cliente->>Sistema: Acessa lista de salas
    Sistema->>Supabase: Consulta salas disponíveis
    Supabase-->>Sistema: Retorna salas disponíveis
    Sistema-->>Cliente: Exibe salas com filtros
    
    Cliente->>Sistema: Seleciona sala
    Sistema->>Supabase: Verifica disponibilidade
    Supabase-->>Sistema: Confirma disponibilidade
    Sistema-->>Cliente: Exibe formulário de reserva
    
    Cliente->>Sistema: Seleciona data e horário
    Cliente->>Sistema: Adiciona equipamentos (opcional)
    Cliente->>Sistema: Confirma reserva
    
    Sistema->>Supabase: Cria reserva (status: pending)
    Supabase-->>Sistema: Confirma criação
    Sistema-->>Cliente: Exibe confirmação
    
    Note over Admin,Supabase: Fluxo de Aprovação
    Admin->>Sistema: Acessa painel de aprovações
    Sistema->>Supabase: Lista reservas pendentes
    Supabase-->>Sistema: Retorna reservas pendentes
    Sistema-->>Admin: Exibe reservas pendentes
    
    Admin->>Sistema: Aprova/Rejeita reserva
    Sistema->>Supabase: Atualiza status da reserva
    Supabase-->>Sistema: Confirma atualização
    
    Note over Cliente,Sistema: Notificação
    Sistema->>Cliente: Notifica sobre aprovação/rejeição
```

### Reserva de Equipamento

```mermaid
sequenceDiagram
    actor Cliente
    participant Sistema
    participant Supabase
    participant Admin
    
    Cliente->>Sistema: Acessa lista de equipamentos
    Sistema->>Supabase: Consulta equipamentos disponíveis
    Supabase-->>Sistema: Retorna equipamentos disponíveis
    Sistema-->>Cliente: Exibe equipamentos
    
    Cliente->>Sistema: Seleciona equipamento
    Sistema->>Supabase: Verifica disponibilidade
    Supabase-->>Sistema: Confirma disponibilidade
    Sistema-->>Cliente: Exibe formulário de reserva
    
    Cliente->>Sistema: Seleciona data, hora e quantidade
    Cliente->>Sistema: Confirma reserva
    
    Sistema->>Supabase: Cria reserva de equipamento (status: pending)
    Supabase-->>Sistema: Confirma criação
    Sistema-->>Cliente: Exibe confirmação
    
    Note over Admin,Supabase: Fluxo de Aprovação
    Admin->>Sistema: Acessa painel de aprovações
    Sistema->>Supabase: Lista reservas pendentes
    Supabase-->>Sistema: Retorna reservas pendentes
    Sistema-->>Admin: Exibe reservas pendentes
    
    Admin->>Sistema: Aprova/Rejeita reserva
    Sistema->>Supabase: Atualiza status da reserva
    Supabase-->>Sistema: Confirma atualização
    
    Note over Cliente,Sistema: Notificação
    Sistema->>Cliente: Notifica sobre aprovação/rejeição
```

## Fluxo para Administradores

### Gerenciamento de Salas

```mermaid
sequenceDiagram
    actor Admin
    participant Sistema
    participant Supabase
    
    Admin->>Sistema: Acessa painel administrativo
    Sistema->>Supabase: Verifica permissões
    Supabase-->>Sistema: Confirma permissões
    Sistema-->>Admin: Exibe painel administrativo
    
    Admin->>Sistema: Acessa gerenciamento de salas
    Sistema->>Supabase: Lista salas existentes
    Supabase-->>Sistema: Retorna lista de salas
    Sistema-->>Admin: Exibe lista de salas
    
    alt Criar Nova Sala
        Admin->>Sistema: Clica em "Nova Sala"
        Sistema-->>Admin: Exibe formulário de criação
        Admin->>Sistema: Preenche detalhes da sala
        Admin->>Sistema: Adiciona fotos
        Admin->>Sistema: Configura disponibilidade
        Admin->>Sistema: Salva nova sala
        Sistema->>Supabase: Cria nova sala
        Supabase-->>Sistema: Confirma criação
        Sistema-->>Admin: Exibe confirmação
    else Editar Sala Existente
        Admin->>Sistema: Seleciona sala para editar
        Sistema->>Supabase: Busca detalhes da sala
        Supabase-->>Sistema: Retorna detalhes
        Sistema-->>Admin: Exibe formulário de edição
        Admin->>Sistema: Modifica campos desejados
        Admin->>Sistema: Salva alterações
        Sistema->>Supabase: Atualiza sala
        Supabase-->>Sistema: Confirma atualização
        Sistema-->>Admin: Exibe confirmação
    else Desativar Sala
        Admin->>Sistema: Seleciona sala para desativar
        Sistema-->>Admin: Pede confirmação
        Admin->>Sistema: Confirma desativação
        Sistema->>Supabase: Desativa sala (is_active = false)
        Supabase-->>Sistema: Confirma desativação
        Sistema-->>Admin: Exibe confirmação
    end
```

### Gerenciamento de Reservas

```mermaid
sequenceDiagram
    actor Admin
    participant Sistema
    participant Supabase
    
    Admin->>Sistema: Acessa painel de reservas
    Sistema->>Supabase: Lista todas as reservas
    Supabase-->>Sistema: Retorna reservas
    Sistema-->>Admin: Exibe lista filtrada de reservas
    
    Admin->>Sistema: Aplica filtros (status, data, etc.)
    Sistema->>Supabase: Consulta reservas com filtros
    Supabase-->>Sistema: Retorna reservas filtradas
    Sistema-->>Admin: Exibe reservas filtradas
    
    alt Aprovar Reserva
        Admin->>Sistema: Clica em "Aprovar"
        Sistema->>Supabase: Atualiza status para "confirmed"
        Supabase-->>Sistema: Confirma atualização
        Sistema-->>Admin: Atualiza interface
    else Rejeitar Reserva
        Admin->>Sistema: Clica em "Rejeitar"
        Sistema-->>Admin: Solicita motivo da rejeição
        Admin->>Sistema: Fornece motivo
        Sistema->>Supabase: Atualiza status para "cancelled"
        Supabase-->>Sistema: Confirma atualização
        Sistema-->>Admin: Atualiza interface
    else Ver Detalhes
        Admin->>Sistema: Clica em "Detalhes"
        Sistema->>Supabase: Busca detalhes completos
        Supabase-->>Sistema: Retorna detalhes
        Sistema-->>Admin: Exibe modal de detalhes
    else Enviar Mensagem
        Admin->>Sistema: Clica em "Mensagem"
        Sistema-->>Admin: Exibe campo de mensagem
        Admin->>Sistema: Escreve e envia mensagem
        Sistema->>Supabase: Salva mensagem
        Supabase-->>Sistema: Confirma salvamento
        Sistema-->>Admin: Atualiza interface
    end
```

## Fluxo de Autenticação e Segurança

```mermaid
sequenceDiagram
    actor Usuário
    participant Frontend
    participant Supabase
    
    alt Registro
        Usuário->>Frontend: Acessa página de registro
        Frontend-->>Usuário: Exibe formulário de registro
        Usuário->>Frontend: Preenche dados e submete
        Frontend->>Supabase: Envia dados de registro
        Supabase->>Supabase: Cria novo usuário
        Supabase->>Supabase: Trigger cria perfil
        Supabase-->>Frontend: Retorna token de autenticação
        Frontend->>Frontend: Armazena token de sessão
        Frontend-->>Usuário: Redireciona para dashboard
    else Login
        Usuário->>Frontend: Acessa página de login
        Frontend-->>Usuário: Exibe formulário de login
        Usuário->>Frontend: Preenche credenciais e submete
        Frontend->>Supabase: Envia credenciais
        Supabase->>Supabase: Verifica credenciais
        Supabase-->>Frontend: Retorna token de autenticação
        Frontend->>Frontend: Armazena token de sessão
        Frontend-->>Usuário: Redireciona para dashboard
        
        Note over Frontend,Supabase: Verificação de papel do usuário
        Frontend->>Supabase: Solicita refresh de claims
        Supabase->>Supabase: Verifica papel no perfil
        Supabase-->>Frontend: Atualiza claims JWT
        Frontend->>Frontend: Atualiza AuthContext
    else Acesso a Rota Protegida
        Usuário->>Frontend: Tenta acessar rota protegida
        Frontend->>Frontend: ProtectedRoute verifica autenticação
        
        alt Usuário Autenticado
            Frontend->>Frontend: Verifica permissões necessárias
            
            alt Permissão Suficiente
                Frontend-->>Usuário: Renderiza conteúdo protegido
            else Permissão Insuficiente
                Frontend-->>Usuário: Redireciona para página inicial
                Frontend-->>Usuário: Exibe mensagem de erro
            end
        else Usuário Não Autenticado
            Frontend-->>Usuário: Redireciona para login
        end
    else Logout
        Usuário->>Frontend: Clica em logout
        Frontend->>Supabase: Invalida sessão
        Supabase-->>Frontend: Confirma logout
        Frontend->>Frontend: Limpa dados de sessão
        Frontend-->>Usuário: Redireciona para página inicial
    end
```
