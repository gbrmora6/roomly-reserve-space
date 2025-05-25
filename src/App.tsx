import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import ProtectedRoute from "@/components/auth/ProtectedRoute";

// Public pages
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import Login from "./pages/auth/Login";
import Register from "./pages/auth/Register";
import CreateSuperAdmin from "./pages/CreateSuperAdmin";
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

const queryClient = new QueryClient();

function App() {
  return (
    <Router>
      <AuthProvider>
        <QueryClientProvider client={queryClient}>
          <Toaster />
          <Routes>
            {/* Public routes */}
            <Route path="/" element={<Index />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/create-super-admin" element={<CreateSuperAdmin />} />
            <Route path="/payment/success" element={<PaymentSuccess />} />
            <Route path="/payment/canceled" element={<PaymentCanceled />} />
            <Route path="/payment-success" element={<PaymentSuccess />} />
            <Route path="/payment-instructions" element={<PaymentInstructions />} />

            {/* Client routes */}
            <Route path="/rooms" element={<RoomList />} />
            <Route path="/rooms/:id" element={<RoomDetail />} />
            <Route path="/equipment" element={<EquipmentList />} />
            <Route path="/equipment/:id" element={<Equipment />} />
            <Route path="/store" element={<ProductStore />} />
            <Route path="/store/product/:id" element={<ProductDetail />} />
            <Route
              path="/cart"
              element={
                <ProtectedRoute>
                  <Cart />
                </ProtectedRoute>
              }
            />
            <Route
              path="/checkout"
              element={
                <ProtectedRoute>
                  <Checkout />
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
                  <MyBookings />
                </ProtectedRoute>
              }
            />
            <Route
              path="/booking/:id"
              element={
                <ProtectedRoute>
                  <BookingDetails />
                </ProtectedRoute>
              }
            />

            {/* Admin routes */}
            <Route
              path="/admin/dashboard"
              element={
                <ProtectedRoute requiredRole="admin">
                  <Dashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/bookings"
              element={
                <ProtectedRoute requiredRole="admin">
                  <AdminBookings />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/equipment-bookings"
              element={
                <ProtectedRoute requiredRole="admin">
                  <EquipmentBookings />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/rooms"
              element={
                <ProtectedRoute requiredRole="admin">
                  <Rooms />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/rooms/new"
              element={
                <ProtectedRoute requiredRole="admin">
                  <RoomForm />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/rooms/:id"
              element={
                <ProtectedRoute requiredRole="admin">
                  <RoomForm />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/equipment"
              element={
                <ProtectedRoute requiredRole="admin">
                  <Equipment />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/equipment/new"
              element={
                <ProtectedRoute requiredRole="admin">
                  <EquipmentForm />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/equipment/:id"
              element={
                <ProtectedRoute requiredRole="admin">
                  <EquipmentForm />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/products"
              element={
                <ProtectedRoute requiredRole="admin">
                  <Products />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/clients"
              element={
                <ProtectedRoute requiredRole="admin">
                  <Clients />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/company-profile"
              element={
                <ProtectedRoute requiredRole="admin">
                  <CompanyProfile />
                </ProtectedRoute>
              }
            />

            {/* 404 */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </QueryClientProvider>
      </AuthProvider>
    </Router>
  );
}

export default App;
