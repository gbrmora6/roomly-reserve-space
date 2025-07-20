import { useFirstLoginRedirect } from "@/hooks/useFirstLoginRedirect";

interface FirstLoginHandlerProps {
  children: React.ReactNode;
}

export const FirstLoginHandler: React.FC<FirstLoginHandlerProps> = ({ children }) => {
  // Hook para redirecionar usuários no primeiro login
  useFirstLoginRedirect();
  
  return <>{children}</>;
};

export default FirstLoginHandler;