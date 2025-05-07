
# Diagrama Entidade-Relacionamento (ER)

Este documento apresenta o diagrama de entidade-relacionamento (ER) do sistema de reservas, detalhando as relações entre as diferentes tabelas do banco de dados.

## Diagrama ER Completo

```mermaid
erDiagram
    profiles ||--o{ bookings : "faz"
    profiles ||--o{ booking_equipment : "faz"
    rooms ||--o{ bookings : "é reservada em"
    rooms ||--o{ room_photos : "possui"
    rooms ||--o{ room_schedules : "possui agenda"
    rooms ||--o{ room_availability : "define disponibilidade"
    equipment ||--o{ booking_equipment : "é reservado em"
    equipment ||--o{ equipment_schedules : "possui agenda"
    equipment ||--o{ equipment_availability : "define disponibilidade"
    bookings ||--o{ booking_equipment : "inclui"
    bookings ||--o{ messages : "possui"
    
    profiles {
        uuid id PK
        text first_name
        text last_name
        user_role role
        text cpf
        text cnpj
        text crp
        text specialty
        text phone
        text cep
        text street
        text house_number
        text neighborhood
        text city
        text state
        timestamp created_at
        timestamp updated_at
    }
    
    rooms {
        uuid id PK
        text name
        text description
        numeric price_per_hour
        boolean has_wifi
        boolean has_ac
        boolean has_tables
        boolean has_chairs
        time open_time
        time close_time
        int[] open_days
        boolean is_active
        timestamp created_at
        timestamp updated_at
    }
    
    room_photos {
        uuid id PK
        uuid room_id FK
        text url
        timestamp created_at
    }
    
    room_schedules {
        uuid id PK
        uuid room_id FK
        weekday weekday
        time start_time
        time end_time
        timestamp created_at
        timestamp updated_at
    }
    
    room_availability {
        uuid id PK
        uuid room_id FK
        timestamp start_time
        timestamp end_time
        timestamp created_at
    }
    
    equipment {
        uuid id PK
        text name
        text description
        int quantity
        numeric price_per_hour
        boolean is_active
        time open_time
        time close_time
        weekday[] open_days
        timestamp created_at
        timestamp updated_at
    }
    
    equipment_schedules {
        uuid id PK
        uuid equipment_id FK
        weekday weekday
        time start_time
        time end_time
        timestamp created_at
        timestamp updated_at
    }
    
    equipment_availability {
        uuid id PK
        uuid equipment_id FK
        timestamp start_time
        timestamp end_time
        timestamp created_at
    }
    
    bookings {
        uuid id PK
        uuid user_id FK
        uuid room_id FK
        timestamp start_time
        timestamp end_time
        booking_status status
        numeric total_price
        timestamp created_at
        timestamp updated_at
    }
    
    booking_equipment {
        uuid id PK
        uuid booking_id FK
        uuid user_id FK
        uuid equipment_id FK
        int quantity
        timestamp start_time
        timestamp end_time
        booking_status status
        numeric total_price
        timestamp created_at
        timestamp updated_at
    }
    
    messages {
        uuid id PK
        uuid booking_id FK
        uuid sender_id
        text content
        timestamp created_at
    }
    
    company_profile {
        uuid id PK
        text name
        text street
        text number
        text neighborhood
        text city
    }
```

## Descrição das Relações

### Perfis e Reservas

- Um perfil (usuário) pode fazer múltiplas reservas de salas
- Um perfil pode fazer múltiplas reservas de equipamentos
- Um perfil é identificado por um ID único que referencia auth.users

### Salas e Reservas

- Uma sala pode ser reservada múltiplas vezes
- Uma sala pode ter múltiplas fotos
- Uma sala tem um cronograma de disponibilidade semanal (room_schedules)
- Uma sala pode ter períodos específicos de disponibilidade (room_availability)

### Equipamentos e Reservas

- Um equipamento pode ser reservado múltiplas vezes
- Um equipamento tem um cronograma de disponibilidade semanal (equipment_schedules)
- Um equipamento pode ter períodos específicos de disponibilidade (equipment_availability)

### Reservas e Equipamentos

- Uma reserva de sala pode incluir múltiplos equipamentos adicionais
- Equipamentos podem ser reservados independentemente (booking_equipment com booking_id nulo)
- Uma reserva pode ter múltiplas mensagens associadas

### Perfil da Empresa

- A tabela company_profile armazena informações sobre a empresa/clínica que gerencia o sistema
- É uma tabela singleton (normalmente contém apenas um registro)

## Observações Importantes

1. **Chaves Estrangeiras**: As relações entre tabelas são mantidas por chaves estrangeiras que garantem a integridade referencial dos dados.

2. **Tabelas de Agendamento**: As tabelas de agendamento (room_schedules, equipment_schedules) definem os horários regulares de disponibilidade por dia da semana.

3. **Tabelas de Disponibilidade**: As tabelas de disponibilidade (room_availability, equipment_availability) definem exceções ou períodos específicos de disponibilidade.

4. **Reservas Independentes de Equipamentos**: A tabela booking_equipment pode representar tanto equipamentos adicionais associados a uma reserva de sala (booking_id preenchido) quanto reservas independentes de equipamentos (booking_id nulo).

5. **Status das Reservas**: Tanto as reservas de salas quanto as de equipamentos possuem um status que pode ser 'pending', 'confirmed' ou 'cancelled'.

6. **Cálculo de Preço**: O preço total das reservas é calculado automaticamente com base no preço por hora e na duração da reserva.
