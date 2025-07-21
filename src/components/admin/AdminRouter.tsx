
import React from 'react';
import { Routes, Route } from 'react-router-dom';
import Dashboard from '@/pages/admin/Dashboard';
import AdminRooms from '@/pages/admin/Rooms';
import AdminRoomForm from '@/pages/admin/RoomForm';
import AdminEquipment from '@/pages/admin/Equipment';
import AdminEquipmentForm from '@/pages/admin/EquipmentForm';
import AdminBookings from '@/pages/admin/AdminBookings';
import AdminUsers from '@/pages/admin/AdminUsers';
import AdminLogs from '@/pages/admin/AdminLogs';
import TodayReservations from '@/pages/admin/TodayReservations';
import EquipmentBookings from '@/pages/admin/EquipmentBookings';
import CompanyProfile from '@/pages/admin/CompanyProfile';
import PaymentSettings from '@/pages/admin/PaymentSettings';
import Products from '@/pages/admin/Products';
import ProductSales from '@/pages/admin/ProductSales';
import ChangeHistory from '@/pages/admin/ChangeHistory';
import Notifications from '@/pages/admin/Notifications';
import ExpirationSettings from '@/pages/admin/ExpirationSettings';
import SecurityAudit from '@/pages/admin/SecurityAudit';
import SecurityPermissions from '@/pages/admin/SecurityPermissions';
import FinancialReports from '@/pages/admin/FinancialReports';
import Branches from '@/pages/admin/Branches';
import Clients from '@/pages/admin/Clients';
import Admins from '@/pages/admin/Admins';
import Coupons from '@/pages/admin/Coupons';
import Inventory from '@/pages/admin/Inventory';

const AdminRouter: React.FC = () => {
  return (
    <Routes>
      <Route path="dashboard" element={<Dashboard />} />
      <Route path="rooms" element={<AdminRooms />} />
      <Route path="rooms/new" element={<AdminRoomForm />} />
      <Route path="rooms/:id" element={<AdminRoomForm />} />
      <Route path="equipment" element={<AdminEquipment />} />
      <Route path="equipment/new" element={<AdminEquipmentForm />} />
      <Route path="equipment/:id" element={<AdminEquipmentForm />} />
      <Route path="bookings" element={<AdminBookings />} />
      <Route path="users" element={<AdminUsers />} />
      <Route path="logs" element={<AdminLogs />} />
      <Route path="today-reservations" element={<TodayReservations />} />
      <Route path="equipment-bookings" element={<EquipmentBookings />} />
      <Route path="company-profile" element={<CompanyProfile />} />
      <Route path="payment-settings" element={<PaymentSettings />} />
      <Route path="products" element={<Products />} />
      <Route path="product-sales" element={<ProductSales />} />
      <Route path="change-history" element={<ChangeHistory />} />
      <Route path="notifications" element={<Notifications />} />
      <Route path="expiration-settings" element={<ExpirationSettings />} />
      <Route path="security-audit" element={<SecurityAudit />} />
      <Route path="security-permissions" element={<SecurityPermissions />} />
      <Route path="financial-reports" element={<FinancialReports />} />
      <Route path="branches" element={<Branches />} />
      <Route path="clients" element={<Clients />} />
      <Route path="admins" element={<Admins />} />
      <Route path="coupons" element={<Coupons />} />
      <Route path="inventory" element={<Inventory />} />
    </Routes>
  );
};

export default AdminRouter;
