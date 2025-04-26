// src/pages/rooms.tsx
import { useEffect, useState } from "react";
import { roomService } from "@/services/roomService";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2 } from "lucide-react";

export default function RoomsPage() {
  const [rooms, setRooms] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRooms = async () => {
      try {
        const data = await roomService.getAllRooms();
        setRooms(data);
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    };

    fetchRooms();
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <Loader2 className="animate-spin w-8 h-8 text-primary" />
      </div>
    );
  }

  return (
    <div className="p-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {rooms.map((room) => (
        <Card key={room.id}>
          <img
            src={room.image_urls?.[0] || "/placeholder.svg"}
            alt={room.name}
            className="w-full h-48 object-cover rounded-t-md"
          />
          <CardContent className="p-4">
            <h2 className="font-bold text-xl">{room.name}</h2>
            <p className="text-sm text-muted-foreground mt-2">{room.description}</p>
            <p className="text-primary font-semibold mt-4">
              R$ {room.price?.toFixed(2) || "Preço sob consulta"}
            </p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
