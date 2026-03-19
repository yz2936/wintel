import { getSupabase } from './supabase';

export interface AuthUser {
  id: string;
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

export async function register(name: string, email: string, password: string): Promise<{ user: AuthUser; state: PersistedState }> {
  const supabase = await getSupabase();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { name }
    }
  });

  if (error) {
    throw error;
  }

  if (!data.user) {
    throw new Error('Sign-up failed.');
  }

  if (!data.session) {
    throw new Error('Check your email to confirm your account, then log in.');
  }

  const state = await ensureAndLoadUserState(data.user.id);
  await bootstrapDocketMonitoring();
  return { user: mapUser(data.user), state };
}

export async function login(email: string, password: string): Promise<{ user: AuthUser; state: PersistedState }> {
  const supabase = await getSupabase();
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    throw error;
  }

  if (!data.user) {
    throw new Error('Login failed.');
  }

  const state = await ensureAndLoadUserState(data.user.id);
  await bootstrapDocketMonitoring();
  return { user: mapUser(data.user), state };
}

export async function restoreSession(): Promise<{ user: AuthUser; state: PersistedState } | null> {
  const supabase = await getSupabase();
  const { data, error } = await supabase.auth.getSession();
  if (error || !data.session?.user) {
    return null;
  }

  try {
    const user = data.session.user;
    const state = await ensureAndLoadUserState(user.id);
    await bootstrapDocketMonitoring();
    return { user: mapUser(user), state };
  } catch {
    await supabase.auth.signOut({ scope: 'local' });
    return null;
  }
}

export async function logout(): Promise<void> {
  const supabase = await getSupabase();
  const { error } = await supabase.auth.signOut({ scope: 'local' });
  if (error) {
    throw error;
  }
}

export async function saveUserState(state: PersistedState): Promise<void> {
  const supabase = await getSupabase();
  const { data } = await supabase.auth.getSession();
  const userId = data.session?.user.id;
  if (!userId) {
    throw new Error('No active session.');
  }

  const { error } = await supabase
    .from('user_state')
    .upsert(
      {
        user_id: userId,
        state_json: state,
        updated_at: new Date().toISOString()
      },
      { onConflict: 'user_id' }
    );

  if (error) {
    throw error;
  }
}

async function ensureAndLoadUserState(userId: string): Promise<PersistedState> {
  const existingState = await loadUserState(userId);
  if (existingState) {
    return existingState;
  }

  const defaultState = defaultUserState();
  const supabase = await getSupabase();
  const { error } = await supabase
    .from('user_state')
    .upsert(
      {
        user_id: userId,
        state_json: defaultState,
        updated_at: new Date().toISOString()
      },
      { onConflict: 'user_id' }
    );

  if (error) {
    throw error;
  }

  return defaultState;
}

async function loadUserState(userId: string): Promise<PersistedState | null> {
  const supabase = await getSupabase();
  const { data, error } = await supabase
    .from('user_state')
    .select('state_json')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (!data?.state_json) {
    return null;
  }

  return sanitizeUserState(data.state_json);
}

function defaultUserState(): PersistedState {
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

function sanitizeUserState(input: any): PersistedState {
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

function mapUser(user: { id: string; email?: string | null; user_metadata?: Record<string, any>; updated_at?: string | null; last_sign_in_at?: string | null }): AuthUser {
  return {
    id: user.id,
    name: typeof user.user_metadata?.name === 'string' && user.user_metadata.name.trim()
      ? user.user_metadata.name.trim()
      : (user.email || 'User').split('@')[0],
    email: user.email || '',
    lastLoginAt: user.last_sign_in_at || user.updated_at || new Date().toISOString()
  };
}

async function bootstrapDocketMonitoring() {
  try {
    const supabase = await getSupabase();
    const { data } = await supabase.auth.getSession();
    const accessToken = data.session?.access_token;
    if (!accessToken) {
      return;
    }

    await fetch('/api/dockets/bootstrap', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`
      }
    });
  } catch (error) {
    console.warn('Failed to bootstrap docket monitoring.', error);
  }
}
