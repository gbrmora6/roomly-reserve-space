
import React from "react";
import MainLayout from "@/components/layout/MainLayout";
import { ProfileForm } from "@/components/profile/ProfileForm";

const MyAccount = () => {
  return (
    <MainLayout>
      <div className="container mx-auto py-8">
        <h1 className="text-2xl font-bold mb-6">Minha Conta</h1>
        
        <div className="bg-white p-6 rounded-lg shadow-sm">
          <ProfileForm />
        </div>
      </div>
    </MainLayout>
  );
};

export default MyAccount;
