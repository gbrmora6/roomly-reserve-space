
import React, { useState } from "react";
import { useAuthOperations } from "@/hooks/useAuthOperations";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";

const CreateSuperAdmin: React.FC = () => {
  const { createSuperAdmin } = useAuthOperations();
  const [isCreating, setIsCreating] = useState(false);
  const [created, setCreated] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCreateSuperAdmin = async () => {
    setIsCreating(true);
    setError(null);
    try {
      await createSuperAdmin();
      setCreated(true);
    } catch (err: any) {
      setError(err.message || "Ocorreu um erro ao criar o superadmin");
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="container mx-auto max-w-md py-10">
      <Card>
        <CardHeader>
          <CardTitle>Criar SuperAdmin</CardTitle>
          <CardDescription>
            Crie um novo usuário SuperAdmin com permissões completas
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="mb-4">
            Esta ação criará um novo superadmin com as seguintes credenciais:
          </p>
          <div className="bg-muted p-3 rounded-md mb-4">
            <p><strong>Email:</strong> cpd@sapiens-psi.com.br</p>
            <p><strong>Senha:</strong> 123456789</p>
          </div>
          {created && (
            <div className="bg-green-100 text-green-800 p-3 rounded-md">
              SuperAdmin criado com sucesso!
            </div>
          )}
          {error && (
            <div className="bg-red-100 text-red-800 p-3 rounded-md">
              {error}
            </div>
          )}
        </CardContent>
        <CardFooter>
          <Button 
            onClick={handleCreateSuperAdmin} 
            disabled={isCreating || created}
            className="w-full"
          >
            {isCreating ? "Criando..." : created ? "SuperAdmin Criado" : "Criar SuperAdmin"}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
};

export default CreateSuperAdmin;
