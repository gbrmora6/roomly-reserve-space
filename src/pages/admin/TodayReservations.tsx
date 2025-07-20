
import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { Calendar, Clock, User, Package, Eye, MapPin } from "lucide-react";
import { format, startOfDay, endOfDay } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useBranchFilter } from "@/hooks/useBranchFilter";

export default function TodayReservations() {
  const { branchId } = useBranchFilter();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedRoom, setSelectedRoom] = useState<any>(null);
  const today = new Date();

  // Buscar todas as salas da filial
  const { data: rooms = [], isLoading: roomsLoading } = useQuery({
    queryKey: ["rooms", branchId],
    queryFn: async () => {
      if (!branchId) return [];
      
      const { data, error } = await supabase
        .from("rooms")
        .select("*")
        .eq("branch_id", branchId)
        .eq("is_active", true)
        .order("name");

      if (error) throw error;
      return data || [];
    },
    enabled: !!branchId,
  });

  // Buscar reservas de salas do dia
  const { data: roomBookings = [], isLoading: bookingsLoading } = useQuery({
    queryKey: ["today-room-bookings", branchId],
    queryFn: async () => {
      if (!branchId) {
        throw new Error("Branch ID não encontrado");
      }
      
      const startOfToday = startOfDay(today).toISOString();
      const endOfToday = endOfDay(today).toISOString();
      const { data, error } = await supabase
        .from("bookings")
        .select(`
          *,
          room:rooms(id, name, description)
        `)
        .eq("branch_id", branchId)
        .gte("start_time", startOfToday)
        .lte("start_time", endOfToday)
        .eq("status", "paid")
        .order("start_time");

      if (error) {
        throw error;
      }
      
      if (!data || data.length === 0) {
        return [];
      }
      
      // Buscar dados dos usuários separadamente
      const bookingsWithProfiles = await Promise.all(
        data.map(async (booking) => {
          try {
            const { data: profileData, error: profileError } = await supabase
              .from("profiles")
              .select("first_name, last_name, email, phone")
              .eq("id", booking.user_id)
              .maybeSingle();
            
            return {
              ...booking,
              profiles: profileError || !profileData
                ? { first_name: 'Usuário', last_name: 'Desconhecido', email: '', phone: '' }
                : profileData
            };
            
          } catch (err) {
            return {
              ...booking,
              profiles: { first_name: 'Usuário', last_name: 'Desconhecido', email: '', phone: '' }
            };
          }
        })
      );
      
      return bookingsWithProfiles;
    },
    enabled: !!branchId,
    refetchInterval: 30000
  });

  const isLoading = roomsLoading || bookingsLoading;

  // Agrupar reservas por sala
  const roomsWithBookings = rooms.map(room => {
    const bookings = roomBookings.filter(booking => {
      const match = booking.room_id === room.id;
      return match;
    });
    
    const result = {
      ...room,
      bookings: bookings.sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime())
    };
    
    return result;
  });

  // Filtrar salas baseado na busca
  const filteredRooms = roomsWithBookings.filter(room => {
    if (!searchTerm) {
      return true;
    }
    
    const searchLower = searchTerm.toLowerCase();
    const roomName = room.name?.toLowerCase() || "";
    
    const hasMatchingBooking = room.bookings.some(booking => {
      const userName = getUserName(booking.profiles).toLowerCase();
      const userEmail = getUserEmail(booking.profiles).toLowerCase();
      return userName.includes(searchLower) || userEmail.includes(searchLower);
    });
    
    const roomNameMatch = roomName.includes(searchLower);
    return roomNameMatch || hasMatchingBooking;
  });

  // Função para obter status da sala
  const getRoomStatus = (bookings: any[]) => {
    if (bookings.length === 0) {
      return { status: "Livre", variant: "secondary" as const };
    }
    
    const now = new Date();
    
    const currentBooking = bookings.find(booking => {
      const start = new Date(booking.start_time);
      const end = new Date(booking.end_time);
      const isCurrentlyActive = now >= start && now <= end;
      return isCurrentlyActive;
    });
    
    if (currentBooking) {
      return { status: "Ocupada", variant: "destructive" as const };
    }
    
    const nextBooking = bookings.find(booking => {
      const start = new Date(booking.start_time);
      const isFuture = start > now;
      return isFuture;
    });
    
    if (nextBooking) {
      return { status: "Reservada", variant: "default" as const };
    }
    
    return { status: "Livre", variant: "secondary" as const };
  };

  const getUserName = (profiles: any) => {
    if (!profiles || typeof profiles !== 'object') {
      return "Usuário não encontrado";
    }
    if (!('first_name' in profiles) || !('last_name' in profiles)) {
      return "Usuário não encontrado";
    }
    return `${profiles.first_name || ""} ${profiles.last_name || ""}`.trim() || "Usuário não encontrado";
  };

  const getUserEmail = (profiles: any) => {
    if (!profiles || typeof profiles !== 'object') {
      return "";
    }
    if (!('email' in profiles)) {
      return "";
    }
    return profiles.email || "";
  };

  const getUserPhone = (profiles: any) => {
    if (!profiles || typeof profiles !== 'object') {
      return "";
    }
    if (!('phone' in profiles)) {
      return "";
    }
    return profiles.phone || "";
  };

  const getTotalRevenue = (bookings: any[]) => {
    return bookings.reduce((total, booking) => total + (booking.total_price || 0), 0);
  };

  // Estatísticas
  const totalRooms = filteredRooms.length;
  
  const occupiedRooms = filteredRooms.filter(room => {
    const status = getRoomStatus(room.bookings);
    return status.status === "Ocupada";
  }).length;
  
  const reservedRooms = filteredRooms.filter(room => getRoomStatus(room.bookings).status === "Reservada").length;
  
  const freeRooms = filteredRooms.filter(room => getRoomStatus(room.bookings).status === "Livre").length;
  
  const totalBookings = roomBookings.length;
  
  const totalRevenue = getTotalRevenue(roomBookings);

  return (
    <div className="space-y-6">
      {/* Header com estatísticas */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <Calendar className="h-8 w-8 text-blue-600" />
              <div>
                <p className="text-sm text-muted-foreground">Data</p>
                <p className="text-lg font-semibold">{format(today, "dd/MM/yyyy", { locale: ptBR })}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <Clock className="h-8 w-8 text-green-600" />
              <div>
                <p className="text-sm text-muted-foreground">Total de Reservas</p>
                <p className="text-lg font-semibold">{totalBookings}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <Package className="h-8 w-8 text-purple-600" />
              <div>
                <p className="text-sm text-muted-foreground">Receita do Dia</p>
                <p className="text-lg font-semibold">R$ {totalRevenue.toFixed(2)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filtro de busca */}
      <Card>
        <CardContent className="p-6">
          <Input
            placeholder="Buscar por sala ou cliente..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="max-w-md"
          />
        </CardContent>
      </Card>

      {/* Grid de salas */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredRooms.map((room) => {
          const roomStatus = getRoomStatus(room.bookings);
          
          return (
            <Card key={room.id} className="hover:shadow-lg transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">{room.name}</CardTitle>
                  <Badge variant={roomStatus.variant}>{roomStatus.status}</Badge>
                </div>
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <User className="h-4 w-4" />
                    <span>Sala {room.name}</span>
                  </div>
                </div>
              </CardHeader>
              
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Reservas hoje:</span>
                    <Badge variant="outline">{room.bookings.length}</Badge>
                  </div>
                  
                  {room.bookings.length > 0 && (
                    <div className="text-sm text-muted-foreground">
                      <p>Próxima reserva:</p>
                      <p className="font-medium text-foreground">
                        {format(new Date(room.bookings[0].start_time), "HH:mm", { locale: ptBR })} - {getUserName(room.bookings[0].profiles)}
                      </p>
                    </div>
                  )}
                  
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button 
                        variant="outline" 
                        className="w-full"
                        onClick={() => setSelectedRoom(room)}
                      >
                        <Eye className="h-4 w-4 mr-2" />
                        Ver Detalhes
                      </Button>
                    </DialogTrigger>
                    
                    <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                      <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                          <Calendar className="h-5 w-5" />
                          {room.name} - {format(today, "dd/MM/yyyy", { locale: ptBR })}
                        </DialogTitle>
                        <DialogDescription>
                          Visualize todas as reservas e informações detalhadas desta sala para o dia de hoje.
                        </DialogDescription>
                      </DialogHeader>
                      
                      <div className="space-y-4">
                        {/* Informações da sala */}
                        <div className="grid grid-cols-2 gap-4 p-4 bg-muted rounded-lg">
                          <div>
                            <p className="text-sm text-muted-foreground">Capacidade</p>
                            <p className="font-medium">Sala {room.name}</p>
                          </div>
                          <div>
                            <p className="text-sm text-muted-foreground">Localização</p>
                            <p className="font-medium">{room.description || "Não informado"}</p>
                          </div>
                          <div>
                            <p className="text-sm text-muted-foreground">Status Atual</p>
                            <Badge variant={roomStatus.variant}>{roomStatus.status}</Badge>
                          </div>
                          <div>
                            <p className="text-sm text-muted-foreground">Receita do Dia</p>
                            <p className="font-medium">R$ {getTotalRevenue(room.bookings).toFixed(2)}</p>
                          </div>
                        </div>
                        
                        {/* Lista de reservas */}
                        <div>
                          <h4 className="font-semibold mb-3">Reservas do Dia ({room.bookings.length})</h4>
                          
                          {room.bookings.length === 0 ? (
                            <div className="text-center py-8 text-muted-foreground">
                              <Calendar className="h-12 w-12 mx-auto mb-2 opacity-50" />
                              <p>Nenhuma reserva para hoje</p>
                            </div>
                          ) : (
                            <div className="space-y-3">
                              {room.bookings.map((booking, index) => (
                                <div key={booking.id} className="border rounded-lg p-4">
                                  <div className="flex items-center justify-between mb-2">
                                    <div className="flex items-center gap-2">
                                      <Badge variant="outline">{index + 1}</Badge>
                                      <span className="font-medium">
                                        {format(new Date(booking.start_time), "HH:mm", { locale: ptBR })} - 
                                        {format(new Date(booking.end_time), "HH:mm", { locale: ptBR })}
                                      </span>
                                    </div>
                                    <Badge variant="default">R$ {booking.total_price?.toFixed(2) || "0,00"}</Badge>
                                  </div>
                                  
                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                                    <div>
                                      <p className="text-muted-foreground">Cliente</p>
                                      <p className="font-medium">{getUserName(booking.profiles)}</p>
                                    </div>
                                    <div>
                                      <p className="text-muted-foreground">Email</p>
                                      <p className="font-medium">{getUserEmail(booking.profiles)}</p>
                                    </div>
                                    {getUserPhone(booking.profiles) && (
                                      <div>
                                        <p className="text-muted-foreground">Telefone</p>
                                        <p className="font-medium">{getUserPhone(booking.profiles)}</p>
                                      </div>
                                    )}
                                    <div>
                                      <p className="text-muted-foreground">Status</p>
                                      <Badge variant="default">{booking.status === "paid" ? "Pago" : "Confirmado"}</Badge>
                                    </div>
                                  </div>
                                  
                                  {booking.status && (
                                    <div className="mt-3 pt-3 border-t">
                                      <p className="text-muted-foreground text-sm">Observações</p>
                                      <p className="text-sm">Status: {booking.status}</p>
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Estado vazio */}
      {filteredRooms.length === 0 && !isLoading && (
        <Card>
          <CardContent className="text-center py-12">
            <Calendar className="h-16 w-16 mx-auto mb-4 text-muted-foreground opacity-50" />
            <h3 className="text-lg font-semibold mb-2">Nenhuma sala encontrada</h3>
            <p className="text-muted-foreground">
              {searchTerm 
                ? "Tente ajustar os critérios de busca."
                : "Não há salas cadastradas para esta filial."
              }
            </p>
          </CardContent>
        </Card>
      )}
      
      {/* Loading state */}
      {isLoading && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader>
                <div className="h-6 bg-muted rounded w-3/4"></div>
                <div className="h-4 bg-muted rounded w-1/2"></div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="h-4 bg-muted rounded"></div>
                  <div className="h-4 bg-muted rounded w-2/3"></div>
                  <div className="h-10 bg-muted rounded"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
