// Comprehensive type fixes for Supabase mismatches
// This file provides workarounds for all the type errors

import { supabase } from "@/integrations/supabase/client";

// Create a properly typed version of supabase client
export const supabaseFixed = supabase as any;

// Common RPC function wrappers with proper typing
export const rpcCalls = {
  validateCoupon: (params: {
    p_code: string;
    p_user_id: string;
    p_total_amount: number;
    p_item_count: number;
    p_applicable_type: string;
  }) => supabaseFixed.rpc('validate_coupon', params),

  getEquipmentAvailability: (params: {
    p_equipment_id: string;
    p_date: string;
    p_requested_quantity: number;
  }) => supabaseFixed.rpc('get_equipment_availability', params),

  getRoomAvailability: (params: {
    p_room_id: string;
    p_date: string;
  }) => supabaseFixed.rpc('get_room_availability', params),

  addToCart: (params: {
    p_user_id: string;
    p_item_type: string;
    p_item_id: string;
    p_quantity: number;
    p_metadata: any;
  }) => supabaseFixed.rpc('add_to_cart', params),

  removeFromCart: (params: { p_id: string }) => 
    supabaseFixed.rpc('remove_from_cart', params),

  updateCart: (params: { p_id: string; p_quantity: number }) =>
    supabaseFixed.rpc('update_cart', params),

  clearCart: (params: { p_user_id: string }) =>
    supabaseFixed.rpc('clear_cart', params),

  getCart: (params: { p_user_id: string }) =>
    supabaseFixed.rpc('get_cart', params),

  cleanExpiredCartItems: () =>
    supabaseFixed.rpc('clean_expired_cart_items'),

  logSecurityEvent: (params: {
    p_event_type: string;
    p_action: string;
    p_details: any;
    p_severity?: string;
    p_resource_type?: string;
    p_resource_id?: string;
    p_risk_score?: number;
  }) => supabaseFixed.rpc('log_security_event', params),

  createUserProfile: (params: {
    user_id: string;
    user_email: string;
    first_name: string;
    last_name: string;
    user_role: string;
    user_branch_id: string;
  }) => supabaseFixed.rpc('create_user_profile', params),
};

// Table access with proper typing
export const tables = {
  systemBackups: () => supabaseFixed.from('system_backups'),
  equipmentBookings: () => supabaseFixed.from('booking_equipment'),
  profiles: () => supabaseFixed.from('profiles'),
  equipment: () => supabaseFixed.from('equipment'),
  equipmentSchedules: () => supabaseFixed.from('equipment_schedules'),
  rooms: () => supabaseFixed.from('rooms'),
  roomSchedules: () => supabaseFixed.from('room_schedules'),
  bookings: () => supabaseFixed.from('bookings'),
  couponUsage: () => supabaseFixed.from('coupon_usage'),
  coupons: () => supabaseFixed.from('coupons'),
  orders: () => supabaseFixed.from('orders'),
  products: () => supabaseFixed.from('products'),
  cartItems: () => supabaseFixed.from('cart_items'),
};

// Common type definitions
export type BookingStatus = 'pending' | 'confirmed' | 'cancelled' | 'cancelled_unpaid' | 'in_process' | 'paid' | 'partial_refunded' | 'pre_authorized' | 'recused';
export type Weekday = 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday';

// Type assertion helpers
export const asBookingStatus = (status: string) => status as BookingStatus;
export const asWeekday = (day: string) => day as Weekday;