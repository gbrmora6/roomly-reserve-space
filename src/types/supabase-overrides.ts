// Type overrides to handle Supabase type mismatches
// This file provides type workarounds until the Supabase types are regenerated

export type SupabaseClientAny = any;

// Helper function to cast Supabase operations with type safety workaround
export const supabaseAny = (client: any) => client as SupabaseClientAny;

// Common function parameter types
export interface ValidateCouponResult {
  is_valid: boolean;
  coupon_id?: string;
  discount_amount?: number;
  error_message?: string;
}

export interface EquipmentAvailabilityResult {
  hour: string;
  is_available: boolean;
  available_quantity: number;
  blocked_reason?: string;
}

// Status type overrides
export type BookingStatusOverride = 'pending' | 'confirmed' | 'cancelled' | 'cancelled_unpaid' | 'in_process' | 'paid' | 'partial_refunded' | 'pre_authorized' | 'recused';

export type WeekdayOverride = 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday';

// Equipment interface
export interface Equipment {
  id: string;
  name: string;
  description?: string;
  price_per_hour: number;
  quantity: number;
  is_active: boolean;
  branch_id: string;
  created_at: string;
  updated_at: string;
}

// Type assertion helpers
export const assertBookingStatus = (status: any): BookingStatusOverride => status as BookingStatusOverride;
export const assertWeekday = (day: any): WeekdayOverride => day as WeekdayOverride;