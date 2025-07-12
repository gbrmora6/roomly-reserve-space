import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { 
  Bell, 
  Calendar, 
  AlertTriangle, 
  DollarSign, 
  Settings,
  Check,
  X,
  Clock,
  User
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useBranchFilter } from "@/hooks/useBranchFilter";
import { useToast } from "@/hooks/use-toast";

type NotificationType = 'new_booking' | 'payment_pending' | 'equipment_maintenance' | 'booking_conflict' | 'low_stock';

interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  priority: 'low' | 'medium' | 'high';
  read: boolean;
  created_at: string;
  data?: any;
}

const Notifications = () => {
  const { branchId } = useBranchFilter();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showSettings, setShowSettings] = useState(false);

  // Estados para configurações de notificação
  const [notificationSettings, setNotificationSettings] = useState({
    newBookings: true,
    paymentAlerts: true,
    maintenanceReminders: true,
    conflictAlerts: true,
    stockAlerts: true,
    emailNotifications: false,
    smsNotifications: false
  });

  // Buscar notificações (simulado - na prática viria do banco)
  const { data: notifications, isLoading } = useQuery({
    queryKey: ["notifications", branchId],
    queryFn: async () => {
      // Simulando busca de notificações - implementar com dados reais
      const mockNotifications: Notification[] = [
        {
          id: "1",
          type: "new_booking",
          title: "Nova Reserva",
          message: "Nova reserva de sala foi realizada por João Silva",
          priority: "medium",
          read: false,
          created_at: new Date().toISOString(),
          data: { clientName: "João Silva", roomName: "Sala de Reunião A" }
        },
        {
          id: "2",
          type: "payment_pending",
          title: "Pagamento Pendente",
          message: "Pagamento de R$ 150,00 está em atraso há 2 dias",
          priority: "high",
          read: false,
          created_at: new Date(Date.now() - 86400000).toISOString(),
          data: { amount: 150, daysOverdue: 2 }
        },
        {
          id: "3",
          type: "equipment_maintenance",
          title: "Manutenção Programada",
          message: "Microfone sem fio 01 precisa de manutenção em 3 dias",
          priority: "medium",
          read: true,
          created_at: new Date(Date.now() - 172800000).toISOString(),
          data: { equipmentName: "Microfone sem fio 01", daysUntilMaintenance: 3 }
        },
        {
          id: "4",
          type: "booking_conflict",
          title: "Conflito de Reserva",
          message: "Possível conflito detectado na Sala B para amanhã às 14h",
          priority: "high",
          read: false,
          created_at: new Date(Date.now() - 3600000).toISOString(),
          data: { roomName: "Sala B", conflictTime: "14:00" }
        }
      ];

      return mockNotifications;
    },
    enabled: !!branchId
  });

  // Marcar como lida
  const markAsRead = useMutation({
    mutationFn: async (notificationId: string) => {
      // Implementar marcação como lida no banco
      console.log("Marking as read:", notificationId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications", branchId] });
      toast({
        title: "Notificação marcada como lida",
      });
    }
  });

  // Marcar todas como lidas
  const markAllAsRead = useMutation({
    mutationFn: async () => {
      // Implementar marcação em massa
      console.log("Marking all as read");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications", branchId] });
      toast({
        title: "Todas as notificações foram marcadas como lidas",
      });
    }
  });

  const getNotificationIcon = (type: NotificationType) => {
    switch (type) {
      case 'new_booking':
        return <Calendar className="h-5 w-5 text-blue-500" />;
      case 'payment_pending':
        return <DollarSign className="h-5 w-5 text-red-500" />;
      case 'equipment_maintenance':
        return <Settings className="h-5 w-5 text-orange-500" />;
      case 'booking_conflict':
        return <AlertTriangle className="h-5 w-5 text-red-500" />;
      case 'low_stock':
        return <AlertTriangle className="h-5 w-5 text-yellow-500" />;
      default:
        return <Bell className="h-5 w-5 text-gray-500" />;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low':
        return 'bg-green-100 text-green-800 border-green-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const unreadCount = notifications?.filter(n => !n.read).length || 0;

  if (!branchId) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-gray-500">Selecione uma filial para visualizar as notificações</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto py-8 px-4">
      <div className="flex justify-between items-start mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Centro de Notificações</h1>
          <p className="text-gray-600 mt-2">
            Gerencie alertas e notificações do sistema
            {unreadCount > 0 && (
              <Badge variant="destructive" className="ml-2">
                {unreadCount} não lidas
              </Badge>
            )}
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => setShowSettings(!showSettings)}
          >
            <Settings className="h-4 w-4 mr-2" />
            Configurações
          </Button>
          {unreadCount > 0 && (
            <Button onClick={() => markAllAsRead.mutate()}>
              <Check className="h-4 w-4 mr-2" />
              Marcar Todas como Lidas
            </Button>
          )}
        </div>
      </div>

      {/* Configurações de Notificação */}
      {showSettings && (
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Configurações de Notificação</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <h3 className="font-semibold text-gray-900">Tipos de Notificação</h3>
                
                <div className="flex items-center justify-between">
                  <Label htmlFor="new-bookings">Novas reservas</Label>
                  <Switch
                    id="new-bookings"
                    checked={notificationSettings.newBookings}
                    onCheckedChange={(checked) => 
                      setNotificationSettings(prev => ({ ...prev, newBookings: checked }))
                    }
                  />
                </div>

                <div className="flex items-center justify-between">
                  <Label htmlFor="payment-alerts">Alertas de pagamento</Label>
                  <Switch
                    id="payment-alerts"
                    checked={notificationSettings.paymentAlerts}
                    onCheckedChange={(checked) => 
                      setNotificationSettings(prev => ({ ...prev, paymentAlerts: checked }))
                    }
                  />
                </div>

                <div className="flex items-center justify-between">
                  <Label htmlFor="maintenance">Lembretes de manutenção</Label>
                  <Switch
                    id="maintenance"
                    checked={notificationSettings.maintenanceReminders}
                    onCheckedChange={(checked) => 
                      setNotificationSettings(prev => ({ ...prev, maintenanceReminders: checked }))
                    }
                  />
                </div>

                <div className="flex items-center justify-between">
                  <Label htmlFor="conflicts">Conflitos de reserva</Label>
                  <Switch
                    id="conflicts"
                    checked={notificationSettings.conflictAlerts}
                    onCheckedChange={(checked) => 
                      setNotificationSettings(prev => ({ ...prev, conflictAlerts: checked }))
                    }
                  />
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="font-semibold text-gray-900">Canais de Notificação</h3>
                
                <div className="flex items-center justify-between">
                  <Label htmlFor="email-notifications">Notificações por Email</Label>
                  <Switch
                    id="email-notifications"
                    checked={notificationSettings.emailNotifications}
                    onCheckedChange={(checked) => 
                      setNotificationSettings(prev => ({ ...prev, emailNotifications: checked }))
                    }
                  />
                </div>

                <div className="flex items-center justify-between">
                  <Label htmlFor="sms-notifications">Notificações por SMS</Label>
                  <Switch
                    id="sms-notifications"
                    checked={notificationSettings.smsNotifications}
                    onCheckedChange={(checked) => 
                      setNotificationSettings(prev => ({ ...prev, smsNotifications: checked }))
                    }
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Lista de Notificações */}
      <div className="space-y-4">
        {isLoading ? (
          <div className="text-center py-8">Carregando notificações...</div>
        ) : notifications?.length === 0 ? (
          <Card>
            <CardContent className="text-center py-12">
              <Bell className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Nenhuma notificação</h3>
              <p className="text-gray-500">Você está em dia com todas as suas notificações!</p>
            </CardContent>
          </Card>
        ) : (
          notifications?.map((notification) => (
            <Card 
              key={notification.id} 
              className={`cursor-pointer transition-all hover:shadow-md ${
                !notification.read ? 'border-blue-200 bg-blue-50/30' : ''
              }`}
            >
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-4 flex-1">
                    <div className="mt-1">
                      {getNotificationIcon(notification.type)}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className={`font-semibold ${!notification.read ? 'text-gray-900' : 'text-gray-700'}`}>
                          {notification.title}
                        </h3>
                        <Badge 
                          variant="outline" 
                          className={getPriorityColor(notification.priority)}
                        >
                          {notification.priority === 'high' ? 'Alta' : 
                           notification.priority === 'medium' ? 'Média' : 'Baixa'}
                        </Badge>
                        {!notification.read && (
                          <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                        )}
                      </div>
                      <p className="text-gray-600 mb-3">{notification.message}</p>
                      <div className="flex items-center text-sm text-gray-500">
                        <Clock className="h-4 w-4 mr-1" />
                        {format(new Date(notification.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 ml-4">
                    {!notification.read && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => markAsRead.mutate(notification.id)}
                      >
                        <Check className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
};

export default Notifications;