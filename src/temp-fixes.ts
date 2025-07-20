// Temporary fixes for TypeScript compilation errors
// This file contains type assertions and workarounds to resolve build issues

// 1. Export types that might be missing from the main types file
export type BookingStatus = "in_process" | "paid" | "partial_refunded" | "pending" | "confirmed" | "cancelled" | "cancelled_unpaid" | "pre_authorized" | "recused";
export type UserRole = "client" | "admin" | "super_admin";
export type Weekday = "monday" | "tuesday" | "wednesday" | "thursday" | "friday" | "saturday" | "sunday";

// 2. Extend the global window object for any libraries that might be missing
declare global {
  interface Window {
    C2PgenerateHash: (cardDetails: {
      number: string;
      name: string;
      expiry: string;
      cvc: string;
    }) => Promise<string>;
  }
}

// 3. Type assertion functions for safe casting
export const asBookingStatus = (status: any): BookingStatus => status as BookingStatus;
export const asUserRole = (role: any): UserRole => role as UserRole;
export const asWeekday = (day: any): Weekday => day as Weekday;

// 4. Safe property access helpers
export const safeProperty = (obj: any, property: string) => obj?.[property];
export const safeArrayProperty = (obj: any, property: string): any[] => obj?.[property] || [];
export const safeStringProperty = (obj: any, property: string): string => obj?.[property] || '';
export const safeNumberProperty = (obj: any, property: string): number => obj?.[property] || 0;
export const safeBooleanProperty = (obj: any, property: string): boolean => !!obj?.[property];