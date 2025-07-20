import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { CartProvider } from "@/contexts/CartContext";
import ProtectedRoute from "@/components/auth/ProtectedRoute";
import ProfileCompletionGuard from "@/components/auth/ProfileCompletionGuard";
import FirstLoginHandler from "@/components/auth/FirstLoginHandler";

// Public pages
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import Login from "./pages/auth/Login";
import Register from "./pages/auth/Register";
import ForgotPassword from "./pages/auth/ForgotPassword";
import ResetPassword from "./pages/auth/ResetPassword";
import PaymentSuccess from "./pages/PaymentSuccess";
import PaymentCanceled from "./pages/PaymentCanceled";
import PaymentInstructions from "./pages/PaymentInstructions";

// Client pages
import RoomList from "./pages/rooms/RoomList";
import RoomDetail from "./pages/rooms/RoomDetail";
import EquipmentList from "./pages/equipment/EquipmentList";
import EquipmentDetail from "./pages/equipment/EquipmentDetail";
import ProductStore from "./pages/store/ProductStore";
import ProductDetail from "./pages/store/ProductDetail";
import Cart from "./pages/Cart";
import MyAccount from "./pages/client/MyAccount";
import MyBookings from "./pages/client/MyBookings";
import BookingDetails from "./pages/BookingDetails";
import Checkout from "./pages/Checkout";

// Admin pages
import AdminLayout from "./components/layout/AdminLayout";
import Dashboard from "./pages/admin/Dashboard";
import Rooms from "./pages/admin/Rooms";
import RoomForm from "./pages/admin/RoomForm";
import Equipment from "./pages/admin/Equipment";
import EquipmentForm from "./pages/admin/EquipmentForm";
import Products from "./pages/admin/Products";
import AdminBookings from "./pages/admin/AdminBookings";
import EquipmentBookings from "./pages/admin/EquipmentBookings";
import Clients from "./pages/admin/Clients";
import CompanyProfile from "./pages/admin/CompanyProfile";
import BranchesPage from "./pages/admin/Branches";
import AdminsPage from "./pages/admin/Admins";
import ProductSales from "./pages/admin/ProductSales";
import AdminUsers from "@/pages/admin/AdminUsers";
import TodayReservations from "@/pages/admin/TodayReservations";
import Coupons from "@/pages/admin/Coupons";
import FinancialReports from "@/pages/admin/FinancialReports";

import Inventory from "@/pages/admin/Inventory";
import AdminLogs from "@/pages/admin/AdminLogs";
import PaymentSettings from "@/pages/admin/PaymentSettings";
import ExpirationSettings from "@/pages/admin/ExpirationSettings";

const queryClient = new QueryClient();

function App() {
  return (
    <Router>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <CartProvider>
            <FirstLoginHandler>
              <Toaster />
          <Routes>
            {/* Public routes */}
            <Route path="/" element={<Index />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/payment/success" element={<PaymentSuccess />} />
            <Route path="/payment/canceled" element={<PaymentCanceled />} />
            <Route path="/payment-success" element={<PaymentSuccess />} />
            <Route path="/payment-instructions" element={<PaymentInstructions />} />

            {/* Client routes */}
            <Route path="/rooms" element={<RoomList />} />
            <Route path="/rooms/:id" element={<RoomDetail />} />
            <Route path="/equipment" element={<EquipmentList />} />
            <Route path="/equipment/:id" element={<EquipmentDetail />} />
            <Route path="/store" element={<ProductStore />} />
            <Route path="/store/product/:id" element={<ProductDetail />} />
            <Route
              path="/cart"
              element={
                <ProtectedRoute>
                  <ProfileCompletionGuard>
                    <Cart />
                  </ProfileCompletionGuard>
                </ProtectedRoute>
              }
            />
            <Route
              path="/checkout"
              element={
                <ProtectedRoute>
                  <ProfileCompletionGuard>
                    <Checkout />
                  </ProfileCompletionGuard>
                </ProtectedRoute>
              }
            />
            <Route
              path="/my-account"
              element={
                <ProtectedRoute>
                  <MyAccount />
                </ProtectedRoute>
              }
            />
            <Route
              path="/my-bookings"
              element={
                <ProtectedRoute>
                  <ProfileCompletionGuard>
                    <MyBookings />
                  </ProfileCompletionGuard>
                </ProtectedRoute>
              }
            />
            <Route
              path="/booking/:id"
              element={
                <ProtectedRoute>
                  <ProfileCompletionGuard>
                    <BookingDetails />
                  </ProfileCompletionGuard>
                </ProtectedRoute>
              }
            />

            {/* Admin routes - All wrapped with AdminLayout */}
            <Route
              path="/admin/*"
              element={
                <ProtectedRoute requiredRole="admin">
                  <AdminLayout>
                    <Routes>
                      <Route index element={<Dashboard />} />
                      <Route path="dashboard" element={<Dashboard />} />
                      <Route path="bookings" element={<AdminBookings />} />
                      <Route path="equipment-bookings" element={<EquipmentBookings />} />
                      <Route path="rooms" element={<Rooms />} />
                      <Route path="rooms/new" element={<RoomForm />} />
                      <Route path="rooms/:id" element={<RoomForm />} />
                      <Route path="equipment" element={<Equipment />} />
                      <Route path="equipment/new" element={<EquipmentForm />} />
                      <Route path="equipment/:id" element={<EquipmentForm />} />
                      <Route path="products" element={<Products />} />
                      <Route path="clients" element={<Clients />} />
                      <Route path="company-profile" element={<CompanyProfile />} />
                      <Route path="product-sales" element={<ProductSales />} />
                      <Route path="users" element={<AdminUsers />} />
                      <Route path="today-reservations" element={<TodayReservations />} />
                      <Route path="coupons" element={<Coupons />} />
                      <Route path="branches" element={<BranchesPage />} />
                      <Route path="financial-reports" element={<FinancialReports />} />

                      <Route path="inventory" element={<Inventory />} />
                      <Route path="logs" element={<AdminLogs />} />
                      <Route path="payment-settings" element={<PaymentSettings />} />
                      <Route path="expiration-settings" element={<ExpirationSettings />} />
                    </Routes>
                  </AdminLayout>
                </ProtectedRoute>
              }
            />

            {/* 404 */}
            <Route path="*" element={<NotFound />} />
            </Routes>
            </FirstLoginHandler>
          </CartProvider>
        </AuthProvider>
      </QueryClientProvider>
    </Router>
  );
}

export default App;
