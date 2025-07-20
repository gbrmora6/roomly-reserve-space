import React, { useState, useRef, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { Menu, X, Sun, Moon } from "lucide-react";
import CartButton from "@/components/cart/CartButton";


const Navbar = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
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
    <header className="fixed top-0 left-0 right-0 z-50 backdrop-blur-xl bg-white/80 border-b border-white/20 shadow-lg">
      <div className="container mx-auto px-4 md:px-6">
        <div className="flex items-center justify-between h-14 md:h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2 md:gap-3 select-none group">
            <div className="relative">
              <div className="w-8 h-8 md:w-10 md:h-10 bg-gradient-to-br from-primary to-primary/70 rounded-xl flex items-center justify-center shadow-lg group-hover:shadow-xl transition-all duration-300 group-hover:scale-110 group-hover:rotate-6">
                <span className="text-white font-bold text-base md:text-lg">P</span>
              </div>
            </div>
            <span className="font-extrabold text-xl md:text-2xl bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
              PsicoFlex
            </span>
          </Link>
          {/* Menu Desktop */}
          <nav className="hidden lg:flex flex-1 justify-center gap-6 xl:gap-8">
            <Link
              to="/rooms"
              className={`relative px-3 xl:px-4 py-2 text-sm xl:text-base font-medium transition-all duration-300 rounded-lg hover:bg-white/20 ${
                isActive("/rooms") 
                  ? "text-primary bg-white/10" 
                  : "text-gray-700 hover:text-primary"
              }`}
            >
              Salas
              {isActive("/rooms") && (
                <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-1 h-1 bg-primary rounded-full"></div>
              )}
            </Link>
            <Link
              to="/equipment"
              className={`relative px-3 xl:px-4 py-2 text-sm xl:text-base font-medium transition-all duration-300 rounded-lg hover:bg-white/20 ${
                isActive("/equipment") 
                  ? "text-primary bg-white/10" 
                  : "text-gray-700 hover:text-primary"
              }`}
            >
              Equipamentos
              {isActive("/equipment") && (
                <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-1 h-1 bg-primary rounded-full"></div>
              )}
            </Link>
            <Link
              to="/store"
              className={`relative px-3 xl:px-4 py-2 text-sm xl:text-base font-medium transition-all duration-300 rounded-lg hover:bg-white/20 ${
                location.pathname.startsWith("/store") 
                  ? "text-primary bg-white/10" 
                  : "text-gray-700 hover:text-primary"
              }`}
            >
              Produtos
              {location.pathname.startsWith("/store") && (
                <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-1 h-1 bg-primary rounded-full"></div>
              )}
            </Link>
            {isAdmin && (
              <Link
                to="/admin"
                className={`relative px-3 xl:px-4 py-2 text-sm xl:text-base font-medium transition-all duration-300 rounded-lg hover:bg-white/20 ${
                  location.pathname.startsWith("/admin") 
                    ? "text-primary bg-white/10" 
                    : "text-gray-700 hover:text-primary"
                }`}
              >
                Painel Admin
                {location.pathname.startsWith("/admin") && (
                  <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-1 h-1 bg-primary rounded-full"></div>
                )}
              </Link>
            )}
          </nav>
          {/* Ações do usuário */}
          <div className="flex items-center gap-2 md:gap-3">


            {/* Carrinho */}
            <CartButton />

            {/* Menu Mobile */}
            <Button
              variant="ghost"
              size="sm"
              className="lg:hidden text-gray-600 hover:text-gray-800 p-2"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? <X className="h-5 w-5 md:h-6 md:w-6" /> : <Menu className="h-5 w-5 md:h-6 md:w-6" />}
            </Button>

            {/* Avatar/Login */}
            {user ? (
              <div className="relative" ref={dropdownRef}>
                <button
                  className="focus:outline-none group"
                  onClick={() => setDropdownOpen((open) => !open)}
                  aria-label="Abrir menu da conta"
                >
                  {avatarUrl ? (
                    <img
                      src={avatarUrl}
                      alt="Avatar"
                      className="w-9 h-9 rounded-full object-cover border-2 border-white/20 shadow-lg group-hover:shadow-xl transition-all duration-300 group-hover:scale-110"
                    />
                  ) : (
                    <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center font-bold text-sm text-white shadow-lg group-hover:shadow-xl transition-all duration-300 group-hover:scale-110">
                      {user.user_metadata?.first_name?.[0] || user.email?.[0] || "U"}
                    </div>
                  )}
                </button>
                {dropdownOpen && (
                  <div className="absolute right-0 mt-3 w-64 backdrop-blur-xl bg-white/90 rounded-2xl shadow-2xl border border-white/20 z-50 py-2 animate-fade-in">
                    <div className="px-4 py-3 border-b border-white/20">
                      <div className="font-semibold text-gray-900 truncate">{user.user_metadata?.first_name || user.email}</div>
                      <div className="text-xs text-gray-600 truncate">{user.email}</div>
                    </div>
                    <button
                      className="w-full text-left px-4 py-3 hover:bg-white/20 text-gray-800 text-sm transition-colors duration-200"
                      onClick={() => { setDropdownOpen(false); navigate("/my-account"); }}
                    >
                      Minha Conta
                    </button>
                    <button
                      className="w-full text-left px-4 py-3 hover:bg-white/20 text-gray-800 text-sm transition-colors duration-200"
                      onClick={() => { setDropdownOpen(false); navigate("/my-bookings"); }}
                    >
                      Minhas Reservas
                    </button>
                    <div className="border-t border-white/20 my-2" />
                    <button
                      className="w-full text-left px-4 py-3 hover:bg-red-50 text-red-600 text-sm transition-colors duration-200"
                      onClick={() => { setDropdownOpen(false); signOut(); }}
                    >
                      Sair
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <Button
                onClick={() => navigate("/login")}
                className="bg-primary hover:bg-primary/90 text-white shadow-lg hover:shadow-xl transition-all duration-300"
              >
                Entrar
              </Button>
            )}
          </div>
        </div>

        {/* Menu Mobile */}
        {mobileMenuOpen && (
          <div className="lg:hidden absolute top-full left-0 right-0 backdrop-blur-xl bg-white/95 border-b border-white/20 shadow-lg animate-fade-in">
            <nav className="container mx-auto px-6 py-4 space-y-2 max-h-screen overflow-y-auto">
              <Link
                to="/rooms"
                className={`block px-4 py-3 rounded-lg transition-all duration-200 font-medium ${
                  isActive("/rooms") 
                    ? "text-primary bg-primary/10" 
                    : "text-gray-700 hover:text-primary hover:bg-white/20"
                }`}
                onClick={() => setMobileMenuOpen(false)}
              >
                Salas
              </Link>
              <Link
                to="/equipment"
                className={`block px-4 py-3 rounded-lg transition-all duration-200 font-medium ${
                  isActive("/equipment") 
                    ? "text-primary bg-primary/10" 
                    : "text-gray-700 hover:text-primary hover:bg-white/20"
                }`}
                onClick={() => setMobileMenuOpen(false)}
              >
                Equipamentos
              </Link>
              <Link
                to="/store"
                className={`block px-4 py-3 rounded-lg transition-all duration-200 font-medium ${
                  location.pathname.startsWith("/store") 
                    ? "text-primary bg-primary/10" 
                    : "text-gray-700 hover:text-primary hover:bg-white/20"
                }`}
                onClick={() => setMobileMenuOpen(false)}
              >
                Produtos
              </Link>
              {isAdmin && (
                <Link
                  to="/admin"
                  className={`block px-4 py-3 rounded-lg transition-all duration-200 font-medium ${
                    location.pathname.startsWith("/admin") 
                      ? "text-primary bg-primary/10" 
                      : "text-gray-700 hover:text-primary hover:bg-white/20"
                  }`}
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Painel Admin
                </Link>
              )}
              
              {/* User Menu in Mobile */}
              <div className="pt-4 border-t border-white/20">
                {user ? (
                  <div className="space-y-2">
                    <div className="flex items-center px-4 py-3 bg-white/20 rounded-lg">
                      {avatarUrl ? (
                        <img
                          src={avatarUrl}
                          alt="Avatar"
                          className="w-10 h-10 rounded-full object-cover mr-3"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center font-bold text-sm text-white mr-3">
                          {user.user_metadata?.first_name?.[0] || user.email?.[0] || "U"}
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <span className="text-sm font-medium text-gray-900 block truncate">
                          {user.user_metadata?.first_name || user.email}
                        </span>
                        <span className="text-xs text-gray-600 block truncate">
                          {user.email}
                        </span>
                      </div>
                    </div>
                    <Link
                      to="/my-account"
                      className="block px-4 py-3 text-gray-700 hover:text-primary hover:bg-white/20 rounded-lg transition-all duration-200 font-medium"
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      Minha Conta
                    </Link>
                    <Link
                      to="/my-bookings"
                      className="block px-4 py-3 text-gray-700 hover:text-primary hover:bg-white/20 rounded-lg transition-all duration-200 font-medium"
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      Minhas Reservas
                    </Link>
                    <button
                      onClick={() => {
                        signOut();
                        setMobileMenuOpen(false);
                      }}
                      className="block w-full text-left px-4 py-3 text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-all duration-200 font-medium"
                    >
                      Sair
                    </button>
                  </div>
                ) : (
                  <Link
                    to="/login"
                    className="block px-4 py-3 text-white bg-primary hover:bg-primary/90 rounded-lg transition-all duration-200 font-medium text-center"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    Entrar
                  </Link>
                )}
              </div>
            </nav>
          </div>
        )}
      </div>
    </header>
  );
};

export default Navbar;
