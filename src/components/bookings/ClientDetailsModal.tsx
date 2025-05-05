
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
import { Mail, Phone, User, Briefcase, MapPin, Hash } from "lucide-react";
import { Separator } from "@/components/ui/separator";

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
      // Get profile data
      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .single();

      if (profileError) throw profileError;
      
      // Get user email
      const { data: userData, error: userError } = await supabase.auth.admin.getUserById(userId);
      
      if (userError) {
        console.error("Error fetching user email:", userError);
        return { ...profileData, email: "Email não disponível" };
      }
      
      return { ...profileData, email: userData?.user?.email || "Email não disponível" };
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
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold">Detalhes do Cliente</DialogTitle>
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
            <div className="flex items-center gap-2">
              <User className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium text-muted-foreground">Nome Completo</p>
                <p className="font-medium">
                  {profile.first_name && profile.last_name 
                    ? `${profile.first_name} ${profile.last_name}`
                    : "Nome não informado"}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Mail className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium text-muted-foreground">Email</p>
                <p className="font-medium">{profile.email}</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Phone className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium text-muted-foreground">Telefone</p>
                <p className="font-medium">{profile.phone || "Não informado"}</p>
              </div>
            </div>

            <Separator />

            <div className="grid grid-cols-2 gap-3">
              <div className="flex items-center gap-2">
                <Hash className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium text-muted-foreground">CPF</p>
                  <p className="font-medium">{profile.cpf || "Não informado"}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Briefcase className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium text-muted-foreground">CNPJ</p>
                  <p className="font-medium">{profile.cnpj || "Não informado"}</p>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Briefcase className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium text-muted-foreground">CRP</p>
                <p className="font-medium">{profile.crp || "Não informado"}</p>
              </div>
            </div>

            <Separator />

            <div className="flex items-start gap-2">
              <MapPin className="h-5 w-5 text-muted-foreground mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-medium text-muted-foreground mb-1">Endereço Completo</p>
                <div className="bg-muted/50 p-3 rounded-md">
                  {profile.street ? (
                    <>
                      <p>
                        {profile.street}, {profile.house_number || 'S/N'}
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
                    </>
                  ) : (
                    <p className="text-muted-foreground">Endereço não informado</p>
                  )}
                </div>
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
