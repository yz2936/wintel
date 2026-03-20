import { format } from 'date-fns';
import { AlertCircle, BellRing, ExternalLink, Loader2, RadioTower, RefreshCw, Send, X } from 'lucide-react';
import { useState } from 'react';
import type { DocketWatchEvent, DocketWatchSubscription, DocketWatchTarget, UtilityFilter } from '../services/dockets';

type DocketChatMessage = {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
};

function getDocketDocuments(payload: Record<string, unknown> | null) {
  const documents = payload?.documents;
  if (!Array.isArray(documents)) {
    return [];
  }

  return documents
    .map((document) => {
      if (!document || typeof document !== 'object') {
        return null;
      }

      const entry = document as Record<string, unknown>;
      return {
        title: typeof entry.title === 'string' ? entry.title : 'Untitled docket document',
        filedDate: typeof entry.filedDate === 'string' ? entry.filedDate : '',
        documentType: typeof entry.documentType === 'string' ? entry.documentType : '',
        filingOnBehalfOf: typeof entry.filingOnBehalfOf === 'string' ? entry.filingOnBehalfOf : '',
        officialUrl: typeof entry.officialUrl === 'string' ? entry.officialUrl : '',
        summary: typeof entry.summary === 'string' ? entry.summary : '',
        keyTopics: Array.isArray(entry.keyTopics) ? entry.keyTopics.filter((item): item is string => typeof item === 'string') : [],
        stakeholders: Array.isArray(entry.stakeholders) ? entry.stakeholders.filter((item): item is string => typeof item === 'string') : [],
        accountPlanningAngle: typeof entry.accountPlanningAngle === 'string' ? entry.accountPlanningAngle : ''
      };
    })
    .filter((document): document is NonNullable<typeof document> => Boolean(document));
}

function toBulletPoints(text: string | null | undefined) {
  if (!text) {
    return [];
  }

  const normalized = text
    .split('\n')
    .map((line) => line.replace(/^[-*•]\s*/, '').trim())
    .filter(Boolean);

  if (normalized.length > 1) {
    return normalized;
  }

  return text
    .split(/(?<=\.)\s+(?=[A-Z0-9-])/)
    .map((line) => line.replace(/^[-*•]\s*/, '').trim())
    .filter(Boolean)
    .slice(0, 3);
}

interface DocketWorkspaceProps {
  selectedState: 'NY' | 'MA';
  onSelectState: (state: 'NY' | 'MA') => void;
  selectedUtilityType: UtilityFilter;
  onSelectUtilityType: (utilityType: UtilityFilter) => void;
  subscription: DocketWatchSubscription | null;
  targets: DocketWatchTarget[];
  events: DocketWatchEvent[];
  loading: boolean;
  syncing: boolean;
  status: string;
  error: string | null;
  onSync: () => Promise<void>;
  onAsk: (query: string) => Promise<void>;
  askLoading: boolean;
  askError: string | null;
  chatMessages: DocketChatMessage[];
}

export function DocketWorkspace({
  selectedState,
  onSelectState,
  selectedUtilityType,
  onSelectUtilityType,
  subscription,
  targets,
  events,
  loading,
  syncing,
  status,
  error,
  onSync,
  onAsk,
  askLoading,
  askError,
  chatMessages
}: DocketWorkspaceProps) {
  const [input, setInput] = useState('');
  const [isAgentOpen, setIsAgentOpen] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!input.trim()) {
      return;
    }

    const query = input.trim();
    setInput('');
    await onAsk(query);
  };

  return (
    <div className="space-y-5">
      <div className="rounded-3xl border border-neutral-200 bg-white p-6 shadow-[0_28px_90px_rgba(11,0,78,0.08)]">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-3xl">
            <div className="flex items-center gap-2 text-brand-magenta">
              <BellRing className="h-4 w-4" />
              <span className="text-[10px] font-bold uppercase tracking-[0.22em]">Docket Watch</span>
            </div>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight text-brand-navy">2026 rate case filing monitor</h1>
            <p className="mt-3 text-sm leading-6 text-neutral-600">
              Switch between supported states and gas or electric views to fetch the relevant 2026 rate case filings for that docket set. Use the ask box below if you want older material such as 2025 filings, additional docket context, or a deeper account-planning readout.
            </p>
            <p className="mt-3 text-sm leading-6 text-neutral-700">
              {loading ? 'Loading watch status...' : status}
            </p>
          </div>
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2 rounded-xl border border-neutral-200 bg-neutral-50 p-1">
              {(['NY', 'MA'] as const).map((state) => (
                <button
                  key={state}
                  type="button"
                  onClick={() => onSelectState(state)}
                  className={`rounded-lg px-3 py-2 text-xs font-semibold transition-colors ${selectedState === state ? 'bg-brand-navy text-white shadow-sm' : 'text-neutral-600 hover:bg-white hover:text-brand-navy'}`}
                >
                  {state === 'NY' ? 'New York' : 'Massachusetts'}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-2 rounded-xl border border-neutral-200 bg-neutral-50 p-1">
              {([
                { value: 'all', label: 'All' },
                { value: 'electric', label: 'Electric' },
                { value: 'gas', label: 'Gas' }
              ] as const).map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => onSelectUtilityType(option.value)}
                  className={`rounded-lg px-3 py-2 text-xs font-semibold transition-colors ${selectedUtilityType === option.value ? 'bg-brand-navy text-white shadow-sm' : 'text-neutral-600 hover:bg-white hover:text-brand-navy'}`}
                >
                  {option.label}
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={() => void onSync()}
              disabled={loading || syncing}
              className="inline-flex h-11 items-center justify-center gap-2 whitespace-nowrap rounded-xl bg-brand-navy px-3 text-xs font-semibold text-white shadow-lg shadow-brand-navy/15 transition-colors hover:bg-brand-navy/90 disabled:cursor-not-allowed disabled:opacity-50 sm:px-4"
            >
              {syncing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
              Check {selectedState} {selectedUtilityType === 'all' ? 'All Utilities' : selectedUtilityType === 'electric' ? 'Electric' : 'Gas'} 2026 Filings
            </button>
            {subscription && (
              <div className="rounded-xl border border-neutral-200 bg-neutral-50 px-3 py-2 text-xs text-neutral-600">
                Weekly alerts to <span className="font-semibold text-brand-navy">{subscription.recipient_email}</span>
              </div>
            )}
          </div>
        </div>

        {error && (
          <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}
      </div>

      <div className="space-y-5">
          <div className="rounded-3xl border border-neutral-200 bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-center gap-2 text-brand-magenta">
              <RadioTower className="h-4 w-4" />
              <span className="text-[10px] font-bold uppercase tracking-[0.22em]">Latest 2026 Rate Case Snapshots</span>
            </div>

            {targets.length === 0 && !error ? (
              <div className="rounded-2xl border border-dashed border-neutral-200 bg-neutral-50/80 px-4 py-4 text-sm leading-6 text-neutral-500">
                No active {selectedState} {selectedUtilityType === 'all' ? '' : `${selectedUtilityType} `}docket targets are available yet.
              </div>
            ) : (
              <div className="grid gap-4">
                {targets.map((target) => (
                  <div key={target.id} className="min-w-0 rounded-2xl border border-neutral-200 bg-[linear-gradient(180deg,#ffffff_0%,#fbf8ff_100%)] px-4 py-4 shadow-sm">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-brand-magenta">
                          {target.state} {target.utility_type}
                        </span>
                        <h3 className="mt-2 break-words text-base font-semibold text-brand-navy">{target.display_name}</h3>
                      </div>
                      <a
                        href={target.source_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex shrink-0 items-center gap-2 rounded-full border border-neutral-200 bg-white px-3 py-1.5 text-[11px] font-semibold text-neutral-500 transition-colors hover:border-brand-magenta/35 hover:text-brand-magenta"
                        title="Open official docket page"
                      >
                        <ExternalLink className="h-3.5 w-3.5" />
                        Source
                      </a>
                    </div>

                    {toBulletPoints(target.summary_text).length > 0 ? (
                      <ul className="mt-3 space-y-2">
                        {toBulletPoints(target.summary_text).map((bullet, index) => (
                          <li key={`${target.id}-summary-${index}`} className="flex gap-2 text-sm leading-6 text-neutral-600">
                            <span className="mt-[7px] h-1.5 w-1.5 flex-shrink-0 rounded-full bg-brand-magenta" />
                            <span className="break-words">{bullet}</span>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="mt-3 break-words text-sm leading-6 text-neutral-600">
                        No 2026 snapshot has been stored yet. Run a docket check to fetch the latest official summary.
                      </p>
                    )}

                    <div className="mt-3 flex flex-wrap gap-2">
                      {target.docket_numbers.map((docketNumber) => (
                        <span
                          key={`${target.id}-${docketNumber}`}
                          className="rounded-full border border-neutral-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-neutral-600"
                        >
                          {docketNumber}
                        </span>
                      ))}
                    </div>

                    {getDocketDocuments(target.latest_payload).length > 0 && (
                      <div className="mt-4 space-y-3 border-t border-neutral-100 pt-4">
                        <div className="flex items-center justify-between gap-3">
                          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-neutral-400">Most Relevant 2026 Rate Case Documents</p>
                          <span className="text-[11px] text-neutral-400">{Math.min(getDocketDocuments(target.latest_payload).length, 5)} shown</span>
                        </div>
                        <div className="overflow-hidden rounded-2xl border border-neutral-200 bg-white">
                          <div className="grid grid-cols-[84px_minmax(0,1.2fr)_minmax(0,0.9fr)_112px] gap-3 border-b border-neutral-200 bg-neutral-50 px-3 py-2 text-[10px] font-bold uppercase tracking-[0.16em] text-neutral-400">
                            <span>Filed</span>
                            <span>Document</span>
                            <span>Stakeholders / Topics</span>
                            <span className="text-right">Action</span>
                          </div>
                          {getDocketDocuments(target.latest_payload).slice(0, 5).map((document, index) => (
                            <div
                              key={`${target.id}-document-${index}`}
                              className="grid grid-cols-[84px_minmax(0,1.2fr)_minmax(0,0.9fr)_112px] gap-3 border-b border-neutral-100 px-3 py-3 last:border-b-0"
                            >
                              <div className="text-[11px] leading-5 text-neutral-500">
                                <div>{document.filedDate || '2026'}</div>
                                <div className="mt-1 rounded-full bg-neutral-50 px-2 py-0.5 text-[10px] font-semibold text-neutral-500">
                                  Doc {index + 1}
                                </div>
                              </div>
                              <div className="min-w-0">
                                <p className="break-words text-sm font-semibold leading-5 text-brand-navy">{document.title}</p>
                                <p className="mt-1 break-words text-[11px] text-neutral-500">
                                  {[document.documentType, document.filingOnBehalfOf].filter(Boolean).join(' | ') || 'Official docket document'}
                                </p>
                                {document.summary && (
                                  <p className="mt-2 break-words text-xs leading-5 text-neutral-600">{document.summary}</p>
                                )}
                              </div>
                              <div className="min-w-0 space-y-2">
                                {document.stakeholders.length > 0 && (
                                  <p className="break-words text-[11px] leading-5 text-neutral-600">
                                    <span className="font-semibold text-brand-navy">Stakeholders:</span> {document.stakeholders.slice(0, 3).join(', ')}
                                  </p>
                                )}
                                {document.keyTopics.length > 0 && (
                                  <div className="flex flex-wrap gap-1.5">
                                    {document.keyTopics.slice(0, 3).map((topic) => (
                                      <span key={`${target.id}-${document.title}-${topic}`} className="rounded-full bg-neutral-50 px-2 py-1 text-[10px] font-semibold text-neutral-600">
                                        {topic}
                                      </span>
                                    ))}
                                  </div>
                                )}
                                {document.accountPlanningAngle && (
                                  <p className="break-words text-[11px] leading-5 text-neutral-600">
                                    <span className="font-semibold text-brand-navy">Angle:</span> {document.accountPlanningAngle}
                                  </p>
                                )}
                              </div>
                              <div className="flex items-start justify-end">
                                {document.officialUrl ? (
                                  <a
                                    href={document.officialUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center justify-center rounded-full border border-neutral-200 bg-neutral-50 px-3 py-1.5 text-[11px] font-semibold text-neutral-600 transition-colors hover:border-brand-magenta/35 hover:text-brand-magenta"
                                  >
                                    View
                                  </a>
                                ) : (
                                  <span className="text-[11px] text-neutral-400">Unavailable</span>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    <p className="mt-3 text-xs text-neutral-400">
                      {target.last_checked_at ? `Last checked ${format(new Date(target.last_checked_at), 'MMM d, yyyy h:mm a')}` : 'Not checked yet'}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {events.length > 0 && (
            <div className="rounded-3xl border border-neutral-200 bg-white p-5 shadow-sm">
              <div className="mb-4 flex items-center gap-2 text-brand-magenta">
                <BellRing className="h-4 w-4" />
                <span className="text-[10px] font-bold uppercase tracking-[0.22em]">Recent Change Events</span>
              </div>
              <div className="space-y-3">
                {events.slice(0, 6).map((event) => (
                  <a
                    key={event.id}
                    href={event.source_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group block rounded-2xl border border-neutral-200 bg-neutral-50/70 px-4 py-3 transition-all hover:border-brand-magenta/35 hover:shadow-md"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-brand-magenta">
                        {event.event_type.replace(/_/g, ' ')}
                      </span>
                      <ExternalLink className="h-3.5 w-3.5 text-neutral-400 transition-colors group-hover:text-brand-magenta" />
                    </div>
                    <h4 className="mt-2 text-sm font-semibold leading-6 text-brand-navy">{event.title}</h4>
                    <p className="mt-2 text-sm leading-6 text-neutral-600">{event.summary}</p>
                    <p className="mt-3 text-xs text-neutral-400">{format(new Date(event.event_date), 'MMM d, yyyy h:mm a')}</p>
                  </a>
                ))}
              </div>
            </div>
          )}
      </div>

      <div className="fixed bottom-4 right-4 z-40 sm:bottom-5 sm:right-5">
        {isAgentOpen ? (
          <div className="flex h-[min(760px,calc(100vh-2rem))] w-[min(460px,calc(100vw-2rem))] flex-col overflow-hidden rounded-3xl border border-neutral-200 bg-white shadow-[0_28px_90px_rgba(11,0,78,0.18)] sm:h-[min(780px,calc(100vh-2.5rem))]">
            <div className="flex items-start justify-between gap-3 border-b border-neutral-200 bg-[linear-gradient(135deg,#ffffff_0%,#fbf8ff_100%)] px-4 py-4 sm:px-5">
              <div className="min-w-0 pr-2">
                <div className="flex items-center gap-2 text-brand-magenta">
                  <BellRing className="h-4 w-4" />
                  <span className="text-[10px] font-bold uppercase tracking-[0.22em]">Ask The Docket Agent</span>
                </div>
                <h2 className="mt-2 break-words text-base font-semibold text-brand-navy sm:text-lg">Need more detail?</h2>
                <p className="mt-1 break-words text-sm leading-6 text-neutral-600">
                  Defaults to 2026 filings. Ask for 2025 only when you want older material.
                  {selectedState === 'MA' ? ' Massachusetts coverage is still in progress and may be lighter than New York.' : ''}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsAgentOpen(false)}
                className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-neutral-200 bg-white text-neutral-500 transition-colors hover:bg-neutral-100"
                title="Close docket agent"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="flex min-h-0 flex-1 flex-col p-4 sm:p-5">
              {chatMessages.length === 0 && (
                <div className="flex flex-wrap gap-2">
                  {[
                    'What are the most important 2026 filings I should care about?',
                    'Which stakeholders matter most across these 2026 filings?',
                    'Show me 2025 filings only for this docket watch'
                  ].map((prompt) => (
                    <button
                      key={prompt}
                      type="button"
                      onClick={() => setInput(prompt)}
                      className="rounded-full border border-neutral-200 bg-neutral-50 px-3 py-1.5 text-xs font-semibold text-neutral-600 transition-colors hover:border-brand-magenta/35 hover:text-brand-magenta"
                    >
                      {prompt}
                    </button>
                  ))}
                </div>
              )}

              <div className="mt-4 min-h-0 flex-1 overflow-y-auto pr-1">
                {chatMessages.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-neutral-200 bg-neutral-50/80 px-4 py-4 text-sm leading-6 text-neutral-500">
                    Ask for more detail on the 2026 rate case filings, or explicitly request 2025 if you want prior-year material included.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {chatMessages.map((message, index) => (
                      <div
                        key={`${message.role}-${index}-${message.timestamp.toISOString()}`}
                        className={message.role === 'user' ? 'flex justify-end' : 'flex justify-start'}
                      >
                        <div className={`${message.role === 'user' ? 'max-w-[90%] rounded-2xl rounded-tr-sm bg-brand-navy px-4 py-3 text-white' : 'w-full rounded-2xl border border-neutral-200 bg-neutral-50 px-4 py-3 text-neutral-700'}`}>
                          <div className="mb-2 text-[10px] font-bold uppercase tracking-[0.18em] opacity-60">
                            {message.role === 'user' ? 'Your Question' : 'Docket Agent'}
                          </div>
                          <div className="whitespace-pre-wrap break-words text-sm leading-6">{message.content}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {askError && (
                <div className="mt-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {askError}
                </div>
              )}

              <form onSubmit={(event) => void handleSubmit(event)} className="mt-3 border-t border-neutral-200 bg-white pt-3">
                <div className="relative">
                  <textarea
                    value={input}
                    onChange={(event) => setInput(event.target.value)}
                    placeholder="Ask for deeper filing analysis. Example: What do the 2026 filings imply for account strategy, and who should I engage first?"
                    className="min-h-[88px] w-full resize-none rounded-2xl border border-neutral-200 bg-neutral-50/80 px-4 py-3 pr-28 text-sm leading-6 text-neutral-800 transition-all placeholder:text-neutral-400 focus:border-brand-magenta/35 focus:outline-none"
                  />
                  <button
                    type="submit"
                    disabled={askLoading || !input.trim()}
                    className="absolute bottom-3 right-3 inline-flex h-10 items-center gap-2 rounded-xl bg-brand-magenta px-4 text-sm font-semibold text-white transition-colors hover:bg-brand-magenta-dark disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {askLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                    Ask
                  </button>
                </div>
                <p className="mt-2 text-xs leading-5 text-neutral-500">
                  Older years stay out unless you ask for them.
                </p>
              </form>
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setIsAgentOpen(true)}
            className="inline-flex h-14 items-center gap-3 rounded-full bg-brand-navy px-5 text-sm font-semibold text-white shadow-[0_18px_45px_rgba(11,0,78,0.25)] transition-transform hover:-translate-y-0.5 hover:bg-brand-navy/92"
          >
            <BellRing className="h-4 w-4" />
            Docket Agent
          </button>
        )}
      </div>
    </div>
  );
}
