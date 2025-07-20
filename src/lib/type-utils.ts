// Type utility functions to handle Supabase type mismatches
// This provides safe type casting for build compatibility

export const asAny = (value: unknown): any => value as any;

export const asString = (value: unknown): string => String(value);

export const asNumber = (value: unknown): number => Number(value) || 0;

export const withTypeAssert = <T>(value: unknown): T => value as T;

// Safe property access for objects with type mismatches
export const safeAccess = (obj: any, path: string): any => {
  const keys = path.split('.');
  let current = obj;
  for (const key of keys) {
    if (current && typeof current === 'object' && key in current) {
      current = current[key];
    } else {
      return undefined;
    }
  }
  return current;
};

// Helper to bypass strict type checking for database operations
export const bypassTypes = {
  supabase: (client: any) => client as any,
  rpc: (client: any, name: string, params?: any) => (client as any).rpc(name, params),
  from: (client: any, table: string) => (client as any).from(table),
};