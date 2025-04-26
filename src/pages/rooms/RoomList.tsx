
import React from "react";
import MainLayout from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Calendar } from "lucide-react";

const RoomList: React.FC = () => {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchRooms = async () => {
      try {
        const data = await roomService.getAllRooms(); // Aqui já tratamos sem esperar erro
        setRooms(data || []);
      } catch (err) {
        console.error("Erro ao carregar salas:", err);
        setError("Não foi possível carregar as salas. Tente novamente mais tarde.");
      } finally {
        setLoading(false);
      }
    };

  return (
    <MainLayout>
      <div className="container mx-auto px-4 py-12">
        <h1 className="text-3xl font-bold text-gray-900">Salas disponíveis</h1>
        
        {/* Filtros */}
        <div className="mt-8 rounded-lg border bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-xl font-semibold text-gray-900">Filtros</h2>
          <div className="grid gap-6 md:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="date">Data</Label>
              <div className="relative">
                <Input id="date" type="date" className="pl-10" />
                <Calendar className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="capacity">Capacidade</Label>
              <Select>
                <SelectTrigger id="capacity">
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="any">Qualquer</SelectItem>
                  <SelectItem value="1-5">1-5 pessoas</SelectItem>
                  <SelectItem value="6-10">6-10 pessoas</SelectItem>
                  <SelectItem value="11-20">11-20 pessoas</SelectItem>
                  <SelectItem value="20+">Mais de 20 pessoas</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="features">Recursos</Label>
              <Select>
                <SelectTrigger id="features">
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="wifi">Wi-Fi</SelectItem>
                  <SelectItem value="projector">Projetor</SelectItem>
                  <SelectItem value="ac">Ar-condicionado</SelectItem>
                  <SelectItem value="whiteboard">Quadro branco</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <div className="mt-6 flex justify-end">
            <Button className="bg-roomly-600 hover:bg-roomly-700">
              Aplicar filtros
            </Button>
          </div>
        </div>
        
        {/* Lista de salas */}
        <div className="mt-12 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {rooms.map((room) => (
            <Card key={room.id} className="overflow-hidden">
              <div className="relative h-48 w-full overflow-hidden">
                <img
                  src={room.image}
                  alt={room.name}
                  className="h-full w-full object-cover"
                />
              </div>
              
              <CardHeader>
                <CardTitle>{room.name}</CardTitle>
              </CardHeader>
              
              <CardContent className="space-y-4">
                <p className="text-gray-600">{room.description}</p>
                <div>
                  <p className="font-medium text-gray-900">Capacidade: {room.capacity} pessoas</p>
                  <p className="text-roomly-600 font-bold">R$ {room.pricePerHour}/hora</p>
                </div>
                
                <Separator />
                
                <div>
                  <h4 className="mb-2 font-medium text-gray-900">Recursos:</h4>
                  <div className="flex flex-wrap gap-2">
                    {room.features.map((feature, index) => (
                      <span
                        key={index}
                        className="rounded-full bg-roomly-100 px-3 py-1 text-xs text-roomly-800"
                      >
                        {feature}
                      </span>
                    ))}
                  </div>
                </div>
              </CardContent>
              
              <CardFooter>
                <Button className="w-full bg-roomly-600 hover:bg-roomly-700">
                  Reservar agora
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      </div>
    </MainLayout>
  );
};

export default RoomList;
