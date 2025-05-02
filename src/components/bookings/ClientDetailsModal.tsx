
import React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";

interface ClientDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
}

export const ClientDetailsModal: React.FC<ClientDetailsModalProps> = ({
  isOpen,
  onClose,
  userId,
}) => {
  const { data: profile, isLoading } = useQuery({
    queryKey: ["client-profile", userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: isOpen && !!userId,
  });

  return (
    <Dialog 
      open={isOpen} 
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent className="sm:max-w-md" hideCloseButton>
        <DialogHeader>
          <DialogTitle>Detalhes do Cliente</DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-5 w-full" />
            <Skeleton className="h-5 w-3/4" />
            <Skeleton className="h-5 w-full" />
            <Skeleton className="h-5 w-3/4" />
          </div>
        ) : profile ? (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Nome</p>
                <p>{profile.first_name || "Não informado"}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Sobrenome</p>
                <p>{profile.last_name || "Não informado"}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-sm font-medium text-muted-foreground">CPF</p>
                <p>{profile.cpf || "Não informado"}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">CNPJ</p>
                <p>{profile.cnpj || "Não informado"}</p>
              </div>
            </div>

            <div>
              <p className="text-sm font-medium text-muted-foreground mb-1">Endereço</p>
              <div className="bg-muted/50 p-3 rounded-md">
                <p>
                  {profile.street ? `${profile.street}, ${profile.house_number || 'S/N'}` : "Endereço não informado"}
                </p>
                {profile.neighborhood && (
                  <p>{profile.neighborhood}</p>
                )}
                {(profile.city || profile.state) && (
                  <p>
                    {[profile.city, profile.state].filter(Boolean).join(" - ")}
                  </p>
                )}
                {profile.cep && <p>CEP: {profile.cep}</p>}
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center py-4">
            <p className="text-muted-foreground">Detalhes do cliente não encontrados</p>
          </div>
        )}

        <DialogFooter className="mt-6 flex justify-center">
          <Button onClick={onClose} className="w-full">
            OK
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
