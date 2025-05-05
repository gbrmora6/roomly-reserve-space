
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
                src="https://maps.app.goo.gl/dcVnLgY3EDworKFd7"
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
