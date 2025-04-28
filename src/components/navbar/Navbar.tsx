
import React from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";

const Navbar: React.FC = () => {
  const { user, signOut } = useAuth();

  const handleSignOut = async (e: React.MouseEvent) => {
    e.preventDefault();
    try {
      await signOut();
    } catch (error) {
      console.error("Erro ao fazer logout:", error);
    }
  };

  return (
    <header className="border-b bg-white shadow-sm">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        <div className="flex items-center">
          <Link to="/" className="flex items-center">
            <span className="text-xl font-bold text-roomly-600">EspaçoPsic</span>
          </Link>
        </div>
        
        <div className="flex items-center space-x-4">
          <Link to="/rooms">
            <Button variant="ghost">Salas</Button>
          </Link>
          
          <Link to="/equipment">
            <Button variant="ghost">Equipamentos</Button>
          </Link>
          
          {user ? (
            <>
              {user.user_metadata?.role === "admin" ? (
                <Link to="/admin">
                  <Button variant="ghost">Painel Admin</Button>
                </Link>
              ) : (
                <>
                  <Link to="/my-bookings">
                    <Button variant="ghost">Minhas Reservas</Button>
                  </Link>
                  <Link to="/my-account">
                    <Button variant="ghost">Minha Conta</Button>
                  </Link>
                </>
              )}
              
              <Button variant="outline" onClick={handleSignOut}>
                Sair
              </Button>
            </>
          ) : (
            <>
              <Link to="/login">
                <Button variant="outline">Entrar</Button>
              </Link>
              <Link to="/register">
                <Button>Cadastre-se</Button>
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
};

export default Navbar;
