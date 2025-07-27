import React from "react";
import { Route, Routes } from "react-router-dom";
import Index from "@/pages/Index";
import Login from "@/pages/auth/Login";
import Register from "@/pages/auth/Register";
import MyAccount from "@/pages/client/MyAccount";
import ProductStore from "@/pages/store/ProductStore";
import ProductDetail from "@/pages/store/ProductDetail";
import RoomList from "@/pages/rooms/RoomList";
import RoomDetail from "@/pages/rooms/RoomDetail";
import EquipmentList from "@/pages/equipment/EquipmentList";
import EquipmentDetail from "@/pages/equipment/EquipmentDetail";
import Cart from "@/pages/Cart";
import Checkout from "@/pages/Checkout";
import PaymentSuccess from "@/pages/PaymentSuccess";
import PaymentInstructions from "@/pages/PaymentInstructions";
import MyBookings from "@/pages/client/MyBookings";
import AdminLayout from "@/components/layout/AdminLayout";
import AdminRouter from "@/components/admin/AdminRouter";
import PaymentInstructionsById from "@/pages/PaymentInstructionsById";
import PaymentError from "@/pages/PaymentError";

function App() {
  return (
    <Routes>
      <Route path="/" element={<Index />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/profile" element={<MyAccount />} />
      <Route path="/rooms" element={<RoomList />} />
      <Route path="/room/:id" element={<RoomDetail />} />
      <Route path="/equipment" element={<EquipmentList />} />
      <Route path="/equipment/:id" element={<EquipmentDetail />} />
      <Route path="/products" element={<ProductStore />} />
      <Route path="/product/:id" element={<ProductDetail />} />
      <Route path="/cart" element={<Cart />} />
      <Route path="/checkout" element={<Checkout />} />
      <Route path="/payment-success" element={<PaymentSuccess />} />
      <Route path="/my-bookings" element={<MyBookings />} />
      <Route path="/admin/*" element={<AdminLayout><AdminRouter /></AdminLayout>} />
      <Route path="/payment-instructions" element={<PaymentInstructions />} />
      <Route path="/payment-instructions/:orderId" element={<PaymentInstructionsById />} />
      <Route path="/payment-error" element={<PaymentError />} />
    </Routes>
  );
}

export default App;
