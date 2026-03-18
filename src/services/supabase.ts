import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const missingConfigMessage = !supabaseUrl || !supabaseAnonKey
  ? 'Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY. Add both in Vercel Project Settings -> Environment Variables, then redeploy.'
  : null;

let supabaseClient: SupabaseClient | null = null;

export function getSupabase() {
  if (missingConfigMessage) {
    throw new Error(missingConfigMessage);
  }

  if (!supabaseClient) {
    supabaseClient = createClient(supabaseUrl!, supabaseAnonKey!, {
      auth: {
        persistSession: true,
        autoRefreshToken: true
      }
    });
  }

  return supabaseClient;
}

export function getSupabaseConfigError() {
  return missingConfigMessage;
}
