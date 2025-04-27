
export interface RoomPhoto {
  id: string;
  room_id: string;
  url: string;
}

export interface Room {
  id: string;
  name: string;
  description: string | null;
  has_wifi: boolean | null;
  has_ac: boolean | null;
  has_tv: boolean | null;
  has_private_bathroom: boolean | null;
  price_per_hour: number;
  room_photos?: RoomPhoto[];
}
