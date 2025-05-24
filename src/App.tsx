
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
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

// Client pages
import RoomList from "./pages/rooms/RoomList";
import EquipmentList from "./pages/equipment/EquipmentList";
import ProductStore from "./pages/store/ProductStore";
import ProductDetail from "./pages/store/ProductDetail";
import Cart from "./pages/Cart";
import MyAccount from "./pages/client/MyAccount";
import MyBookings from "./pages/client/MyBookings";
import BookingDetails from "./pages/BookingDetails";

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
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthProvider>
          <TooltipProvider>
            <Toaster />
            <Sonner />
            <Routes>
              {/* Public routes */}
              <Route path="/" element={<Index />} />
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route path="/create-super-admin" element={<CreateSuperAdmin />} />
              <Route path="/payment/success" element={<PaymentSuccess />} />
              <Route path="/payment/canceled" element={<PaymentCanceled />} />

              {/* Client routes */}
              <Route path="/rooms" element={<RoomList />} />
              <Route path="/equipment" element={<EquipmentList />} />
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
                path="/admin/*"
                element={
                  <ProtectedRoute requireAdmin>
                    <AdminLayout>
                      <Routes>
                        <Route path="/" element={<Dashboard />} />
                        <Route path="/rooms" element={<Rooms />} />
                        <Route path="/rooms/new" element={<RoomForm />} />
                        <Route path="/rooms/edit/:id" element={<RoomForm />} />
                        <Route path="/equipment" element={<Equipment />} />
                        <Route path="/equipment/new" element={<EquipmentForm />} />
                        <Route path="/equipment/edit/:id" element={<EquipmentForm />} />
                        <Route path="/products" element={<Products />} />
                        <Route path="/bookings" element={<AdminBookings />} />
                        <Route path="/equipment-bookings" element={<EquipmentBookings />} />
                        <Route path="/clients" element={<Clients />} />
                        <Route path="/company-profile" element={<CompanyProfile />} />
                      </Routes>
                    </AdminLayout>
                  </ProtectedRoute>
                }
              />

              {/* 404 */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </TooltipProvider>
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  );
}

export default App;
