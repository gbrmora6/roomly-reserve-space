
import React from "react";
import { Link, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { ShoppingBag } from "lucide-react";

const Navbar = () => {
  const location = useLocation();
  const { user, signOut } = useAuth();

  const isActive = (path: string) => location.pathname === path;

  return (
    <header className="bg-white dark:bg-gray-950 border-b sticky top-0 z-50">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        <div className="flex gap-6 md:gap-10">
          <Link to="/" className="flex items-center space-x-2">
            <span className="font-bold text-xl">Sapiens</span>
          </Link>
          <nav className="hidden md:flex gap-6">
            <Link
              to="/rooms"
              className={`text-sm font-medium transition-colors hover:text-primary ${
                isActive("/rooms") ? "text-primary" : ""
              }`}
            >
              Salas
            </Link>
            <Link
              to="/equipment"
              className={`text-sm font-medium transition-colors hover:text-primary ${
                isActive("/equipment") ? "text-primary" : ""
              }`}
            >
              Equipamentos
            </Link>
            <Link
              to="/store"
              className={`text-sm font-medium transition-colors hover:text-primary ${
                location.pathname.startsWith("/store") ? "text-primary" : ""
              }`}
            >
              <div className="flex items-center gap-1">
                <ShoppingBag className="h-4 w-4" />
                <span>Produtos</span>
              </div>
            </Link>
          </nav>
        </div>
        <div className="flex items-center gap-4">
          {user ? (
            <>
              <Link to="/my-account">
                <Button variant="ghost" size="sm">
                  Minha Conta
                </Button>
              </Link>
              <Link to="/my-bookings">
                <Button variant="ghost" size="sm">
                  Minhas Reservas
                </Button>
              </Link>
              <Button variant="outline" size="sm" onClick={signOut}>
                Sair
              </Button>
            </>
          ) : (
            <>
              <Link to="/login">
                <Button variant="ghost" size="sm">
                  Login
                </Button>
              </Link>
              <Link to="/register">
                <Button variant="outline" size="sm">
                  Cadastrar
                </Button>
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
};

export default Navbar;
