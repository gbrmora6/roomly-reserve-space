
import { Database } from "@/integrations/supabase/types";

export interface RoomPhoto {
  id: string;
  url: string;
  room_id: string;
}

export interface Room {
  id: string;
  name: string;
  description: string | null;
  price_per_hour: number;
  has_wifi: boolean | null;
  has_ac: boolean | null;
  has_tables: boolean | null;
  has_chairs: boolean | null;
  open_time: string | null;
  close_time: string | null;
  open_days: number[] | null;
  created_at: string;
  updated_at: string;
  room_photos?: RoomPhoto[];
  capacity?: number;
}
