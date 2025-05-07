
# Sistema de Reservas - Documentação Completa

## Visão Geral do Sistema

Este sistema foi desenvolvido para gerenciar reservas de salas e equipamentos. Ele permite que usuários registrados façam reservas, enquanto administradores podem gerenciar salas, equipamentos, e aprovar ou recusar reservas.

## Arquitetura do Sistema

O sistema utiliza uma arquitetura cliente-servidor moderna:

- **Frontend**: React com TypeScript, utilizando Vite como bundler
- **Backend**: Supabase (PostgreSQL + APIs RESTful)
- **Autenticação**: Sistema de autenticação do Supabase
- **UI/UX**: Tailwind CSS e componentes Shadcn UI

### Diagrama de Arquitetura Simplificado

```
┌─────────────────┐     ┌─────────────────────┐     ┌─────────────────┐
│                 │     │                     │     │                 │
│   Cliente Web   │◄───►│   Supabase APIs     │◄───►│   PostgreSQL    │
│   (React/Vite)  │     │   (Auth, Storage)   │     │   Database      │
│                 │     │                     │     │                 │
└─────────────────┘     └─────────────────────┘     └─────────────────┘
```

## Funcionalidades Principais

### Para Usuários Clientes

1. **Autenticação**
   - Registro
   - Login/Logout
   - Recuperação de senha

2. **Perfil do Usuário**
   - Visualização e edição de dados pessoais
   - Histórico de reservas

3. **Reservas de Salas**
   - Visualização de salas disponíveis
   - Filtragem por características (WiFi, ar condicionado, etc.)
   - Seleção de data e horário
   - Reserva de salas com confirmação

4. **Reservas de Equipamentos**
   - Visualização de equipamentos disponíveis
   - Seleção de quantidade
   - Reserva com confirmação

5. **Gerenciamento de Reservas**
   - Visualização de reservas atuais e passadas
   - Cancelamento de reservas
   - Comunicação sobre reservas através de mensagens

### Para Administradores

1. **Painel Administrativo**
   - Dashboard com métricas
   - Controle total do sistema

2. **Gerenciamento de Salas**
   - Criação, edição e exclusão de salas
   - Configuração de disponibilidade e preços

3. **Gerenciamento de Equipamentos**
   - Cadastro, edição e exclusão de equipamentos
   - Controle de estoque e disponibilidade

4. **Controle de Reservas**
   - Aprovação ou rejeição de solicitações
   - Visualização e exportação de relatórios
   - Comunicação com usuários

5. **Gerenciamento de Usuários**
   - Visualização e edição de dados de usuários
   - Atribuição de papéis (admin, cliente)

## Estrutura de Banco de Dados

O banco de dados PostgreSQL gerenciado pelo Supabase contém as seguintes tabelas principais:

### Tabela: `profiles`

Armazena informações detalhadas sobre os usuários.

| Coluna          | Tipo           | Descrição                           |
|-----------------|----------------|-------------------------------------|
| id              | UUID           | Chave primária, referência auth.users |
| first_name      | TEXT           | Nome do usuário                     |
| last_name       | TEXT           | Sobrenome do usuário                |
| role            | user_role ENUM | Papel do usuário (admin, client)    |
| cpf             | TEXT           | CPF do usuário                      |
| cnpj            | TEXT           | CNPJ se for pessoa jurídica         |
| crp             | TEXT           | Registro profissional (para psicólogos) |
| specialty       | TEXT           | Especialidade profissional          |
| phone           | TEXT           | Telefone de contato                 |
| cep             | TEXT           | CEP                                 |
| street          | TEXT           | Rua                                 |
| house_number    | TEXT           | Número                              |
| neighborhood    | TEXT           | Bairro                              |
| city            | TEXT           | Cidade                              |
| state           | TEXT           | Estado                              |
| created_at      | TIMESTAMP      | Data de criação                     |
| updated_at      | TIMESTAMP      | Data de atualização                 |

### Tabela: `rooms`

Armazena informações sobre as salas disponíveis para reserva.

| Coluna           | Tipo           | Descrição                          |
|------------------|----------------|-----------------------------------|
| id               | UUID           | Chave primária                    |
| name             | TEXT           | Nome da sala                      |
| description      | TEXT           | Descrição da sala                 |
| price_per_hour   | NUMERIC        | Valor por hora                    |
| has_wifi         | BOOLEAN        | Possui WiFi                       |
| has_ac           | BOOLEAN        | Possui ar-condicionado            |
| has_tables       | BOOLEAN        | Possui mesas                      |
| has_chairs       | BOOLEAN        | Possui cadeiras                   |
| open_time        | TIME           | Horário de abertura               |
| close_time       | TIME           | Horário de fechamento             |
| open_days        | INTEGER[]      | Dias da semana disponíveis        |
| is_active        | BOOLEAN        | Se a sala está ativa              |
| created_at       | TIMESTAMP      | Data de criação                   |
| updated_at       | TIMESTAMP      | Data de atualização               |

### Tabela: `room_photos`

Armazena fotos das salas.

| Coluna           | Tipo           | Descrição                          |
|------------------|----------------|-----------------------------------|
| id               | UUID           | Chave primária                    |
| room_id          | UUID           | Referência à tabela rooms         |
| url              | TEXT           | URL da imagem                     |
| created_at       | TIMESTAMP      | Data de criação                   |

### Tabela: `room_schedules`

Armazena os horários de funcionamento das salas por dia da semana.

| Coluna           | Tipo           | Descrição                          |
|------------------|----------------|-----------------------------------|
| id               | UUID           | Chave primária                    |
| room_id          | UUID           | Referência à tabela rooms         |
| weekday          | WEEKDAY ENUM   | Dia da semana                     |
| start_time       | TIME           | Horário de início                 |
| end_time         | TIME           | Horário de término                |
| created_at       | TIMESTAMP      | Data de criação                   |
| updated_at       | TIMESTAMP      | Data de atualização               |

### Tabela: `room_availability`

Armazena períodos específicos de disponibilidade das salas.

| Coluna           | Tipo           | Descrição                          |
|------------------|----------------|-----------------------------------|
| id               | UUID           | Chave primária                    |
| room_id          | UUID           | Referência à tabela rooms         |
| start_time       | TIMESTAMP      | Início da disponibilidade         |
| end_time         | TIMESTAMP      | Fim da disponibilidade            |
| created_at       | TIMESTAMP      | Data de criação                   |

### Tabela: `equipment`

Armazena informações sobre os equipamentos disponíveis.

| Coluna           | Tipo           | Descrição                          |
|------------------|----------------|-----------------------------------|
| id               | UUID           | Chave primária                    |
| name             | TEXT           | Nome do equipamento               |
| description      | TEXT           | Descrição do equipamento          |
| quantity         | INTEGER        | Quantidade disponível             |
| price_per_hour   | NUMERIC        | Valor por hora                    |
| is_active        | BOOLEAN        | Se o equipamento está ativo       |
| open_time        | TIME           | Horário de disponibilidade início |
| close_time       | TIME           | Horário de disponibilidade fim    |
| open_days        | WEEKDAY ENUM[] | Dias disponíveis                  |
| created_at       | TIMESTAMP      | Data de criação                   |
| updated_at       | TIMESTAMP      | Data de atualização               |

### Tabela: `equipment_schedules`

Armazena os horários de disponibilidade dos equipamentos por dia da semana.

| Coluna           | Tipo           | Descrição                          |
|------------------|----------------|-----------------------------------|
| id               | UUID           | Chave primária                    |
| equipment_id     | UUID           | Referência à tabela equipment     |
| weekday          | WEEKDAY ENUM   | Dia da semana                     |
| start_time       | TIME           | Horário de início                 |
| end_time         | TIME           | Horário de término                |
| created_at       | TIMESTAMP      | Data de criação                   |
| updated_at       | TIMESTAMP      | Data de atualização               |

### Tabela: `equipment_availability`

Armazena períodos específicos de disponibilidade dos equipamentos.

| Coluna           | Tipo           | Descrição                          |
|------------------|----------------|-----------------------------------|
| id               | UUID           | Chave primária                    |
| equipment_id     | UUID           | Referência à tabela equipment     |
| start_time       | TIMESTAMP      | Início da disponibilidade         |
| end_time         | TIMESTAMP      | Fim da disponibilidade            |
| created_at       | TIMESTAMP      | Data de criação                   |

### Tabela: `bookings`

Armazena as reservas de salas.

| Coluna           | Tipo           | Descrição                          |
|------------------|----------------|-----------------------------------|
| id               | UUID           | Chave primária                    |
| user_id          | UUID           | Referência à tabela profiles      |
| room_id          | UUID           | Referência à tabela rooms         |
| start_time       | TIMESTAMP      | Data e hora de início             |
| end_time         | TIMESTAMP      | Data e hora de término            |
| status           | BOOKING_STATUS | Estado da reserva                 |
| total_price      | NUMERIC        | Valor total                       |
| created_at       | TIMESTAMP      | Data de criação                   |
| updated_at       | TIMESTAMP      | Data de atualização               |

### Tabela: `booking_equipment`

Armazena reservas de equipamentos, tanto independentes quanto associadas a reservas de salas.

| Coluna           | Tipo           | Descrição                          |
|------------------|----------------|-----------------------------------|
| id               | UUID           | Chave primária                    |
| booking_id       | UUID           | Referência à tabela bookings (opcional) |
| user_id          | UUID           | Referência à tabela profiles      |
| equipment_id     | UUID           | Referência à tabela equipment     |
| quantity         | INTEGER        | Quantidade reservada              |
| start_time       | TIMESTAMP      | Data e hora de início             |
| end_time         | TIMESTAMP      | Data e hora de término            |
| status           | BOOKING_STATUS | Estado da reserva                 |
| total_price      | NUMERIC        | Valor total                       |
| created_at       | TIMESTAMP      | Data de criação                   |
| updated_at       | TIMESTAMP      | Data de atualização               |

### Tabela: `messages`

Armazena mensagens relacionadas às reservas.

| Coluna           | Tipo           | Descrição                          |
|------------------|----------------|-----------------------------------|
| id               | UUID           | Chave primária                    |
| booking_id       | UUID           | Referência à tabela bookings      |
| sender_id        | UUID           | ID do remetente                   |
| content          | TEXT           | Conteúdo da mensagem              |
| created_at       | TIMESTAMP      | Data de criação                   |

### Tabela: `company_profile`

Armazena informações sobre a empresa/clínica.

| Coluna           | Tipo           | Descrição                          |
|------------------|----------------|-----------------------------------|
| id               | UUID           | Chave primária                    |
| name             | TEXT           | Nome da empresa                   |
| street           | TEXT           | Rua                               |
| number           | TEXT           | Número                            |
| neighborhood     | TEXT           | Bairro                            |
| city             | TEXT           | Cidade                            |

### Tipos ENUM

- **booking_status**: 'pending', 'confirmed', 'cancelled'
- **user_role**: 'admin', 'client'
- **weekday**: 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'

## Funções e Triggers do Banco de Dados

### Função: `calculate_booking_price()`

Calcula automaticamente o preço total de uma reserva de sala com base no preço por hora e na duração da reserva.

### Função: `calculate_equipment_booking_price()`

Calcula automaticamente o preço total de uma reserva de equipamento com base no preço por hora, quantidade e duração.

### Função: `check_equipment_availability()`

Verifica se há equipamentos suficientes disponíveis para uma reserva em determinado período.

### Função: `is_admin_or_super()`

Verifica se o usuário atual possui papel de administrador.

### Função: `is_owner_or_admin()`

Verifica se o usuário atual é o proprietário do registro ou se é administrador.

### Função: `handle_new_user()`

Cria automaticamente um perfil para novos usuários cadastrados.

## Estrutura de Arquivos Frontend

```
src/
├── components/      # Componentes reutilizáveis
│   ├── auth/        # Componentes relacionados à autenticação
│   ├── bookings/    # Componentes de reservas
│   ├── equipment/   # Componentes de equipamentos
│   ├── layout/      # Componentes de layout
│   ├── navbar/      # Componentes da barra de navegação
│   ├── profile/     # Componentes de perfil de usuário
│   ├── rooms/       # Componentes de salas
│   ├── shared/      # Componentes compartilhados
│   └── ui/          # Componentes de interface do usuário
├── contexts/        # Contextos React (AuthContext, etc.)
├── hooks/           # Hooks personalizados
├── integrations/    # Integrações com serviços externos
│   └── supabase/    # Configuração e tipos do Supabase
├── lib/             # Bibliotecas e utilitários
├── pages/           # Páginas da aplicação
│   ├── admin/       # Páginas administrativas
│   ├── auth/        # Páginas de autenticação
│   ├── client/      # Páginas para clientes
│   ├── equipment/   # Páginas de equipamentos
│   └── rooms/       # Páginas de salas
├── schemas/         # Schemas de validação
├── types/           # Definições de tipos TypeScript
├── utils/           # Funções utilitárias
```

## Mecanismos de Segurança

O sistema implementa os seguintes mecanismos de segurança:

1. **Autenticação**
   - Login seguro via Supabase Auth
   - Proteção de rotas baseada em papéis de usuário
   - Refresh automático de tokens de autenticação

2. **Autorização**
   - Row Level Security (RLS) no banco de dados
   - Verificação de permissões em tempo real
   - Proteção para áreas administrativas

3. **Criptografia**
   - Criptografia de dados sensíveis no cliente
   - Armazenamento seguro de informações de sessão
   - Proteção contra exposição de metadados de usuário

4. **Logs e Monitoramento**
   - Sistema de logs que diferencia ambiente de produção e desenvolvimento
   - Prevenção de exposição de dados sensíveis em logs de produção
   - Registro de ações críticas para auditoria

5. **Proteção Contra Ataques**
   - Limitação de taxa para tentativas de login
   - Proteção contra requisições excessivas
   - Validação de dados em todos os formulários

## Diagrama de Relacionamentos (ER)

```
┌─────────────┐       ┌───────────┐       ┌──────────────┐
│             │       │           │       │              │
│  profiles   │◄─────►│  bookings │◄─────►│ room_photos  │
│             │       │           │       │              │
└─────────────┘       └───────────┘       └──────────────┘
      ▲                   ▲   ▲
      │                   │   │
      │                   │   │
      │               ┌───────────┐       ┌──────────────┐
      │               │           │       │              │
      └───────────────┤ equipment │◄─────►│  messages    │
                      │           │       │              │
                      └───────────┘       └──────────────┘
```

## Fluxos Principais do Sistema

### Fluxo de Reserva de Sala

1. O usuário navega para a lista de salas
2. Filtra salas de acordo com necessidades
3. Seleciona uma sala disponível
4. Escolhe data e horário
5. Adiciona equipamentos opcionais
6. Confirma a reserva
7. Administrador aprova ou rejeita a reserva
8. Usuário recebe notificação

### Fluxo de Reserva de Equipamento

1. O usuário navega para a lista de equipamentos
2. Seleciona equipamento desejado
3. Escolhe data, horário e quantidade
4. Confirma a reserva
5. Administrador aprova ou rejeita a reserva
6. Usuário recebe notificação

## Considerações para Implantação

- O sistema utiliza Vite e React para desenvolvimento e build
- O banco de dados PostgreSQL é gerenciado pelo Supabase
- A autenticação é fornecida pelo Supabase Auth
- A API utiliza o cliente Supabase para comunicação com o backend
- É recomendável configurar monitoramento e alertas para operações críticas

---

## Glossário

- **RLS**: Row Level Security, mecanismo de segurança do PostgreSQL que restringe o acesso a linhas específicas em tabelas.
- **JWT**: JSON Web Token, utilizado para autenticação e troca segura de informações.
- **Admin**: Usuário com permissões administrativas no sistema.
- **Cliente**: Usuário padrão que pode fazer reservas no sistema.
- **Reserva**: Solicitação para uso de sala ou equipamento em um período específico.
- **Shadcn UI**: Biblioteca de componentes UI utilizada no frontend.
- **Tailwind CSS**: Framework CSS utilizado para estilização.
- **Enum**: Tipo de dados que consiste em um conjunto de valores constantes nomeados.
