
import React from "react";
import MainLayout from "@/components/layout/MainLayout";
import { ProfileForm } from "@/components/profile/ProfileForm";
import { useAuth } from "@/contexts/AuthContext";
import { Card } from "@/components/ui/card";

const MyAccount = () => {
  const { user } = useAuth();
  
  return (
    <MainLayout>
      <div className="container mx-auto py-8 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-roomly-700">Minha Conta</h1>
            <p className="text-roomly-600 mt-2">
              Gerencie suas informações pessoais e preferências
            </p>
          </div>
          
          <Card className="overflow-hidden bg-white shadow-lg border-roomly-200">
            <div className="p-1.5 bg-gradient-to-r from-roomly-400 to-roomly-600"></div>
            <div className="p-6 sm:p-8">
              {user && (
                <div className="mb-6">
                  <div className="flex items-center gap-4 mb-6">
                    <div className="h-20 w-20 rounded-full bg-roomly-100 flex items-center justify-center border-2 border-roomly-300 text-roomly-700 text-2xl font-bold">
                      {user.user_metadata?.first_name?.[0] || user.email?.[0]}
                    </div>
                    <div>
                      <h2 className="text-2xl font-semibold text-roomly-800">
                        {user.user_metadata?.first_name} {user.user_metadata?.last_name}
                      </h2>
                      <p className="text-roomly-500">{user.email}</p>
                    </div>
                  </div>
                </div>
              )}
              
              <div className="space-y-8">
                <div>
                  <h2 className="text-xl font-medium mb-6 text-roomly-800 border-b border-roomly-200 pb-2">
                    Informações Pessoais
                  </h2>
                  <ProfileForm />
                </div>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </MainLayout>
  );
};

export default MyAccount;
