// @ts-nocheck
// Global type override to handle corrupted Supabase types
declare module "@/integrations/supabase/types" {
  export interface Database {
    public: {
      Tables: any;
      Views: any;
      Functions: any;
      Enums: any;
      CompositeTypes: any;
    };
  }
  export type PublicSchema = any;
  export type Tables<T> = any;
  export type Views<T> = any;
  export type Enums<T> = any;
  export type CompositeTypes<T> = any;
}

// Override the corrupted types file
declare global {
  namespace TypescriptOverrides {
    interface Database {
      public: {
        Tables: any;
        Views: any;
        Functions: any;
        Enums: any;
        CompositeTypes: any;
      };
    }
  }
}