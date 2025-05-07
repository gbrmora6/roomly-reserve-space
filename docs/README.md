
# Sistema de Reservas - Documentação

Esta pasta contém a documentação completa do Sistema de Reservas, que permite o gerenciamento de reservas de salas e equipamentos com um controle administrativo abrangente.

## Conteúdo da Documentação

1. **[Documentação Completa do Sistema](system_documentation.md)**  
   Visão geral de todas as funcionalidades e componentes do sistema.

2. **[Fluxos de Reserva](fluxo_reservas.md)**  
   Diagramas e explicações dos fluxos de reserva para usuários e administradores.

3. **[Diagrama ER do Banco de Dados](diagrama_er.md)**  
   Documentação detalhada da estrutura do banco de dados e relacionamentos.

4. **[Guia de Segurança](guia_seguranca.md)**  
   Mecanismos de segurança implementados no sistema.

5. **[Guia da API Supabase](guia_api_supabase.md)**  
   Detalhes sobre a integração com Supabase e exemplos de uso.

## Como Utilizar Esta Documentação

- Comece pela **Documentação Completa** para obter uma visão geral do sistema
- Consulte os **Diagramas ER** para entender a estrutura do banco de dados
- Veja os **Fluxos de Reserva** para entender o funcionamento do sistema
- Consulte o **Guia de Segurança** para entender as proteções implementadas
- Use o **Guia da API** como referência para o desenvolvimento

## Arquitetura do Sistema

```
Frontend (React + TypeScript)
    ↓↑
Supabase (PostgreSQL + APIs RESTful)
```

### Principais Tecnologias

- **Frontend**: React, TypeScript, Tailwind CSS, Shadcn/UI
- **Backend**: Supabase (PostgreSQL)
- **Autenticação**: Supabase Auth
- **Estado**: Context API, TanStack Query
- **Estilização**: Tailwind CSS
