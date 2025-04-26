
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

  useEffect(() => {
    const fetchRooms = async () => {
      const { data, error } = await roomService.getAllRooms(); // Buscar todas as salas
      if (error) {
        console.error("Erro ao buscar salas:", error.message);
      } else {
        setRooms(data || []);
      }
      setLoading(false);
    };

    fetchRooms();
  }, []);

  if (loading) {
    return (
      <MainLayout>
        <div className="flex justify-center items-center h-96">
          <p>Carregando salas...</p>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 p-4">
        {rooms.length > 0 ? (
          rooms.map((room) => (
            <Card key={room.id}>
              <CardHeader>
                <CardTitle>{room.name}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="mb-2">{room.description}</p>
                <p className="text-sm text-gray-500 mb-4">Capacidade: {room.capacity} pessoas</p>
                <Button>Reservar</Button>
              </CardContent>
            </Card>
          ))
        ) : (
          <div className="col-span-full text-center text-gray-500">
            Nenhuma sala disponível no momento.
          </div>
        )}
      </div>
    </MainLayout>
  );
};

export default RoomList;
