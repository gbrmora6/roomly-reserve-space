
import React from "react";
import { Link } from "react-router-dom";

const Footer: React.FC = () => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="border-t bg-white py-6 md:py-8">
      <div className="container mx-auto px-4 md:px-6">
        <div className="grid grid-cols-1 gap-6 md:gap-8 md:grid-cols-3">
          <div>
            <h3 className="text-base md:text-lg font-bold text-roomly-600">Psico Flex</h3>
            <p className="mt-2 text-xs md:text-sm text-gray-600">
              Seu espaço para atendimentos psicológicos com toda estrutura necessária.
            </p>
          </div>
          
          <div>
            <h4 className="text-sm md:text-md font-medium text-gray-900">Links rápidos</h4>
            <ul className="mt-2 space-y-1 md:space-y-2 text-xs md:text-sm">
              <li>
                <Link to="/" className="text-gray-600 hover:text-roomly-600">
                  Início
                </Link>
              </li>
              <li>
                <Link to="/rooms" className="text-gray-600 hover:text-roomly-600">
                  Salas
                </Link>
              </li>
              <li>
                <Link to="/about" className="text-gray-600 hover:text-roomly-600">
                  Sobre nós
                </Link>
              </li>
            </ul>
          </div>
          
          <div>
            <h4 className="text-sm md:text-md font-medium text-gray-900">Contato</h4>
            <ul className="mt-2 space-y-1 md:space-y-2 text-xs md:text-sm text-gray-600">
              <li>suporte@psicoflex.com</li>
              <li>+55 (11) 9999-9999</li>
            </ul>
          </div>
        </div>
        
        <div className="mt-6 md:mt-8 border-t border-gray-200 pt-4 md:pt-6 text-center text-xs md:text-sm text-gray-600">
          <p>© {currentYear} Psico Flex. Todos os direitos reservados.</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
