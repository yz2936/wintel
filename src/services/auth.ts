import { SESSION_TOKEN_KEY } from './gemini';

export interface AuthUser {
  id: number;
  name: string;
  email: string;
  lastLoginAt: string;
}

export interface PersistedChatMessage {
  role: 'user' | 'assistant';
  content: string;
  type?: 'text' | 'report';
  data?: any;
  timestamp: string;
  contacts?: any[];
  keywords?: any[];
}

export interface PersistedState {
  selectedCompanyId: string | null;
  selectedOpCos: string[];
  selectedFunctions: string[];
  selectedYear: number | null;
  userProfile: string;
  customQuestions: string[];
  messages: PersistedChatMessage[];
}

interface AuthResponse {
  token: string;
  user: AuthUser;
  state: PersistedState;
}

function saveToken(token: string) {
  localStorage.setItem(SESSION_TOKEN_KEY, token);
}

function getToken() {
  return localStorage.getItem(SESSION_TOKEN_KEY);
}

function clearToken() {
  localStorage.removeItem(SESSION_TOKEN_KEY);
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const token = getToken();
  const response = await fetch(path, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(init?.headers || {})
    }
  });

  if (!response.ok) {
    const payload = await response.json().catch(() => null);
    throw new Error(payload?.error || `Request failed with status ${response.status}`);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json() as Promise<T>;
}

export async function register(name: string, email: string, password: string): Promise<{ user: AuthUser; state: PersistedState }> {
  const response = await request<AuthResponse>('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify({ name, email, password })
  });
  saveToken(response.token);
  return { user: response.user, state: response.state };
}

export async function login(email: string, password: string): Promise<{ user: AuthUser; state: PersistedState }> {
  const response = await request<AuthResponse>('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password })
  });
  saveToken(response.token);
  return { user: response.user, state: response.state };
}

export async function restoreSession(): Promise<{ user: AuthUser; state: PersistedState } | null> {
  const token = getToken();
  if (!token) {
    return null;
  }

  try {
    return await request<{ user: AuthUser; state: PersistedState }>('/api/auth/session');
  } catch {
    clearToken();
    return null;
  }
}

export async function logout(): Promise<void> {
  try {
    await request<void>('/api/auth/logout', { method: 'POST' });
  } finally {
    clearToken();
  }
}

export async function saveUserState(state: PersistedState): Promise<void> {
  await request('/api/user/state', {
    method: 'PUT',
    body: JSON.stringify({ state })
  });
}
