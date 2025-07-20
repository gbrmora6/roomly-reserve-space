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