
import React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface CompanyAddressDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  companyProfile: {
    name: string;
    street: string;
    number: string;
    neighborhood: string;
    city: string;
  } | null;
}

export const CompanyAddressDialog = ({
  open,
  onOpenChange,
  companyProfile,
}: CompanyAddressDialogProps) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Endereço da Empresa</DialogTitle>
        </DialogHeader>
        {companyProfile && (
          <div className="space-y-4">
            <div className="space-y-2">
              <p className="font-medium">{companyProfile.name}</p>
              <p>
                {companyProfile.street}, {companyProfile.number}
              </p>
              <p>
                {companyProfile.neighborhood} - {companyProfile.city}
              </p>
            </div>
            <div className="aspect-video w-full">
              <iframe
                src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3665.669201737705!2d-51.146633123694864!3d-23.327584484793713!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x94eb430cb6418799%3A0xb53bc453948260de!2sR.%20Augusto%20Severo%2C%2010%20-%20Santos%20Dumont%2C%20Londrina%20-%20PR%2C%2086039-650!5e0!3m2!1spt-BR!2sbr!4v1708436845599!5m2!1spt-BR!2sbr"
                className="w-full h-full rounded-md border-0"
                allowFullScreen
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
              ></iframe>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
