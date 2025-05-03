
import React from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";

const Navbar: React.FC = () => {
  const { user, signOut } = useAuth();

  const handleSignOut = async (e: React.MouseEvent) => {
    e.preventDefault();
    try {
      console.log("Initiating logout from navbar");
      await signOut();
    } catch (error) {
      console.error("Erro ao fazer logout:", error);
    }
  };

  return (
    <header className="border-b bg-white shadow-md">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        <div className="flex items-center">
          <Link to="/" className="flex items-center">
            <span className="text-2xl font-bold text-roomly-600">Psico Flex</span>
          </Link>
        </div>
        
        <div className="flex items-center gap-3">
          <Link to="/rooms">
            <Button variant="default" className="bg-roomly-600 hover:bg-roomly-700 font-semibold text-white text-base px-5 py-5 shadow-lg">
              Salas
            </Button>
          </Link>
          
          <Link to="/equipment">
            <Button variant="default" className="bg-roomly-600 hover:bg-roomly-700 font-semibold text-white text-base px-5 py-5 shadow-lg">
              Equipamentos
            </Button>
          </Link>
          
          {user ? (
            <>
              {user.user_metadata?.role === "admin" ? (
                <Link to="/admin">
                  <Button variant="default" className="bg-roomly-600 hover:bg-roomly-700 font-semibold text-white text-base px-5 py-5 shadow-lg">
                    Painel Admin
                  </Button>
                </Link>
              ) : (
                <>
                  <Link to="/my-bookings">
                    <Button variant="default" className="bg-roomly-600 hover:bg-roomly-700 font-semibold text-white text-base px-5 py-5 shadow-lg">
                      Minhas Reservas
                    </Button>
                  </Link>
                  <Link to="/my-account">
                    <Button variant="default" className="bg-roomly-600 hover:bg-roomly-700 font-semibold text-white text-base px-5 py-5 shadow-lg">
                      Minha Conta
                    </Button>
                  </Link>
                </>
              )}
              
              <Button 
                variant="outline" 
                onClick={handleSignOut}
                className="border-roomly-500 border-2 text-roomly-700 hover:bg-roomly-50 font-semibold text-base px-5 py-5"
              >
                Sair
              </Button>
            </>
          ) : (
            <>
              <Link to="/login">
                <Button 
                  variant="outline" 
                  className="border-roomly-500 border-2 text-roomly-700 hover:bg-roomly-50 font-semibold text-base px-5 py-5"
                >
                  Entrar
                </Button>
              </Link>
              <Link to="/register">
                <Button className="bg-roomly-600 hover:bg-roomly-700 font-semibold text-white shadow-lg text-base px-5 py-5">
                  Cadastre-se
                </Button>
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}

export default Navbar;
