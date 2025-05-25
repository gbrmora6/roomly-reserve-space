# Vendas de Produtos (Admin)

## Visão Geral
Esta página permite que administradores e superadmins visualizem, filtrem e gerenciem todos os pedidos de produtos realizados na plataforma.

## Funcionalidades
- **Resumo dos pedidos**: cards com total de vendas, faturamento, pagas, pendentes e canceladas (com tooltips explicativos).
- **Busca**: por nome ou e-mail do cliente.
- **Paginação**: navegação entre páginas de pedidos.
- **Tabela detalhada**: cliente, e-mail, data, produtos, valor total, status e ações.
- **Ações administrativas**:
  - Ver detalhes do pedido (modal)
  - Cancelar pedido (apenas superadmin)
  - Marcar como pago (apenas superadmin)
- **Exportação para Excel**: apenas superadmin pode exportar.
- **Notificações**: toast automático ao receber novo pedido.
- **Responsividade**: layout adaptado para desktop e mobile.

## Permissões
- **Superadmin**: pode exportar, cancelar e marcar pedidos como pagos.
- **Admin comum**: apenas visualiza, não pode executar ações sensíveis.

## Dicas de manutenção
- Para alterar filtros, cards ou colunas, edite `ProductSales.tsx`.
- Para ajustar permissões, veja o uso de `isSuperAdmin`.
- Para adicionar novos status, ajuste as funções `translateStatus` e `statusForTab`.

## Testes
- Os testes estão em `ProductSales.test.tsx`.
- Para rodar:
  ```bash
  npm install --save-dev @testing-library/react @testing-library/jest-dom @types/jest jest
  npm test
  ```
- Os testes cobrem:
  - Renderização dos cards e tabela
  - Busca e paginação
  - Modal de detalhes
  - Permissões de superadmin

## Observações
- O polling para novos pedidos é de 30 segundos.
- A exportação gera um arquivo Excel com todos os pedidos filtrados.
- O layout utiliza Tailwind, shadcn-ui e React. 