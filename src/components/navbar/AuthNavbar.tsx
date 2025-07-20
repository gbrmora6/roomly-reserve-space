import React from "react";
import { Link } from "react-router-dom";

interface AuthNavbarProps {
  showLoginButton?: boolean;
  showRegisterButton?: boolean;
}

const AuthNavbar: React.FC<AuthNavbarProps> = ({ 
  showLoginButton = false, 
  showRegisterButton = false 
}) => {
  return (
    <header className="fixed top-0 left-0 right-0 z-50 backdrop-blur-xl bg-white/80 border-b border-white/20 shadow-lg">
      <div className="container mx-auto px-6">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-3 select-none group">
            <div className="relative">
              <div className="w-10 h-10 bg-gradient-to-br from-primary to-primary/70 rounded-xl flex items-center justify-center shadow-lg group-hover:shadow-xl transition-all duration-300 group-hover:scale-110 group-hover:rotate-6">
                <span className="text-white font-bold text-lg">P</span>
              </div>
            </div>
            <span className="font-extrabold text-2xl bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
              PsicoFlex
            </span>
          </Link>

          {/* Botões de ação */}
          <div className="flex items-center gap-3">
            {showLoginButton && (
              <Link
                to="/login"
                className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-primary transition-colors duration-200"
              >
                Entrar
              </Link>
            )}
            {showRegisterButton && (
              <Link
                to="/register"
                className="px-4 py-2 text-sm font-medium bg-primary hover:bg-primary/90 text-white rounded-lg shadow-lg hover:shadow-xl transition-all duration-300"
              >
                Cadastrar
              </Link>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

export default AuthNavbar;