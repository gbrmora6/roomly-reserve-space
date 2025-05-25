import React, { useState, useRef, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { ShoppingBag } from "lucide-react";
import CartButton from "@/components/cart/CartButton";

const Navbar = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const isActive = (path: string) => location.pathname === path;
  const isAdmin = user && (user.user_metadata?.is_admin === true || user.user_metadata?.role === "admin" || user.email === "admin@example.com" || user.email === "cpd@sapiens-psi.com.br");
  const avatarUrl = user?.user_metadata?.avatar_url || user?.user_metadata?.picture;

  // Fecha o dropdown ao clicar fora
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    }
    if (dropdownOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    } else {
      document.removeEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [dropdownOpen]);

  return (
    <header className="bg-white shadow-sm rounded-xl mt-3 mx-3 mb-4">
      <div className="flex items-center justify-between h-20 px-8">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2 select-none">
          <span className="font-extrabold text-2xl text-primary">Roomly</span>
        </Link>
        {/* Menu centralizado */}
        <nav className="flex-1 flex justify-center gap-10">
          <Link
            to="/rooms"
            className={`text-lg font-medium transition-colors hover:text-primary ${isActive("/rooms") ? "text-primary" : "text-gray-800"}`}
          >
            Rooms
          </Link>
          <Link
            to="/equipment"
            className={`text-lg font-medium transition-colors hover:text-primary ${isActive("/equipment") ? "text-primary" : "text-gray-800"}`}
          >
            Equipment
          </Link>
          <Link
            to="/store"
            className={`text-lg font-medium transition-colors hover:text-primary ${location.pathname.startsWith("/store") ? "text-primary" : "text-gray-800"}`}
          >
            Products
          </Link>
          {isAdmin && (
            <Link
              to="/admin"
              className={`text-lg font-medium transition-colors hover:text-primary ${location.pathname.startsWith("/admin") ? "text-primary" : "text-gray-800"}`}
            >
              Admin Panel
            </Link>
          )}
        </nav>
        {/* Carrinho e avatar/dropdown */}
        <div className="flex items-center gap-6">
          <CartButton />
          {user && (
            <div className="relative" ref={dropdownRef}>
              <button
                className="focus:outline-none"
                onClick={() => setDropdownOpen((open) => !open)}
                aria-label="Abrir menu da conta"
              >
                {avatarUrl ? (
                  <img
                    src={avatarUrl}
                    alt="Avatar"
                    className="w-10 h-10 rounded-full object-cover border-2 border-primary shadow-sm"
                  />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center font-bold text-lg text-primary">
                    {user.user_metadata?.first_name?.[0] || user.email?.[0] || "U"}
                  </div>
                )}
              </button>
              {dropdownOpen && (
                <div className="absolute right-0 mt-3 w-56 bg-white rounded-xl shadow-xl border border-gray-100 z-50 py-2 animate-fade-in">
                  <div className="px-4 py-2 border-b border-gray-100">
                    <div className="font-semibold text-base text-gray-900 truncate">{user.user_metadata?.first_name || user.email}</div>
                    <div className="text-xs text-gray-500 truncate">{user.email}</div>
                  </div>
                  <button
                    className="w-full text-left px-4 py-2 hover:bg-gray-50 text-gray-800 text-sm"
                    onClick={() => { setDropdownOpen(false); navigate("/my-account"); }}
                  >
                    Minha Conta
                  </button>
                  <button
                    className="w-full text-left px-4 py-2 hover:bg-gray-50 text-gray-800 text-sm"
                    onClick={() => { setDropdownOpen(false); navigate("/my-bookings"); }}
                  >
                    Meus Pedidos
                  </button>
                  <div className="border-t my-2" />
                  <button
                    className="w-full text-left px-4 py-2 hover:bg-gray-50 text-red-600 text-sm"
                    onClick={() => { setDropdownOpen(false); signOut(); }}
                  >
                    Sair
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default Navbar;
