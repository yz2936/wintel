import { fetchFocusSummary, fetchNews, fetchPlanOfAttack, fetchTimeline } from './openai';
import { getPublicSupabaseConfig, getPublicSupabaseConfigDebug, getServerSupabase } from './supabase';

export type ApiResult = {
  status: number;
  body?: unknown;
};

export async function handleApiRequest(input: {
  method?: string;
  path: string;
  headers?: Record<string, string | string[] | undefined>;
  body?: any;
}): Promise<ApiResult> {
  try {
    const method = (input.method || 'GET').toUpperCase();
    const path = normalizePath(input.path);

    if (method === 'GET' && path === '/api/health') {
      return json(200, { ok: true });
    }

    if (method === 'GET' && path === '/api/config') {
      const config = getPublicSupabaseConfig();
      if (!config.supabaseUrl || !config.supabaseAnonKey) {
        return json(500, {
          error: 'Supabase public config is missing on the server. Set SUPABASE_URL and SUPABASE_ANON_KEY in Vercel.',
          debug: getPublicSupabaseConfigDebug()
        });
      }

      return json(200, {
        ...config,
        debug: getPublicSupabaseConfigDebug()
      });
    }

    if (method === 'POST' && path === '/api/ai/news') {
      await requireUser(input.headers);
      const result = await fetchNews(
        Array.isArray(input.body?.opcos) ? input.body.opcos : [],
        Array.isArray(input.body?.functions) ? input.body.functions : [],
        input.body?.userQuery,
        input.body?.fileContext,
        input.body?.userProfile
      );
      return json(200, result);
    }

    if (method === 'POST' && path === '/api/ai/plan') {
      await requireUser(input.headers);
      return json(200, {
        text: await fetchPlanOfAttack(
          String(input.body?.reportText || ''),
          String(input.body?.userProfile || '')
        )
      });
    }

    if (method === 'POST' && path === '/api/ai/focus-summary') {
      await requireUser(input.headers);
      return json(200, {
        text: await fetchFocusSummary({
          companyName: input.body?.companyName,
          opcos: Array.isArray(input.body?.opcos) ? input.body.opcos : [],
          functions: Array.isArray(input.body?.functions) ? input.body.functions : [],
          selectedYear: typeof input.body?.selectedYear === 'number' ? input.body.selectedYear : null,
          userProfile: typeof input.body?.userProfile === 'string' ? input.body.userProfile : '',
          lastUserPrompt: typeof input.body?.lastUserPrompt === 'string' ? input.body.lastUserPrompt : '',
          lastAssistantSummary: typeof input.body?.lastAssistantSummary === 'string' ? input.body.lastAssistantSummary : ''
        })
      });
    }

    if (method === 'POST' && path === '/api/ai/timeline') {
      await requireUser(input.headers);
      return json(200, await fetchTimeline(
        Array.isArray(input.body?.opcos) ? input.body.opcos : [],
        Array.isArray(input.body?.functions) ? input.body.functions : [],
        typeof input.body?.year === 'number' ? input.body.year : null
      ));
    }

    return json(404, { error: 'Not found' });
  } catch (error) {
    if (error instanceof Error && error.message === 'UNAUTHORIZED') {
      return json(401, { error: 'Unauthorized' });
    }

    const message = error instanceof Error ? error.message : 'Unknown server error';
    console.error(message);
    return json(500, { error: message });
  }
}

async function requireUser(headers?: Record<string, string | string[] | undefined>) {
  const token = getBearerToken(headers?.authorization);
  if (!token) {
    throw new Error('UNAUTHORIZED');
  }

  const supabase = getServerSupabase();
  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data.user) {
    throw new Error('UNAUTHORIZED');
  }

  return { user: data.user };
}

function getBearerToken(authorization?: string | string[]) {
  const header = Array.isArray(authorization) ? authorization[0] : authorization;
  if (!header?.startsWith('Bearer ')) {
    return null;
  }

  return header.slice('Bearer '.length);
}

function normalizePath(pathname: string) {
  const cleanPath = pathname.split('?')[0] || '/';
  return cleanPath.startsWith('/') ? cleanPath : `/${cleanPath}`;
}

function json(status: number, body: unknown): ApiResult {
  return { status, body };
}
