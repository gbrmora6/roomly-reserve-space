import React from "react";
import { Routes, Route } from "react-router-dom";
import AdminLayout from "@/components/layout/AdminLayout";
import Dashboard from "@/pages/admin/Dashboard";
import AdminBookings from "@/pages/admin/AdminBookings";
import EquipmentBookings from "@/pages/admin/EquipmentBookings";
import Rooms from "@/pages/admin/Rooms";
import Equipment from "@/pages/admin/Equipment";
import RoomForm from "@/pages/admin/RoomForm";
import EquipmentForm from "@/pages/admin/EquipmentForm";
import Clients from "@/pages/admin/Clients";
import Admins from "@/pages/admin/Admins";
import Branches from "@/pages/admin/Branches";
import Products from "@/pages/admin/Products";
import ProductSales from "@/pages/admin/ProductSales";
import Inventory from "@/pages/admin/Inventory";
import Coupons from "@/pages/admin/Coupons";
import CompanyProfile from "@/pages/admin/CompanyProfile";
import PaymentSettings from "@/pages/admin/PaymentSettings";
import ExpirationSettings from "@/pages/admin/ExpirationSettings";
import FinancialReports from "@/pages/admin/FinancialReports";
import AdminLogs from "@/pages/admin/AdminLogs";
import ChangeHistory from "@/pages/admin/ChangeHistory";
import SecurityAudit from "@/pages/admin/SecurityAudit";
import SecurityPermissions from "@/pages/admin/SecurityPermissions";
import TodayReservations from "@/pages/admin/TodayReservations";
import AdminUsers from "@/pages/admin/AdminUsers";
import Notifications from "@/pages/admin/Notifications";

const AdminRouter: React.FC = () => {
  return (
    <AdminLayout>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/bookings" element={<AdminBookings />} />
        <Route path="/equipment-bookings" element={<EquipmentBookings />} />
        <Route path="/rooms" element={<Rooms />} />
        <Route path="/rooms/new" element={<RoomForm />} />
        <Route path="/rooms/edit/:id" element={<RoomForm />} />
        <Route path="/equipment" element={<Equipment />} />
        <Route path="/equipment/new" element={<EquipmentForm />} />
        <Route path="/equipment/edit/:id" element={<EquipmentForm />} />
        <Route path="/clients" element={<Clients />} />
        <Route path="/admins" element={<Admins />} />
        <Route path="/branches" element={<Branches />} />
        <Route path="/products" element={<Products />} />
        <Route path="/product-sales" element={<ProductSales />} />
        <Route path="/inventory" element={<Inventory />} />
        <Route path="/coupons" element={<Coupons />} />
        <Route path="/company-profile" element={<CompanyProfile />} />
        <Route path="/payment-settings" element={<PaymentSettings />} />
        <Route path="/expiration-settings" element={<ExpirationSettings />} />
        <Route path="/financial-reports" element={<FinancialReports />} />
        <Route path="/logs" element={<AdminLogs />} />
        <Route path="/change-history" element={<ChangeHistory />} />
        <Route path="/security-audit" element={<SecurityAudit />} />
        <Route path="/security-permissions" element={<SecurityPermissions />} />
        <Route path="/today-reservations" element={<TodayReservations />} />
        <Route path="/users" element={<AdminUsers />} />
        <Route path="/notifications" element={<Notifications />} />
      </Routes>
    </AdminLayout>
  );
};

export default AdminRouter;