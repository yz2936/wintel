import { getSupabase } from './supabase';

export type DocketWatchSubscription = {
  id: string;
  recipient_email: string;
  frequency: string;
  is_active: boolean;
};

export type DocketWatchEvent = {
  id: string;
  title: string;
  summary: string;
  source_url: string;
  event_type: string;
  event_date: string;
  payload?: Record<string, unknown> | null;
};

export type DocketWatchTarget = {
  id: string;
  source_key: string;
  state: string;
  account_name: string;
  utility_type: string;
  display_name: string;
  provider: string;
  source_url: string;
  summary_text: string | null;
  last_checked_at: string | null;
  docket_numbers: string[];
  latest_payload: Record<string, unknown> | null;
};

export type DocketWatchEventsResponse = {
  subscription: DocketWatchSubscription | null;
  targets: DocketWatchTarget[];
  events: DocketWatchEvent[];
};

export type DocketWatchSyncResponse = {
  ok: boolean;
  scannedTargets: number;
  createdEvents: number;
  sentEmails: number;
  skippedEmails: number;
  warnings: string[];
};

export type DocketAskResponse = {
  text: string;
  scope: string;
};

export type UtilityFilter = 'all' | 'electric' | 'gas';

export async function fetchDocketWatchEvents(state: 'NY' | 'MA', utilityType: UtilityFilter): Promise<DocketWatchEventsResponse> {
  return requestWithSession(`/api/dockets/events?state=${encodeURIComponent(state)}&utilityType=${encodeURIComponent(utilityType)}`, {
    method: 'GET'
  });
}

export async function runDocketWatchSync(state: 'NY' | 'MA', utilityType: UtilityFilter): Promise<DocketWatchSyncResponse> {
  return requestWithSession(`/api/dockets/sync?state=${encodeURIComponent(state)}&utilityType=${encodeURIComponent(utilityType)}`, {
    method: 'POST'
  });
}

export async function askDocketQuestion(question: string, state: 'NY' | 'MA', utilityType: UtilityFilter): Promise<DocketAskResponse> {
  return requestWithSession('/api/dockets/ask', {
    method: 'POST',
    body: JSON.stringify({ question, state, utilityType })
  });
}

async function requestWithSession(path: string, init: RequestInit) {
  const supabase = await getSupabase();
  const { data } = await supabase.auth.getSession();
  const accessToken = data.session?.access_token;

  if (!accessToken) {
    throw new Error('No active session.');
  }

  const response = await fetch(path, {
    ...init,
    headers: {
      ...(init.headers || {}),
      Authorization: `Bearer ${accessToken}`
    }
  });

  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(payload?.error || `Request failed with status ${response.status}`);
  }

  return payload;
}
