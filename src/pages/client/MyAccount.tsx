
import React from "react";
import MainLayout from "@/components/layout/MainLayout";
import { ProfileForm } from "@/components/profile/ProfileForm";
import { useAuth } from "@/contexts/AuthContext";
import { PageHeader } from "@/components/shared/PageHeader";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { User, Settings, Shield, CreditCard, AlertCircle } from "lucide-react";
import { useLocation } from "react-router-dom";

const MyAccount = () => {
  const { user } = useAuth();
  const location = useLocation();
  const isFirstLogin = location.state?.isFirstLogin;
  const message = location.state?.message;
  
  return (
    <MainLayout>
      <div className="container mx-auto py-8 px-4">
        <PageHeader 
          title="Minha Conta"
          description="Gerencie suas informações pessoais e preferências"
        />
        
        {isFirstLogin && message && (
          <Alert className="mb-6 border-orange-200 bg-orange-50">
            <AlertCircle className="h-4 w-4 text-orange-600" />
            <AlertDescription className="text-orange-800">
              <strong>Bem-vindo ao Roomly!</strong> {message}
            </AlertDescription>
          </Alert>
        )}
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 max-w-7xl mx-auto">
          {/* Profile Summary Card */}
          <Card className="lg:col-span-1 border-border/50">
            <CardHeader className="text-center pb-4">
              <div className="flex flex-col items-center space-y-4">
                <Avatar className="h-24 w-24">
                  <AvatarImage src={user?.user_metadata?.avatar_url} />
                  <AvatarFallback className="bg-primary text-white text-xl font-bold">
                    {user?.user_metadata?.first_name?.[0] || user?.email?.[0] || 'U'}
                  </AvatarFallback>
                </Avatar>
                
                <div className="space-y-2">
                  <h2 className="text-xl font-bold text-foreground">
                    {user?.user_metadata?.first_name} {user?.user_metadata?.last_name}
                  </h2>
                  <p className="text-muted-foreground text-sm">{user?.email}</p>
                  <Badge variant="secondary">
                    <Shield className="h-3 w-3 mr-1" />
                    Conta Verificada
                  </Badge>
                </div>
              </div>
            </CardHeader>
            
            <CardContent className="space-y-4">
              <div className="bg-muted/30 rounded-lg p-4 space-y-3">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-primary/10">
                    <User className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">Status da Conta</p>
                    <p className="text-xs text-muted-foreground">Ativa desde {new Date().getFullYear()}</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-accent/10">
                    <CreditCard className="h-4 w-4 text-accent" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">Plano Atual</p>
                    <p className="text-xs text-muted-foreground">Cliente Padrão</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Profile Form */}
          <Card className="lg:col-span-2 border-border/50">
            <CardHeader className="border-b border-border/30">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <Settings className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h3 className="text-xl font-semibold">Informações Pessoais</h3>
                  <p className="text-sm text-muted-foreground">
                    Atualize seus dados pessoais e informações de contato
                  </p>
                </div>
              </div>
            </CardHeader>
            
            <CardContent className="p-8">
              <ProfileForm />
            </CardContent>
          </Card>
        </div>
      </div>
    </MainLayout>
  );
};

export default MyAccount;
