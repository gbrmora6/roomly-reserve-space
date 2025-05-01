
import React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";

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
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Detalhes do Cliente</DialogTitle>
          <DialogClose asChild>
            <Button
              variant="ghost"
              className="h-8 w-8 p-0 absolute right-4 top-4"
              onClick={onClose}
            >
              <X className="h-4 w-4" />
              <span className="sr-only">Fechar</span>
            </Button>
          </DialogClose>
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
      </DialogContent>
    </Dialog>
  );
};
