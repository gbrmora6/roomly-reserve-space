// Temporary bypass for corrupted Supabase types
// This file provides a working Supabase client without type dependencies

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = "https://fgiidcdsvmqxdkclgety.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZnaWlkY2Rzdm1xeGRrY2xnZXR5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDU0NDY3NDksImV4cCI6MjA2MTAyMjc0OX0.Wwc-QQghL_Z7XE4S_VuweP01TCW6id07LZRht6gynAM";

// Create untyped client to bypass all type issues
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY) as any;

// Re-export for compatibility
export default supabase;