
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
                src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3689.8263069580846!2d-41.666389920769814!3d-22.376948224084473!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x96555c87db01c9%3A0x816525f6a7e6a1b5!2sIcaraizinho%2C%20RJ!5e0!3m2!1spt-BR!2sbr!4v1704316863576!5m2!1spt-BR!2sbr"
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

