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

export type DocketWatchEventsResponse = {
  subscription: DocketWatchSubscription | null;
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

export async function fetchDocketWatchEvents(): Promise<DocketWatchEventsResponse> {
  return requestWithSession('/api/dockets/events', {
    method: 'GET'
  });
}

export async function runDocketWatchSync(): Promise<DocketWatchSyncResponse> {
  return requestWithSession('/api/dockets/sync', {
    method: 'POST'
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
