// src/services/roomService.ts
import { supabase } from "@/integrations/supabase/client";

export const roomService = {
  async getAllRooms() {
    const { data, error } = await supabase
      .from("rooms")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Erro ao buscar salas:", error);
      throw new Error("Erro ao carregar salas.");
    }

    return data;
  },
};
