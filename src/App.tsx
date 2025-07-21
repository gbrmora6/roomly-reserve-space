import React from "react";
import { BrowserRouter as Router, Route, Routes } from "react-router-dom";
import Index from "@/pages/Index";
import Login from "@/pages/auth/Login";
import Register from "@/pages/auth/Register";
import MyAccount from "@/pages/client/MyAccount";
import ProductStore from "@/pages/store/ProductStore";
import ProductDetail from "@/pages/store/ProductDetail";
import Cart from "@/pages/Cart";
import Checkout from "@/pages/Checkout";
import PaymentSuccess from "@/pages/PaymentSuccess";
import PaymentInstructions from "@/pages/PaymentInstructions";
import MyBookings from "@/pages/client/MyBookings";
import Dashboard from "@/pages/admin/Dashboard";
import PaymentInstructionsById from "@/pages/PaymentInstructionsById";

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Index />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/profile" element={<MyAccount />} />
        <Route path="/products" element={<ProductStore />} />
        <Route path="/product/:id" element={<ProductDetail />} />
        <Route path="/cart" element={<Cart />} />
        <Route path="/checkout" element={<Checkout />} />
        <Route path="/payment-success" element={<PaymentSuccess />} />
        <Route path="/my-bookings" element={<MyBookings />} />
        <Route path="/admin/*" element={<Dashboard />} />
        <Route path="/payment-instructions" element={<PaymentInstructions />} />
        <Route path="/payment-instructions/:orderId" element={<PaymentInstructionsById />} />
      </Routes>
    </Router>
  );
}

export default App;
