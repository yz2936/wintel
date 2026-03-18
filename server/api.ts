import type { StoredPublicUser } from './storage';
import { createSessionToken, hashPassword, verifyPassword } from './auth';
import { fetchFocusSummary, fetchNews, fetchPlanOfAttack, fetchTimeline } from './openai';
import { getStorage } from './storage';

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

    if (method === 'POST' && path === '/api/auth/register') {
      const storage = await getStorage();
      const name = String(input.body?.name || '').trim();
      const email = String(input.body?.email || '').trim().toLowerCase();
      const password = String(input.body?.password || '');

      if (!name || !email || password.length < 8) {
        return json(400, { error: 'Name, email, and a password of at least 8 characters are required.' });
      }

      const existing = await storage.getUserByEmail(email);
      if (existing) {
        return json(409, { error: 'An account with that email already exists.' });
      }

      const now = new Date().toISOString();
      const passwordHash = await hashPassword(password);
      const userId = await storage.createUser({
        name,
        email,
        password_hash: passwordHash,
        created_at: now,
        last_login_at: now
      });
      const token = createSessionToken();
      const state = defaultUserState();

      await Promise.all([
        storage.createSession(token, userId, now),
        storage.upsertUserState(userId, state, now)
      ]);

      const user = await storage.getUserById(userId);
      return json(200, { token, user: mapUser(user), state });
    }

    if (method === 'POST' && path === '/api/auth/login') {
      const storage = await getStorage();
      const email = String(input.body?.email || '').trim().toLowerCase();
      const password = String(input.body?.password || '');
      const user = await storage.getUserByEmail(email);

      if (!user || !(await verifyPassword(password, user.password_hash))) {
        return json(401, { error: 'Invalid email or password.' });
      }

      const now = new Date().toISOString();
      const token = createSessionToken();

      await Promise.all([
        storage.updateUserLogin(user.id, now),
        storage.deleteSessionsForUser(user.id)
      ]);
      await storage.createSession(token, user.id, now);

      const refreshedUser = await storage.getUserById(user.id);
      const state = sanitizeUserState(await storage.getUserState(user.id));
      return json(200, { token, user: mapUser(refreshedUser), state });
    }

    if (method === 'GET' && path === '/api/auth/session') {
      const auth = await requireUser(input.headers);
      const storage = await getStorage();
      return json(200, { user: auth.user, state: sanitizeUserState(await storage.getUserState(auth.user.id)) });
    }

    if (method === 'POST' && path === '/api/auth/logout') {
      const token = getBearerToken(input.headers?.authorization);
      if (token) {
        const storage = await getStorage();
        await storage.deleteSession(token);
      }
      return { status: 204 };
    }

    if (method === 'PUT' && path === '/api/user/state') {
      const auth = await requireUser(input.headers);
      const storage = await getStorage();
      const state = sanitizeUserState(input.body?.state);
      await storage.upsertUserState(auth.user.id, state, new Date().toISOString());
      return json(200, { ok: true });
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

export function defaultUserState() {
  return {
    selectedCompanyId: null,
    selectedOpCos: [],
    selectedFunctions: [],
    selectedYear: null,
    userProfile: '',
    customQuestions: [],
    messages: []
  };
}

export function sanitizeUserState(input: any) {
  const fallback = defaultUserState();
  return {
    selectedCompanyId: typeof input?.selectedCompanyId === 'string' ? input.selectedCompanyId : null,
    selectedOpCos: Array.isArray(input?.selectedOpCos) ? input.selectedOpCos.filter((value: unknown) => typeof value === 'string') : fallback.selectedOpCos,
    selectedFunctions: Array.isArray(input?.selectedFunctions) ? input.selectedFunctions.filter((value: unknown) => typeof value === 'string') : fallback.selectedFunctions,
    selectedYear: typeof input?.selectedYear === 'number' ? input.selectedYear : null,
    userProfile: typeof input?.userProfile === 'string' ? input.userProfile : fallback.userProfile,
    customQuestions: Array.isArray(input?.customQuestions) ? input.customQuestions.filter((value: unknown) => typeof value === 'string') : fallback.customQuestions,
    messages: Array.isArray(input?.messages) ? input.messages : fallback.messages
  };
}

async function requireUser(headers?: Record<string, string | string[] | undefined>) {
  const token = getBearerToken(headers?.authorization);
  if (!token) {
    throw new Error('UNAUTHORIZED');
  }

  const storage = await getStorage();
  const row = await storage.getUserBySessionToken(token);
  if (!row) {
    throw new Error('UNAUTHORIZED');
  }

  return { user: mapUser(row) };
}

function getBearerToken(authorization?: string | string[]) {
  const header = Array.isArray(authorization) ? authorization[0] : authorization;
  if (!header?.startsWith('Bearer ')) {
    return null;
  }

  return header.slice('Bearer '.length);
}

function mapUser(row: StoredPublicUser | undefined) {
  if (!row) {
    throw new Error('User not found after persistence operation.');
  }

  return {
    id: row.id,
    name: row.name,
    email: row.email,
    lastLoginAt: row.last_login_at
  };
}

function normalizePath(pathname: string) {
  const cleanPath = pathname.split('?')[0] || '/';
  return cleanPath.startsWith('/') ? cleanPath : `/${cleanPath}`;
}

function json(status: number, body: unknown): ApiResult {
  return { status, body };
}
