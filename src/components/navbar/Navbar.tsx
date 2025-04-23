
import React from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

const Navbar: React.FC = () => {
  return (
    <header className="border-b bg-white shadow-sm">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        <div className="flex items-center">
          <Link to="/" className="flex items-center">
            <span className="text-xl font-bold text-roomly-600">Roomly</span>
          </Link>
        </div>
        
        <div className="flex items-center space-x-4">
          <Link to="/login">
            <Button variant="outline">Login</Button>
          </Link>
          <Link to="/register">
            <Button>Cadastre-se</Button>
          </Link>
        </div>
      </div>
    </header>
  );
};

export default Navbar;
