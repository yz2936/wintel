import { createHash } from 'node:crypto';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

type AuthenticatedUser = {
  id: string;
  email?: string | null;
  user_metadata?: Record<string, unknown> | null;
};

type WatchSubscriptionRow = {
  id: string;
  user_id: string;
  recipient_email: string;
  frequency: 'weekly';
  is_active: boolean;
  last_sent_at: string | null;
  docket_watch_targets: WatchTargetRow[];
};

type WatchTargetRow = {
  id: string;
  subscription_id: string;
  source_key: string;
  state: string;
  account_name: string;
  utility_type: string;
  display_name: string;
  provider: string;
  source_url: string;
  extractor_type: ExtractorType;
  match_terms: string[];
  docket_numbers: string[];
  metadata: Record<string, unknown> | null;
  is_active: boolean;
};

type SnapshotRow = {
  snapshot_hash: string;
  summary_text: string;
  payload: Record<string, unknown> | null;
  fetched_at: string;
};

type WatchEventRow = {
  id: string;
  target_id: string;
  subscription_id: string;
  source_event_key: string;
  event_type: string;
  title: string;
  summary: string;
  source_url: string;
  event_date: string;
  payload: Record<string, unknown> | null;
  created_at: string;
};

type ExtractorType = 'ny_case_filings' | 'ma_account_listing' | 'page_text_change';

type TargetSeed = {
  sourceKey: string;
  state: 'NY' | 'MA';
  accountName: 'National Grid' | 'Eversource';
  utilityType: 'gas' | 'electric';
  displayName: string;
  provider: string;
  sourceUrl: string;
  extractorType: ExtractorType;
  matchTerms: string[];
  docketNumbers: string[];
  metadata?: Record<string, unknown>;
};

type ParsedSource = {
  snapshotHash: string;
  summaryText: string;
  payload: Record<string, unknown>;
};

type GeneratedEvent = {
  sourceEventKey: string;
  eventType: string;
  title: string;
  summary: string;
  eventDate: string;
  payload: Record<string, unknown>;
};

type SyncResult = {
  scannedTargets: number;
  createdEvents: number;
  sentEmails: number;
  skippedEmails: number;
  warnings: string[];
};

const DEFAULT_TARGETS: readonly TargetSeed[] = [
  {
    sourceKey: 'ny-national-grid-electric-24-e-0322',
    state: 'NY',
    accountName: 'National Grid',
    utilityType: 'electric',
    displayName: 'NY National Grid Electric Rate Case 24-E-0322',
    provider: 'New York Department of Public Service',
    sourceUrl: 'https://documents.dps.ny.gov/public/MatterManagement/CaseMaster.aspx?MatterCaseNo=24-E-0322&CaseSearch=Search',
    extractorType: 'ny_case_filings',
    matchTerms: ['Niagara Mohawk Power Corporation', 'National Grid', '24-E-0322'],
    docketNumbers: ['24-E-0322']
  },
  {
    sourceKey: 'ny-national-grid-gas-24-g-0323',
    state: 'NY',
    accountName: 'National Grid',
    utilityType: 'gas',
    displayName: 'NY National Grid Gas Rate Case 24-G-0323',
    provider: 'New York Department of Public Service',
    sourceUrl: 'https://documents.dps.ny.gov/public/MatterManagement/CaseMaster.aspx?MatterCaseNo=24-G-0323&CaseSearch=Search',
    extractorType: 'ny_case_filings',
    matchTerms: ['Niagara Mohawk Power Corporation', 'National Grid', '24-G-0323'],
    docketNumbers: ['24-G-0323']
  },
  {
    sourceKey: 'ny-national-grid-kedny-23-g-0225',
    state: 'NY',
    accountName: 'National Grid',
    utilityType: 'gas',
    displayName: 'NY National Grid KEDNY Gas Rate Case 23-G-0225',
    provider: 'New York Department of Public Service',
    sourceUrl: 'https://documents.dps.ny.gov/public/MatterManagement/CaseMaster.aspx?MatterCaseNo=23-G-0225&CaseSearch=Search',
    extractorType: 'ny_case_filings',
    matchTerms: ['The Brooklyn Union Gas Company', 'National Grid', '23-G-0225'],
    docketNumbers: ['23-G-0225']
  },
  {
    sourceKey: 'ny-national-grid-kedli-23-g-0226',
    state: 'NY',
    accountName: 'National Grid',
    utilityType: 'gas',
    displayName: 'NY National Grid KEDLI Gas Rate Case 23-G-0226',
    provider: 'New York Department of Public Service',
    sourceUrl: 'https://documents.dps.ny.gov/public/MatterManagement/CaseMaster.aspx?MatterCaseNo=23-G-0226&CaseSearch=Search',
    extractorType: 'ny_case_filings',
    matchTerms: ['KeySpan Gas East Corporation', 'National Grid', '23-G-0226'],
    docketNumbers: ['23-G-0226']
  },
  {
    sourceKey: 'ma-rate-cases-electric-national-grid',
    state: 'MA',
    accountName: 'National Grid',
    utilityType: 'electric',
    displayName: 'MA DPU Electric Rate Cases - National Grid',
    provider: 'Massachusetts Department of Public Utilities',
    sourceUrl: 'https://www.mass.gov/info-details/rate-cases-electric-companies',
    extractorType: 'ma_account_listing',
    matchTerms: ['National Grid'],
    docketNumbers: [],
    metadata: {
      accountPatterns: ['National Grid']
    }
  },
  {
    sourceKey: 'ma-rate-cases-electric-eversource',
    state: 'MA',
    accountName: 'Eversource',
    utilityType: 'electric',
    displayName: 'MA DPU Electric Rate Cases - Eversource',
    provider: 'Massachusetts Department of Public Utilities',
    sourceUrl: 'https://www.mass.gov/info-details/rate-cases-electric-companies',
    extractorType: 'ma_account_listing',
    matchTerms: ['Eversource', 'NSTAR Electric', 'Western Massachusetts Electric Company'],
    docketNumbers: [],
    metadata: {
      accountPatterns: ['NSTAR Electric', 'Western Massachusetts Electric Company', 'Eversource']
    }
  },
  {
    sourceKey: 'ma-rate-cases-gas-national-grid',
    state: 'MA',
    accountName: 'National Grid',
    utilityType: 'gas',
    displayName: 'MA DPU Gas Rate Cases - National Grid',
    provider: 'Massachusetts Department of Public Utilities',
    sourceUrl: 'https://www.mass.gov/info-details/rate-cases-natural-gas-companies',
    extractorType: 'ma_account_listing',
    matchTerms: ['National Grid', 'Boston Gas Company', 'Colonial Gas Company'],
    docketNumbers: [],
    metadata: {
      accountPatterns: ['Boston Gas Company', 'Colonial Gas Company', 'National Grid']
    }
  },
  {
    sourceKey: 'ma-rate-cases-gas-eversource',
    state: 'MA',
    accountName: 'Eversource',
    utilityType: 'gas',
    displayName: 'MA DPU Gas Rate Cases - Eversource',
    provider: 'Massachusetts Department of Public Utilities',
    sourceUrl: 'https://www.mass.gov/info-details/rate-cases-natural-gas-companies',
    extractorType: 'ma_account_listing',
    matchTerms: ['Eversource', 'NSTAR Gas Company', 'Eversource Gas Company of Massachusetts'],
    docketNumbers: [],
    metadata: {
      accountPatterns: ['Eversource Gas Company of Massachusetts', 'NSTAR Gas Company', 'Eversource']
    }
  },
  {
    sourceKey: 'ma-national-grid-gas-dpu-26-50',
    state: 'MA',
    accountName: 'National Grid',
    utilityType: 'gas',
    displayName: 'MA National Grid Gas Base Distribution Rates DPU 26-50',
    provider: 'Massachusetts Department of Public Utilities',
    sourceUrl: 'https://www.mass.gov/event/public-hearing-for-national-grid-base-distribution-rates-dpu-26-50-03-18-2026',
    extractorType: 'page_text_change',
    matchTerms: ['National Grid', 'DPU 26-50', 'base distribution rates'],
    docketNumbers: ['26-50'],
    metadata: {
      optional: true
    }
  }
];

let adminClient: SupabaseClient | null = null;

export async function requireUser(headers?: Record<string, string | string[] | undefined>) {
  const token = getBearerToken(headers?.authorization);
  if (!token) {
    throw new Error('UNAUTHORIZED');
  }

  const { supabaseUrl, authApiKey } = getServerConfig();
  const response = await fetch(`${supabaseUrl}/auth/v1/user`, {
    headers: {
      Authorization: `Bearer ${token}`,
      apikey: authApiKey
    }
  });

  if (response.status === 401 || response.status === 403) {
    throw new Error('UNAUTHORIZED');
  }

  if (!response.ok) {
    throw new Error(`Supabase auth lookup failed (${response.status}): ${await response.text()}`);
  }

  const user = await response.json();
  if (!user?.id) {
    throw new Error('UNAUTHORIZED');
  }

  return user as AuthenticatedUser;
}

export async function bootstrapDefaultWatchlist(user: AuthenticatedUser) {
  if (!user.email) {
    throw new Error('Authenticated user email is required to create docket notifications.');
  }

  const admin = getAdminClient();
  const now = new Date().toISOString();
  const subscriptionPayload = {
    user_id: user.id,
    recipient_email: user.email,
    frequency: 'weekly',
    is_active: true,
    updated_at: now
  };

  const upsertSubscription = await admin
    .from('docket_watch_subscriptions')
    .upsert(subscriptionPayload, { onConflict: 'user_id' })
    .select('id, recipient_email, frequency, is_active')
    .single();

  if (upsertSubscription.error || !upsertSubscription.data) {
    throw new Error(upsertSubscription.error?.message || 'Failed to create docket watch subscription.');
  }

  const subscriptionId = upsertSubscription.data.id;
  const targets = DEFAULT_TARGETS.map((target) => ({
    subscription_id: subscriptionId,
    source_key: target.sourceKey,
    state: target.state,
    account_name: target.accountName,
    utility_type: target.utilityType,
    display_name: target.displayName,
    provider: target.provider,
    source_url: target.sourceUrl,
    extractor_type: target.extractorType,
    match_terms: target.matchTerms,
    docket_numbers: target.docketNumbers,
    metadata: target.metadata || {},
    is_active: true,
    updated_at: now
  }));

  const upsertTargets = await admin
    .from('docket_watch_targets')
    .upsert(targets, { onConflict: 'subscription_id,source_key' })
    .select('id');

  if (upsertTargets.error) {
    throw new Error(upsertTargets.error.message);
  }

  return {
    recipientEmail: upsertSubscription.data.recipient_email,
    frequency: upsertSubscription.data.frequency,
    targetCount: targets.length,
    notes: [
      'National Grid is monitored in New York and Massachusetts.',
      'Eversource is monitored in Massachusetts. No New York Eversource utility docket footprint is seeded in this v1.'
    ]
  };
}

export async function listRecentEventsForUser(userId: string) {
  const admin = getAdminClient();
  const subscription = await admin
    .from('docket_watch_subscriptions')
    .select('id, recipient_email, frequency, is_active')
    .eq('user_id', userId)
    .maybeSingle();

  if (subscription.error) {
    throw new Error(subscription.error.message);
  }

  if (!subscription.data?.id) {
    return {
      subscription: null,
      events: [] as WatchEventRow[]
    };
  }

  const events = await admin
    .from('docket_watch_events')
    .select('id, target_id, subscription_id, source_event_key, event_type, title, summary, source_url, event_date, payload, created_at')
    .eq('subscription_id', subscription.data.id)
    .order('event_date', { ascending: false })
    .limit(25);

  if (events.error) {
    throw new Error(events.error.message);
  }

  return {
    subscription: subscription.data,
    events: (events.data ?? []) as WatchEventRow[]
  };
}

export async function syncDocketWatches(options?: { forceSend?: boolean }) {
  const admin = getAdminClient();
  const warnings: string[] = [];
  const subscriptions = await admin
    .from('docket_watch_subscriptions')
    .select(`
      id,
      user_id,
      recipient_email,
      frequency,
      is_active,
      last_sent_at,
      docket_watch_targets (
        id,
        subscription_id,
        source_key,
        state,
        account_name,
        utility_type,
        display_name,
        provider,
        source_url,
        extractor_type,
        match_terms,
        docket_numbers,
        metadata,
        is_active
      )
    `)
    .eq('is_active', true);

  if (subscriptions.error) {
    throw new Error(subscriptions.error.message);
  }

  let scannedTargets = 0;
  let createdEvents = 0;
  let sentEmails = 0;
  let skippedEmails = 0;

  for (const subscription of (subscriptions.data ?? []) as WatchSubscriptionRow[]) {
    const createdForSubscription: WatchEventRow[] = [];

    for (const target of subscription.docket_watch_targets.filter((item) => item.is_active)) {
      scannedTargets += 1;
      try {
        const event = await syncSingleTarget(admin, subscription, target);
        if (event) {
          createdEvents += 1;
          createdForSubscription.push(event);
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : `Unknown sync failure for ${target.source_key}`;
        warnings.push(`Target ${target.source_key} failed: ${message}`);
      }
    }

    if (createdForSubscription.length === 0) {
      continue;
    }

    const shouldSendNow = options?.forceSend || isWeeklyDigestDue(subscription.last_sent_at);
    if (!shouldSendNow) {
      skippedEmails += 1;
      continue;
    }

    const emailResult = await sendWeeklyDigestEmail(subscription, createdForSubscription);
    if (emailResult.sent) {
      sentEmails += 1;
      const update = await admin
        .from('docket_watch_subscriptions')
        .update({ last_sent_at: new Date().toISOString(), updated_at: new Date().toISOString() })
        .eq('id', subscription.id);

      if (update.error) {
        warnings.push(`Failed to update last_sent_at for subscription ${subscription.id}: ${update.error.message}`);
      }

      const delivery = await admin
        .from('docket_watch_deliveries')
        .insert({
          subscription_id: subscription.id,
          event_ids: createdForSubscription.map((event) => event.id),
          status: 'sent',
          provider: emailResult.provider,
          provider_message_id: emailResult.messageId || null,
          sent_at: new Date().toISOString()
        });

      if (delivery.error) {
        warnings.push(`Failed to record email delivery for ${subscription.id}: ${delivery.error.message}`);
      }
    } else {
      skippedEmails += 1;
      warnings.push(emailResult.reason);
      const delivery = await admin
        .from('docket_watch_deliveries')
        .insert({
          subscription_id: subscription.id,
          event_ids: createdForSubscription.map((event) => event.id),
          status: 'skipped',
          provider: emailResult.provider,
          error_message: emailResult.reason,
          sent_at: new Date().toISOString()
        });

      if (delivery.error) {
        warnings.push(`Failed to record skipped email for ${subscription.id}: ${delivery.error.message}`);
      }
    }
  }

  return {
    scannedTargets,
    createdEvents,
    sentEmails,
    skippedEmails,
    warnings
  } satisfies SyncResult;
}

async function syncSingleTarget(admin: SupabaseClient, subscription: WatchSubscriptionRow, target: WatchTargetRow) {
  const html = await fetchHtml(target.source_url);
  const parsed = parseSource(target, html);
  const previous = await admin
    .from('docket_watch_snapshots')
    .select('snapshot_hash, summary_text, payload, fetched_at')
    .eq('target_id', target.id)
    .order('fetched_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (previous.error) {
    throw new Error(previous.error.message);
  }

  if (!previous.data) {
    const inserted = await admin
      .from('docket_watch_snapshots')
      .insert({
        target_id: target.id,
        snapshot_hash: parsed.snapshotHash,
        summary_text: parsed.summaryText,
        payload: parsed.payload,
        fetched_at: new Date().toISOString()
      });

    if (inserted.error) {
      throw new Error(inserted.error.message);
    }

    return null;
  }

  if (previous.data.snapshot_hash === parsed.snapshotHash) {
    return null;
  }

  const generated = buildEventFromDiff(target, previous.data as SnapshotRow, parsed);
  const snapshotInsert = await admin
    .from('docket_watch_snapshots')
    .insert({
      target_id: target.id,
      snapshot_hash: parsed.snapshotHash,
      summary_text: parsed.summaryText,
      payload: parsed.payload,
      fetched_at: new Date().toISOString()
    });

  if (snapshotInsert.error) {
    throw new Error(snapshotInsert.error.message);
  }

  if (!generated) {
    return null;
  }

  const insertedEvent = await admin
    .from('docket_watch_events')
    .upsert({
      subscription_id: subscription.id,
      target_id: target.id,
      source_event_key: generated.sourceEventKey,
      event_type: generated.eventType,
      title: generated.title,
      summary: generated.summary,
      source_url: target.source_url,
      event_date: generated.eventDate,
      payload: generated.payload
    }, { onConflict: 'source_event_key' })
    .select('id, target_id, subscription_id, source_event_key, event_type, title, summary, source_url, event_date, payload, created_at')
    .single();

  if (insertedEvent.error || !insertedEvent.data) {
    throw new Error(insertedEvent.error?.message || `Failed to write docket event for ${target.source_key}.`);
  }

  return insertedEvent.data as WatchEventRow;
}

function parseSource(target: WatchTargetRow, html: string): ParsedSource {
  switch (target.extractor_type) {
    case 'ny_case_filings':
      return parseNyCaseFilings(target, html);
    case 'ma_account_listing':
      return parseMassachusettsListing(target, html);
    case 'page_text_change':
      return parsePageTextChange(target, html);
    default:
      return parsePageTextChange(target, html);
  }
}

function parseNyCaseFilings(target: WatchTargetRow, html: string): ParsedSource {
  const text = normalizeText(htmlToText(html));
  const filedDocuments = extractFirstNumber(text, /Filed Documents\s*\((\d+)\)/i);
  const publicComments = extractFirstNumber(text, /Public Comments\s*\((\d+)\)/i);
  const matterNumber = extractFirstMatch(text, /Matter Master:\s*([\d-]+\/[\dA-Z-]+)/i);
  const caseNumber = extractFirstMatch(text, /Case Number:\s*([0-9A-Z-]+)/i) || target.docket_numbers[0] || '';
  const title = extractFirstMatch(
    text,
    /Title of Matter\/Case:\s*([\s\S]*?)(?:Related Matter\/Case No:|Assigned Judge:|Filed Documents)/i
  ) || target.display_name;
  const payload = {
    filedDocuments,
    publicComments,
    matterNumber,
    caseNumber,
    title: cleanTitle(title)
  };

  return {
    snapshotHash: stableHash(JSON.stringify(payload)),
    summaryText: `${payload.title}. Filed documents: ${filedDocuments}. Public comments: ${publicComments}.`,
    payload
  };
}

function parseMassachusettsListing(target: WatchTargetRow, html: string): ParsedSource {
  const text = normalizeText(htmlToText(html));
  const accountPatterns = Array.isArray(target.metadata?.accountPatterns)
    ? target.metadata.accountPatterns.filter((value): value is string => typeof value === 'string')
    : target.match_terms;
  const snippets = accountPatterns
    .map((pattern) => extractSnippet(text, pattern))
    .filter((snippet): snippet is string => Boolean(snippet));
  const snippet = snippets[0] || text.slice(0, 600);
  const docketNumbers = Array.from(new Set((snippet.match(/\b\d{2}-\d+\b/g) || []).map((value) => value.trim()))).sort();
  const hasPendingCase = /\bPending Cases\b/i.test(text) && accountPatterns.some((pattern) => snippet.toLowerCase().includes(pattern.toLowerCase()));
  const lastUpdated = extractFirstMatch(text, /Last updated:\s*([A-Za-z]+\s+\d{1,2},\s+\d{4})/i) || '';
  const payload = {
    accountPatterns,
    snippet,
    docketNumbers,
    hasPendingCase,
    lastUpdated
  };

  return {
    snapshotHash: stableHash(JSON.stringify(payload)),
    summaryText: `${target.display_name}. Docket references: ${docketNumbers.join(', ') || 'none detected'}.`,
    payload
  };
}

function parsePageTextChange(target: WatchTargetRow, html: string): ParsedSource {
  const text = normalizeText(htmlToText(html));
  const docketNumbers = Array.from(new Set((text.match(/\b\d{2}-\d+\b/g) || []).map((value) => value.trim()))).sort();
  const title = extractFirstMatch(text, /^(.{0,180}?)(?:Overview|Address|Directions|Additional Resources)/i) || target.display_name;
  const updated = extractFirstMatch(text, /Last updated:\s*([A-Za-z]+\s+\d{1,2},\s+\d{4})/i) || '';
  const snippet = text.slice(0, 800);
  const payload = {
    title: cleanTitle(title),
    docketNumbers,
    updated,
    snippet
  };

  return {
    snapshotHash: stableHash(JSON.stringify(payload)),
    summaryText: `${payload.title}. Docket references: ${docketNumbers.join(', ') || 'none detected'}.`,
    payload
  };
}

function buildEventFromDiff(target: WatchTargetRow, previous: SnapshotRow, next: ParsedSource): GeneratedEvent | null {
  const previousPayload = previous.payload || {};

  if (target.extractor_type === 'ny_case_filings') {
    const previousCount = getNumber(previousPayload.filedDocuments);
    const nextCount = getNumber(next.payload.filedDocuments);
    const previousComments = getNumber(previousPayload.publicComments);
    const nextComments = getNumber(next.payload.publicComments);
    const caseNumber = String(next.payload.caseNumber || target.docket_numbers[0] || target.display_name);

    if (nextCount > previousCount) {
      return {
        sourceEventKey: `${target.source_key}:filed-documents:${nextCount}`,
        eventType: 'rate_case_filing_change',
        title: `${target.account_name} ${target.utility_type} docket ${caseNumber} added ${nextCount - previousCount} filing${nextCount - previousCount === 1 ? '' : 's'}`,
        summary: `${target.display_name} moved from ${previousCount} to ${nextCount} filed documents on the official ${target.provider} case page. This is the clearest signal that the docket had fresh activity in the latest monitoring window.`,
        eventDate: new Date().toISOString(),
        payload: {
          previousFiledDocuments: previousCount,
          currentFiledDocuments: nextCount,
          previousPublicComments: previousComments,
          currentPublicComments: nextComments,
          caseNumber,
          title: next.payload.title
        }
      };
    }

    if (nextComments > previousComments) {
      return {
        sourceEventKey: `${target.source_key}:public-comments:${nextComments}`,
        eventType: 'rate_case_comment_change',
        title: `${target.account_name} docket ${caseNumber} received new public comment activity`,
        summary: `${target.display_name} moved from ${previousComments} to ${nextComments} public comments on the official ${target.provider} case page.`,
        eventDate: new Date().toISOString(),
        payload: {
          previousPublicComments: previousComments,
          currentPublicComments: nextComments,
          caseNumber,
          title: next.payload.title
        }
      };
    }

    return null;
  }

  if (target.extractor_type === 'ma_account_listing') {
    const previousDockets = toStringArray(previousPayload.docketNumbers);
    const nextDockets = toStringArray(next.payload.docketNumbers);
    const newDockets = nextDockets.filter((value) => !previousDockets.includes(value));

    if (newDockets.length > 0) {
      return {
        sourceEventKey: `${target.source_key}:new-dockets:${newDockets.join(',')}`,
        eventType: 'rate_case_filing_change',
        title: `${target.account_name} ${target.utility_type} docket listing changed in Massachusetts`,
        summary: `${target.display_name} now references new docket number${newDockets.length === 1 ? '' : 's'} ${newDockets.join(', ')} on the official ${target.provider} listing page.`,
        eventDate: new Date().toISOString(),
        payload: {
          previousDockets,
          currentDockets: nextDockets,
          snippet: next.payload.snippet
        }
      };
    }

    if (String(previous.summary_text || '') !== next.summaryText) {
      return {
        sourceEventKey: `${target.source_key}:page-refresh:${next.snapshotHash}`,
        eventType: 'rate_case_page_update',
        title: `${target.account_name} ${target.utility_type} rate case listing updated in Massachusetts`,
        summary: `${target.display_name} changed on the official ${target.provider} listing page. Review the updated listing for new status language or refreshed references.`,
        eventDate: new Date().toISOString(),
        payload: {
          previousDockets,
          currentDockets: nextDockets,
          snippet: next.payload.snippet
        }
      };
    }

    return null;
  }

  return {
    sourceEventKey: `${target.source_key}:page-update:${next.snapshotHash}`,
    eventType: 'rate_case_page_update',
    title: `${target.display_name} was updated`,
    summary: `${target.display_name} changed on the official ${target.provider} page, which suggests new docket activity, hearing logistics, or updated procedural guidance.`,
    eventDate: new Date().toISOString(),
    payload: next.payload
  };
}

async function sendWeeklyDigestEmail(subscription: WatchSubscriptionRow, events: WatchEventRow[]) {
  const resendApiKey = process.env.RESEND_API_KEY || '';
  const fromEmail = process.env.DOCKET_ALERT_FROM_EMAIL || '';

  if (!resendApiKey || !fromEmail) {
    return {
      sent: false,
      provider: 'resend',
      reason: 'Skipping docket alert email because RESEND_API_KEY or DOCKET_ALERT_FROM_EMAIL is not set.'
    } as const;
  }

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${resendApiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      from: fromEmail,
      to: [subscription.recipient_email],
      subject: buildDigestSubject(events),
      html: buildDigestHtml(events),
      reply_to: process.env.DOCKET_ALERT_REPLY_TO_EMAIL || undefined
    })
  });

  if (!response.ok) {
    return {
      sent: false,
      provider: 'resend',
      reason: `Resend email failed (${response.status}): ${await response.text()}`
    } as const;
  }

  const payload = await response.json().catch(() => null);
  return {
    sent: true,
    provider: 'resend',
    messageId: typeof payload?.id === 'string' ? payload.id : null
  } as const;
}

function buildDigestSubject(events: WatchEventRow[]) {
  if (events.length === 1) {
    return `Wintel docket alert: ${events[0].title}`;
  }

  return `Wintel weekly docket digest: ${events.length} new filing updates`;
}

function buildDigestHtml(events: WatchEventRow[]) {
  const items = events
    .sort((a, b) => new Date(b.event_date).getTime() - new Date(a.event_date).getTime())
    .map((event) => `
      <tr>
        <td style="padding:16px 0;border-top:1px solid #e5d9ff;">
          <div style="font-size:12px;color:#7c3aed;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;">${escapeHtml(event.event_type.replace(/_/g, ' '))}</div>
          <div style="margin-top:6px;font-size:18px;line-height:1.4;font-weight:700;color:#1f1147;">${escapeHtml(event.title)}</div>
          <div style="margin-top:8px;font-size:14px;line-height:1.6;color:#43366a;">${escapeHtml(event.summary)}</div>
          <div style="margin-top:10px;"><a href="${escapeAttribute(event.source_url)}" style="color:#a100ff;font-weight:700;text-decoration:none;">Open official source</a></div>
        </td>
      </tr>
    `)
    .join('');

  return `
    <div style="background:#f5f1ff;padding:32px;font-family:Inter,Segoe UI,Arial,sans-serif;">
      <div style="max-width:720px;margin:0 auto;background:#ffffff;border:1px solid #e7dbff;border-radius:20px;overflow:hidden;">
        <div style="padding:28px 32px;background:linear-gradient(135deg,#21045d 0%,#3d167f 100%);color:#ffffff;">
          <div style="font-size:12px;font-weight:800;letter-spacing:0.18em;text-transform:uppercase;color:#ff47d7;">Wintel Docket Watch</div>
          <h1 style="margin:12px 0 0;font-size:30px;line-height:1.2;">Weekly rate case filing digest</h1>
          <p style="margin:10px 0 0;font-size:15px;line-height:1.6;color:#ded2ff;">Official NY and MA sources for National Grid and Eversource docket activity.</p>
        </div>
        <div style="padding:12px 32px 28px;">
          <table role="presentation" style="width:100%;border-collapse:collapse;">${items}</table>
        </div>
      </div>
    </div>
  `;
}

function isWeeklyDigestDue(lastSentAt: string | null) {
  if (!lastSentAt) {
    return true;
  }

  const diffMs = Date.now() - new Date(lastSentAt).getTime();
  return diffMs >= 6.5 * 24 * 60 * 60 * 1000;
}

function getAdminClient() {
  if (adminClient) {
    return adminClient;
  }

  const { supabaseUrl, serviceRoleKey } = getServerConfig();
  adminClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });
  return adminClient;
}

function getServerConfig() {
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
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

  if (!supabaseUrl) {
    throw new Error('Missing SUPABASE_URL for docket monitoring.');
  }

  if (!serviceRoleKey) {
    throw new Error('Missing SUPABASE_SERVICE_ROLE_KEY for docket monitoring.');
  }

  return {
    supabaseUrl,
    authApiKey: serviceRoleKey || supabaseAnonKey,
    serviceRoleKey
  };
}

async function fetchHtml(url: string) {
  const response = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (compatible; WintelDocketMonitor/1.0; +https://wintel-five.vercel.app)',
      Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.9',
      Referer: 'https://www.google.com/'
    }
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch ${url} (${response.status})`);
  }

  return response.text();
}

function getBearerToken(authorization?: string | string[]) {
  if (!authorization) {
    return '';
  }

  const header = Array.isArray(authorization) ? authorization[0] : authorization;
  const match = header.match(/^Bearer\s+(.+)$/i);
  return match?.[1]?.trim() || '';
}

function htmlToText(html: string) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<\/(p|div|section|article|li|tr|h1|h2|h3|h4|h5|h6)>/gi, '\n')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, '\'')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>');
}

function normalizeText(text: string) {
  return text
    .replace(/\r/g, '\n')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{2,}/g, '\n')
    .replace(/[^\S\n]+/g, ' ')
    .trim();
}

function extractFirstNumber(text: string, pattern: RegExp) {
  const match = text.match(pattern);
  return match ? Number.parseInt(match[1], 10) : 0;
}

function extractFirstMatch(text: string, pattern: RegExp) {
  const match = text.match(pattern);
  return match?.[1]?.trim() || '';
}

function extractSnippet(text: string, pattern: string) {
  const index = text.toLowerCase().indexOf(pattern.toLowerCase());
  if (index < 0) {
    return '';
  }

  const start = Math.max(0, index - 80);
  const end = Math.min(text.length, index + 420);
  return text.slice(start, end).trim();
}

function cleanTitle(input: string) {
  return input.replace(/\s+/g, ' ').trim();
}

function stableHash(value: string) {
  return createHash('sha256').update(value).digest('hex');
}

function getNumber(value: unknown) {
  return typeof value === 'number' ? value : Number.parseInt(String(value || '0'), 10) || 0;
}

function toStringArray(value: unknown) {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : [];
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function escapeAttribute(value: string) {
  return escapeHtml(value);
}
