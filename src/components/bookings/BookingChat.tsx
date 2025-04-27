
import React, { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MessageSquare } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

interface BookingChatProps {
  bookingId: string;
}

export const BookingChat: React.FC<BookingChatProps> = ({ bookingId }) => {
  const { user } = useAuth();
  const [message, setMessage] = useState("");
  const [open, setOpen] = useState(false);

  const { data: messages, refetch } = useQuery({
    queryKey: ["booking-messages", bookingId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("messages")
        .select(`
          *,
          sender:profiles(first_name, last_name)
        `)
        .eq("booking_id", bookingId)
        .order("created_at", { ascending: true });

      if (error) throw error;
      return data;
    },
    enabled: open,
  });

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim() || !user) return;

    try {
      const { error } = await supabase.from("messages").insert({
        booking_id: bookingId,
        sender_id: user.id,
        content: message.trim(),
      });

      if (error) throw error;

      setMessage("");
      refetch();
    } catch (error) {
      console.error("Error sending message:", error);
    }
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="outline" size="sm">
          <MessageSquare className="h-4 w-4 mr-2" />
          Chat
        </Button>
      </SheetTrigger>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>Chat da Reserva</SheetTitle>
        </SheetHeader>
        
        <div className="flex flex-col h-[calc(100vh-200px)] mt-4">
          <div className="flex-1 overflow-y-auto space-y-4 mb-4">
            {messages?.map((msg) => (
              <div
                key={msg.id}
                className={`flex flex-col ${
                  msg.sender_id === user?.id ? "items-end" : "items-start"
                }`}
              >
                <div
                  className={`rounded-lg px-4 py-2 max-w-[80%] ${
                    msg.sender_id === user?.id
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted"
                  }`}
                >
                  <p className="text-sm font-medium mb-1">
                    {msg.sender?.first_name} {msg.sender?.last_name}
                  </p>
                  <p className="text-sm">{msg.content}</p>
                </div>
              </div>
            ))}
          </div>

          <form onSubmit={sendMessage} className="flex gap-2">
            <Input
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Digite sua mensagem..."
            />
            <Button type="submit">Enviar</Button>
          </form>
        </div>
      </SheetContent>
    </Sheet>
  );
};
