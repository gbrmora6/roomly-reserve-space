import React from "react";
import { PageHeader } from "@/components/shared/PageHeader";
import { OrdersTable } from "@/components/admin/orders/OrdersTable";

const Orders: React.FC = () => {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Pedidos Completos"
        description="Gerencie todos os pedidos com visão unificada de salas, equipamentos e produtos"
      />
      <OrdersTable />
    </div>
  );
};

export default Orders;