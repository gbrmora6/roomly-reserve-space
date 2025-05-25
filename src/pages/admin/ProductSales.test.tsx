import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import ProductSales from "./ProductSales";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AuthContext } from "@/contexts/AuthContext";

const queryClient = new QueryClient();

const mockOrders = [
  {
    id: "1",
    user: { first_name: "João", last_name: "Silva", email: "joao@email.com" },
    created_at: new Date().toISOString(),
    status: "pending",
    total_amount: 100,
    order_items: [
      { quantity: 2, price_per_unit: 50, product: { name: "Produto A" } }
    ]
  },
  {
    id: "2",
    user: { first_name: "Maria", last_name: "Oliveira", email: "maria@email.com" },
    created_at: new Date().toISOString(),
    status: "paid",
    total_amount: 200,
    order_items: [
      { quantity: 1, price_per_unit: 200, product: { name: "Produto B" } }
    ]
  }
];

jest.mock("@/hooks/useBranchFilter", () => ({
  useBranchFilter: () => ({ branchId: "1", setBranchId: jest.fn(), branches: [{ id: "1", name: "Filial 1" }], isSuperAdmin: true })
}));

jest.mock("@tanstack/react-query", () => {
  const original = jest.requireActual("@tanstack/react-query");
  return {
    ...original,
    useQuery: () => ({ data: mockOrders, isLoading: false, error: null, refetch: jest.fn() })
  };
});

describe("ProductSales", () => {
  it("renderiza cards de resumo e tabela", () => {
    render(
      <QueryClientProvider client={queryClient}>
        <ProductSales />
      </QueryClientProvider>
    );
    expect(screen.getByText("Total de Vendas")).toBeInTheDocument();
    expect(screen.getByText("Faturamento")).toBeInTheDocument();
    expect(screen.getByText("Pagas")).toBeInTheDocument();
    expect(screen.getByText("Pendentes")).toBeInTheDocument();
    expect(screen.getByText("Canceladas")).toBeInTheDocument();
    expect(screen.getByText("João Silva")).toBeInTheDocument();
    expect(screen.getByText("Maria Oliveira")).toBeInTheDocument();
  });

  it("filtra pedidos pela busca", () => {
    render(
      <QueryClientProvider client={queryClient}>
        <ProductSales />
      </QueryClientProvider>
    );
    const input = screen.getByPlaceholderText(/buscar por nome/i);
    fireEvent.change(input, { target: { value: "Maria" } });
    expect(screen.getByText("Maria Oliveira")).toBeInTheDocument();
    expect(screen.queryByText("João Silva")).not.toBeInTheDocument();
  });

  it("exibe detalhes do pedido ao clicar no botão", async () => {
    render(
      <QueryClientProvider client={queryClient}>
        <ProductSales />
      </QueryClientProvider>
    );
    const btns = screen.getAllByTitle("Ver detalhes");
    fireEvent.click(btns[0]);
    await waitFor(() => {
      expect(screen.getByText(/Detalhes do Pedido/i)).toBeInTheDocument();
      expect(screen.getByText(/João Silva/)).toBeInTheDocument();
    });
  });

  it("só superadmin pode exportar e alterar status", () => {
    jest.resetModules();
    jest.doMock("@/hooks/useBranchFilter", () => ({
      useBranchFilter: () => ({ branchId: "1", setBranchId: jest.fn(), branches: [{ id: "1", name: "Filial 1" }], isSuperAdmin: false })
    }));
    const ProductSalesNoSuper = require("./ProductSales").default;
    render(
      <QueryClientProvider client={queryClient}>
        <ProductSalesNoSuper />
      </QueryClientProvider>
    );
    expect(screen.getByText(/Somente superadmin pode exportar/)).toBeInTheDocument();
    expect(screen.getAllByTitle("Apenas superadmin")[0]).toBeDisabled();
  });
}); 