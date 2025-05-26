
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

// Define the sender profile type
interface SenderProfile {
  first_name: string;
  last_name: string;
}

// Define the message type
interface Message {
  id: string;
  booking_id: string;
  sender_id: string;
  content: string;
  created_at: string;
  sender?: SenderProfile;
}

export const BookingChat: React.FC<BookingChatProps> = ({ bookingId }) => {
  const { user } = useAuth();
  const [message, setMessage] = useState("");
  const [open, setOpen] = useState(false);

  const { data: messages, refetch } = useQuery({
    queryKey: ["booking-messages", bookingId],
    queryFn: async () => {
      // First get the messages
      const { data: messageData, error: messageError } = await supabase
        .from("messages")
        .select("*")
        .eq("booking_id", bookingId)
        .order("created_at", { ascending: true });

      if (messageError) throw messageError;
      
      // Then get the sender profiles separately and create a map
      const senderIds = [...new Set(messageData.map((msg) => msg.sender_id))];
      
      const { data: profilesData, error: profilesError } = await supabase
        .from("profiles")
        .select("id, first_name, last_name")
        .in("id", senderIds);
      
      if (profilesError) throw profilesError;
      
      // Create a profiles map for quick lookup
      const profilesMap: Record<string, SenderProfile> = {};
      profilesData.forEach((profile) => {
        profilesMap[profile.id] = {
          first_name: profile.first_name,
          last_name: profile.last_name,
        };
      });
      
      // Attach sender information to each message
      const messagesWithSenders = messageData.map((msg) => ({
        ...msg,
        sender: profilesMap[msg.sender_id],
      }));
      
      return messagesWithSenders as Message[];
    },
    enabled: open,
  });

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim() || !user) return;

    try {
      // Get user's branch_id
      const { data: profile } = await supabase
        .from("profiles")
        .select("branch_id")
        .eq("id", user.id)
        .single();

      const { error } = await supabase.from("messages").insert({
        booking_id: bookingId,
        sender_id: user.id,
        content: message.trim(),
        branch_id: profile?.branch_id || "",
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
                    {msg.sender?.first_name || "Usuário"} {msg.sender?.last_name || ""}
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
