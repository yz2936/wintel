const SESSION_TOKEN_KEY = 'wintel_session_token';

function getSessionToken() {
  return localStorage.getItem(SESSION_TOKEN_KEY);
}

function authHeaders() {
  const token = getSessionToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...authHeaders(),
      ...(init?.headers || {})
    }
  });

  if (!response.ok) {
    const payload = await response.json().catch(() => null);
    throw new Error(payload?.error || `Request failed with status ${response.status}`);
  }

  return response.json() as Promise<T>;
}

export interface TimelineEvent {
  date: string;
  title: string;
  description: string;
  opco: string;
}

export interface Contact {
  name: string;
  title: string;
  linkedinUrl: string;
  relevance: string;
  avatarUrl?: string;
}

export interface KeywordInsight {
  term: string;
  summary: string;
  sourceUrl: string;
}

export interface NewsResponse {
  text: string;
  contacts: Contact[];
  keywords: KeywordInsight[];
  groundingChunks: any[];
}

export async function fetchTimeline(opcos: string[], functions: string[], year?: number | null): Promise<TimelineEvent[]> {
  return request<TimelineEvent[]>('/api/ai/timeline', {
    method: 'POST',
    body: JSON.stringify({ opcos, functions, year })
  });
}

export async function fetchPlanOfAttack(reportText: string, userProfile: string): Promise<string> {
  const response = await request<{ text: string }>('/api/ai/plan', {
    method: 'POST',
    body: JSON.stringify({ reportText, userProfile })
  });

  return response.text;
}

export async function fetchFocusSummary(input: {
  companyName?: string | null;
  opcos: string[];
  functions: string[];
  selectedYear?: number | null;
  userProfile?: string;
  lastUserPrompt?: string;
  lastAssistantSummary?: string;
}): Promise<string> {
  const response = await request<{ text: string }>('/api/ai/focus-summary', {
    method: 'POST',
    body: JSON.stringify(input)
  });

  return response.text;
}

export async function fetchNews(
  opcos: string[],
  functions: string[],
  userQuery?: string,
  fileContext?: string,
  userProfile?: string
): Promise<NewsResponse> {
  return request<NewsResponse>('/api/ai/news', {
    method: 'POST',
    body: JSON.stringify({ opcos, functions, userQuery, fileContext, userProfile })
  });
}

export { SESSION_TOKEN_KEY };
