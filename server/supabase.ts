type PublicSupabaseConfig = {
  supabaseUrl: string;
  supabaseAnonKey: string;
};

export function getPublicSupabaseConfig(): PublicSupabaseConfig {
  const supabaseUrl =
    process.env.SUPABASE_URL ||
    process.env.NEXT_PUBLIC_SUPABASE_URL ||
    process.env.VITE_SUPABASE_URL ||
    '';
  const supabaseAnonKey =
    process.env.SUPABASE_ANON_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.VITE_SUPABASE_ANON_KEY ||
    '';

  return { supabaseUrl, supabaseAnonKey };
}

export function getPublicSupabaseConfigDebug() {
  return {
    hasSupabaseUrl: Boolean(process.env.SUPABASE_URL),
    hasSupabaseAnonKey: Boolean(process.env.SUPABASE_ANON_KEY),
    hasNextPublicSupabaseUrl: Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL),
    hasNextPublicSupabaseAnonKey: Boolean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
    hasViteSupabaseUrl: Boolean(process.env.VITE_SUPABASE_URL),
    hasViteSupabaseAnonKey: Boolean(process.env.VITE_SUPABASE_ANON_KEY),
    hasServiceRoleKey: Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY)
  };
}

export async function getUserFromAccessToken(accessToken: string) {
  const { supabaseUrl, supabaseAnonKey } = getPublicSupabaseConfig();
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
  const apiKey = serviceRoleKey || supabaseAnonKey;

  if (!supabaseUrl || !apiKey) {
    throw new Error('Missing Supabase server environment variables. Set SUPABASE_URL and SUPABASE_ANON_KEY or SUPABASE_SERVICE_ROLE_KEY.');
  }

  const response = await fetch(`${supabaseUrl}/auth/v1/user`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      apikey: apiKey
    }
  });

  if (!response.ok) {
    const details = await response.text();
    throw new Error(`Supabase auth lookup failed (${response.status}): ${details}`);
  }

  return response.json();
}
