import { createClient, type SupabaseClient } from '@supabase/supabase-js';

type PublicConfig = {
  supabaseUrl: string;
  supabaseAnonKey: string;
};

let supabaseClient: SupabaseClient | null = null;
let supabasePromise: Promise<SupabaseClient> | null = null;

export async function getSupabase() {
  if (supabaseClient) {
    return supabaseClient;
  }

  if (!supabasePromise) {
    supabasePromise = loadSupabaseClient();
  }

  return supabasePromise;
}

async function loadSupabaseClient() {
  const config = await fetchPublicConfig();
  supabaseClient = createClient(config.supabaseUrl, config.supabaseAnonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true
    }
  });
  return supabaseClient;
}

async function fetchPublicConfig(): Promise<PublicConfig> {
  const response = await fetch('/api/config');
  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(payload?.error || `Failed to load public app config (${response.status}).`);
  }

  if (!payload?.supabaseUrl || !payload?.supabaseAnonKey) {
    throw new Error('Supabase public config is missing on the server. Set SUPABASE_URL and SUPABASE_ANON_KEY in Vercel.');
  }

  return {
    supabaseUrl: payload.supabaseUrl,
    supabaseAnonKey: payload.supabaseAnonKey
  };
}
