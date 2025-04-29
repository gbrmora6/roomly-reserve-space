
import React from "react";
import MainLayout from "@/components/layout/MainLayout";
import { ProfileForm } from "@/components/profile/ProfileForm";

const MyAccount = () => {
  return (
    <MainLayout>
      <div className="container mx-auto py-8">
        <h1 className="text-3xl font-bold mb-6 text-roomly-600">Minha Conta</h1>
        
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <div className="p-1 bg-gradient-to-r from-roomly-400 to-roomly-600"></div>
          <div className="p-6">
            <h2 className="text-xl font-medium mb-6 text-gray-800 border-b border-gray-200 pb-2">
              Informações Pessoais
            </h2>
            <ProfileForm />
          </div>
        </div>
      </div>
    </MainLayout>
  );
};

export default MyAccount;
