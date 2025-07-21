import React from "react";
import { BrowserRouter as Router, Route, Routes } from "react-router-dom";
import Home from "@/pages/Home";
import Login from "@/pages/Login";
import Register from "@/pages/Register";
import Profile from "@/pages/Profile";
import Products from "@/pages/Products";
import ProductDetails from "@/pages/ProductDetails";
import Cart from "@/pages/Cart";
import Checkout from "@/pages/Checkout";
import PaymentSuccess from "@/pages/PaymentSuccess";
import PaymentInstructions from "@/pages/PaymentInstructions";
import MyBookings from "@/pages/client/MyBookings";
import AdminDashboard from "@/pages/admin/AdminDashboard";
import PaymentInstructionsById from "@/pages/PaymentInstructionsById";

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/products" element={<Products />} />
        <Route path="/product/:id" element={<ProductDetails />} />
        <Route path="/cart" element={<Cart />} />
        <Route path="/checkout" element={<Checkout />} />
        <Route path="/payment-success" element={<PaymentSuccess />} />
        <Route path="/my-bookings" element={<MyBookings />} />
        <Route path="/admin/*" element={<AdminDashboard />} />
        <Route path="/payment-instructions" element={<PaymentInstructions />} />
        <Route path="/payment-instructions/:orderId" element={<PaymentInstructionsById />} />
      </Routes>
    </Router>
  );
}

export default App;
