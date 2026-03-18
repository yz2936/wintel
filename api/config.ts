import type { IncomingMessage, ServerResponse } from 'node:http';
import { getPublicSupabaseConfig, getPublicSupabaseConfigDebug } from '../server/supabase';

export default async function handler(_req: IncomingMessage, res: ServerResponse) {
  const config = getPublicSupabaseConfig();

  if (!config.supabaseUrl || !config.supabaseAnonKey) {
    res.statusCode = 500;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({
      error: 'Supabase public config is missing on the server. Set SUPABASE_URL and SUPABASE_ANON_KEY in Vercel.',
      debug: getPublicSupabaseConfigDebug()
    }));
    return;
  }

  res.statusCode = 200;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify({
    ...config,
    debug: getPublicSupabaseConfigDebug()
  }));
}
