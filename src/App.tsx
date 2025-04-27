import React from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import Index from "./pages/Index";
import Login from "./pages/auth/Login";
import Register from "./pages/auth/Register";
import RoomList from "./pages/rooms/RoomList";
import NotFound from "./pages/NotFound";
import AdminDashboard from "./pages/admin/Dashboard";
import AdminRooms from "./pages/admin/Rooms";
import AdminRoomForm from "./pages/admin/RoomForm";
import AdminEquipment from "./pages/admin/Equipment";
import AdminEquipmentForm from "./pages/admin/EquipmentForm";
import AdminBookings from "./pages/admin/AdminBookings";
import CompanyProfile from "./pages/admin/CompanyProfile";
import Clients from "./pages/admin/Clients";
import AdminLayout from "./components/layout/AdminLayout";
import ProtectedRoute from "./components/auth/ProtectedRoute";

const queryClient = new QueryClient();

const App = () => (
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <BrowserRouter>
          <AuthProvider>
            <Toaster />
            <Sonner />
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route path="/rooms" element={<RoomList />} />
              
              {/* Rotas do Administrador */}
              <Route path="/admin" element={
                <ProtectedRoute requiredRole="admin">
                  <AdminLayout />
                </ProtectedRoute>
              }>
                <Route index element={<AdminDashboard />} />
                <Route path="company-profile" element={<CompanyProfile />} />
                <Route path="rooms" element={<AdminRooms />} />
                <Route path="rooms/new" element={<AdminRoomForm />} />
                <Route path="rooms/:id" element={<AdminRoomForm />} />
                <Route path="equipment" element={<AdminEquipment />} />
                <Route path="equipment/new" element={<AdminEquipmentForm />} />
                <Route path="equipment/:id" element={<AdminEquipmentForm />} />
                <Route path="bookings" element={<AdminBookings />} />
                <Route path="clients" element={<Clients />} />
              </Route>
              
              <Route path="*" element={<NotFound />} />
            </Routes>
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  </React.StrictMode>
);

export default App;
