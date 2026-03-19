import type { IncomingMessage, ServerResponse } from 'node:http';

export default async function handler(req: IncomingMessage & { body?: any; url?: string }, res: ServerResponse) {
  const result: Record<string, unknown> = {
    method: req.method || 'GET',
    phases: [] as string[]
  };

  try {
    (result.phases as string[]).push('handler_started');
    const shared = await import('./_shared.js');
    (result.phases as string[]).push('shared_imported');

    const debugConfig = getEnvDebug();
    result.env = debugConfig;

    const authHeader = Array.isArray(req.headers.authorization) ? req.headers.authorization[0] : req.headers.authorization;
    if (authHeader?.startsWith('Bearer ')) {
      (result.phases as string[]).push('auth_header_present');
      try {
        const user = await shared.requireUser(req.headers);
        result.user = { id: user.id, email: user.email ?? null };
        (result.phases as string[]).push('auth_verified');
      } catch (error) {
        result.authError = error instanceof Error ? error.message : String(error);
      }
    }

    result.openai = {
      hasApiKey: Boolean(process.env.OPENAI_API_KEY),
      model: process.env.OPENAI_MODEL || 'gpt-5.2-chat-latest'
    };

    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify(result));
  } catch (error) {
    res.statusCode = 500;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({
      ...result,
      fatalError: error instanceof Error ? error.message : String(error)
    }));
  }
}

function getEnvDebug() {
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
