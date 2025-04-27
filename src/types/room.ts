export interface RoomPhoto {
  id: string;
  room_id: string;
  url: string;
}

export interface RoomSchedule {
  weekday: string;
  start_time: string;
  end_time: string;
  room_id: string;
  id: string;
  created_at: string;
  updated_at: string;
}

export interface Room {
  id: string;
  name: string;
  description: string | null;
  has_wifi: boolean | null;
  has_ac: boolean | null; 
  has_tv: boolean | null;
  has_private_bathroom: boolean | null;
  has_chairs: boolean | null;
  has_tables: boolean | null;
  price_per_hour: number;
  room_photos?: RoomPhoto[];
  created_at: string;
  updated_at: string;
  open_time?: string | null;
  close_time?: string | null;
  open_days?: number[] | null;
}
