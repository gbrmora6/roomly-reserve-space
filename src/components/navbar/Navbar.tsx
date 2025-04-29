
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
        
        <div className="flex items-center space-x-3">
          <Link to="/rooms">
            <Button variant="default" className="bg-roomly-500 hover:bg-roomly-600 font-medium text-white">
              Salas
            </Button>
          </Link>
          
          <Link to="/equipment">
            <Button variant="default" className="bg-roomly-500 hover:bg-roomly-600 font-medium text-white">
              Equipamentos
            </Button>
          </Link>
          
          {user ? (
            <>
              {user.user_metadata?.role === "admin" ? (
                <Link to="/admin">
                  <Button variant="default" className="bg-roomly-500 hover:bg-roomly-600 font-medium text-white">
                    Painel Admin
                  </Button>
                </Link>
              ) : (
                <>
                  <Link to="/my-bookings">
                    <Button variant="default" className="bg-roomly-500 hover:bg-roomly-600 font-medium text-white">
                      Minhas Reservas
                    </Button>
                  </Link>
                  <Link to="/my-account">
                    <Button variant="default" className="bg-roomly-500 hover:bg-roomly-600 font-medium text-white">
                      Minha Conta
                    </Button>
                  </Link>
                </>
              )}
              
              <Button 
                variant="outline" 
                onClick={handleSignOut}
                className="border-roomly-500 text-roomly-600 hover:bg-roomly-50"
              >
                Sair
              </Button>
            </>
          ) : (
            <>
              <Link to="/login">
                <Button 
                  variant="outline" 
                  className="border-roomly-500 text-roomly-600 hover:bg-roomly-50"
                >
                  Entrar
                </Button>
              </Link>
              <Link to="/register">
                <Button className="bg-roomly-600 hover:bg-roomly-700 font-medium">
                  Cadastre-se
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
