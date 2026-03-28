import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { ExternalLink, Link2, Clock, Loader2, MessageSquare, Sparkles, Radar, Users } from 'lucide-react';
import React, { useState } from 'react';
import { fetchTimeline, TimelineEvent, KeywordInsight, Contact } from '../services/gemini';
import { Timeline } from './Timeline';

/* Clickable bold terms that show a source popover */
const InteractiveKeyword = ({ children, keywords, groundingChunks, ...props }: { children?: React.ReactNode, keywords?: KeywordInsight[], groundingChunks?: any[] }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  if (!children) return null;

  const term = String(children);
  const insight = keywords?.find(k => {
    const cleanTerm = term.replace(/\*/g, '').toLowerCase();
    const cleanKTerm = k.term.replace(/\*/g, '').toLowerCase();
    return cleanKTerm.includes(cleanTerm) || cleanTerm.includes(cleanKTerm);
  });

  if (!insight) return <strong className="font-bold text-brand-navy">{children}</strong>;

  let finalUrl = insight.sourceUrl;
  if (!finalUrl || finalUrl.length < 15) {
    const matchingChunk = groundingChunks?.find(chunk =>
      chunk.web?.title?.toLowerCase().includes(term.toLowerCase()) ||
      chunk.web?.uri?.toLowerCase().includes(term.toLowerCase().replace(/\s+/g, '-'))
    );
    if (matchingChunk?.web?.uri) finalUrl = matchingChunk.web.uri;
  }

  return (
    <span className="relative inline-block" {...props}>
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="inline-flex items-center font-bold text-brand-magenta hover:text-brand-magenta-dark transition-colors border-b border-dashed border-brand-magenta/40 hover:border-brand-magenta cursor-pointer"
        title="Click to expand insight"
      >
        {children}
      </button>
      {isExpanded && (
        <span className="absolute z-50 left-0 top-full mt-2 block w-72 rounded-xl border border-neutral-200 bg-white p-4 text-left text-sm font-normal text-neutral-600 shadow-xl ring-1 ring-black/5">
          <span className="flex items-center gap-2 text-brand-magenta mb-2">
            <Sparkles className="w-3.5 h-3.5" />
            <span className="text-[10px] font-bold uppercase tracking-widest">Strategic Insight</span>
          </span>
          <span className="text-xs leading-relaxed mb-4 block">{insight.summary}</span>
          <span className="flex items-center gap-2">
            <a
              href={finalUrl && finalUrl.startsWith('http') ? finalUrl : `https://www.google.com/search?q=${encodeURIComponent(insight.term)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 flex items-center justify-center gap-2 rounded-lg bg-brand-navy py-2 text-[10px] font-bold text-white transition-colors hover:bg-brand-navy/90"
            >
              <ExternalLink className="w-3 h-3" />
              {finalUrl && finalUrl.startsWith('http') ? 'View Source' : 'Search Info'}
            </a>
            <button
              onClick={(e) => { e.stopPropagation(); setIsExpanded(false); }}
              className="rounded-lg px-3 py-2 text-[10px] font-bold text-neutral-500 transition-colors hover:bg-neutral-100 hover:text-neutral-700"
            >
              Close
            </button>
          </span>
        </span>
      )}
    </span>
  );
};

interface DashboardProps {
  data: {
    text: string;
    groundingChunks?: any[];
    contacts?: Contact[];
    keywords?: KeywordInsight[];
  };
  functionNames: string[];
  selectedYear: number | null;
  onAskAboutContact?: (contact: Contact) => void;
}

/* One OpCo section: header + markdown body + optional timeline */
function OpCoSection({
  text,
  opcoName,
  functionNames,
  selectedYear,
  keywords,
  groundingChunks,
}: {
  text: string;
  opcoName: string;
  functionNames: string[];
  selectedYear: number | null;
  keywords?: KeywordInsight[];
  groundingChunks?: any[];
}) {
  const [timelineEvents, setTimelineEvents] = useState<TimelineEvent[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Strip the h1 heading line from the body
  const body = text.replace(/^#\s+.+$/m, '').trim();

  const handleGenerateTimeline = async () => {
    setLoading(true);
    setError(null);
    try {
      const events = await fetchTimeline([opcoName], functionNames, selectedYear);
      setTimelineEvents(events);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch timeline.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mb-6 rounded-2xl border border-neutral-200 bg-white shadow-sm last:mb-0 overflow-hidden">
      {/* Header */}
      <div className="border-b border-neutral-100 bg-gradient-to-r from-white to-neutral-50/80 px-5 py-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-neutral-400">Operating Company Brief</p>
            <h3 className="mt-1.5 text-xl font-semibold text-brand-navy">{opcoName}</h3>
          </div>
          <div className="inline-flex items-center gap-2 rounded-full border border-brand-magenta/12 bg-brand-magenta/5 px-3 py-1.5 text-[11px] font-semibold text-brand-magenta">
            <Radar className="h-3.5 w-3.5" />
            Live strategic readout
          </div>
        </div>
      </div>

      {/* Markdown body */}
      <div className="px-5 py-5">
        <div className="prose prose-sm prose-neutral max-w-none
          prose-headings:font-semibold prose-headings:text-brand-navy
          prose-h2:text-base prose-h2:mt-5 prose-h2:mb-2 prose-h2:border-b prose-h2:border-neutral-100 prose-h2:pb-1.5
          prose-h3:text-[13px] prose-h3:mt-4 prose-h3:mb-1.5
          prose-p:text-[13px] prose-p:leading-[1.6] prose-p:text-neutral-700
          prose-li:text-[13px] prose-li:leading-[1.6] prose-li:text-neutral-700
          prose-strong:font-semibold
          prose-a:text-brand-magenta prose-a:no-underline hover:prose-a:underline
          print:prose-a:text-black">
          <Markdown
            remarkPlugins={[remarkGfm]}
            components={{
              strong: ({ node, ...props }) => (
                <InteractiveKeyword keywords={keywords} groundingChunks={groundingChunks} {...props} />
              ),
            }}
          >
            {body}
          </Markdown>
        </div>
      </div>

      {/* Timeline generation */}
      {!timelineEvents && !loading && (
        <div className="px-5 pb-5 print:hidden">
          <button
            onClick={handleGenerateTimeline}
            className="inline-flex items-center gap-2 rounded-lg border border-brand-magenta/15 bg-brand-magenta/6 px-4 py-2.5 text-[13px] font-semibold text-brand-magenta shadow-sm transition-all hover:bg-brand-magenta hover:text-white hover:shadow-md"
          >
            <Clock className="w-4 h-4" />
            Generate Strategic Timeline for {opcoName}
          </button>
        </div>
      )}

      {loading && (
        <div className="mx-5 mb-5 flex w-fit items-center gap-3 rounded-lg border border-neutral-200 bg-neutral-50 px-4 py-3 text-neutral-500">
          <Loader2 className="w-4 h-4 animate-spin text-brand-magenta" />
          <span className="text-[13px] font-medium italic">Generating timeline...</span>
        </div>
      )}

      {error && (
        <div className="mx-5 mb-5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-[13px] text-red-600">
          {error}
        </div>
      )}

      {timelineEvents && (
        <div className="border-t border-neutral-100 px-5 py-5">
          <h3 className="mb-5 flex items-center gap-2 text-base font-semibold text-brand-navy">
            <Clock className="w-4 h-4 text-brand-magenta" />
            Critical Timeline: {opcoName}
          </h3>
          <Timeline events={timelineEvents} />
        </div>
      )}
    </div>
  );
}

export function Dashboard({ data, functionNames, selectedYear, onAskAboutContact }: DashboardProps) {
  if (!data) return null;

  // Deduplicated sources
  const sources = data.groundingChunks
    ?.map(chunk => chunk.web)
    ?.filter(web => web && web.uri && web.title);

  const uniqueSources = sources?.reduce((acc, current) => {
    if (!acc.find((item: any) => item.uri === current.uri)) {
      return acc.concat([current]);
    }
    return acc;
  }, [] as any[]);

  // Split output by top-level h1 headings (one per OpCo)
  const cleanedText = stripKeywordsSection(data.text || '');
  const sections = cleanedText.split(/(?=^# )/m);

  return (
    <div className="space-y-5 print:space-y-4">
      <div className="print:p-0">
        {sections.map((section, index) => {
          const match = section.match(/^#\s+(.+)/);
          const opcoName = match ? match[1].trim() : null;

          if (opcoName) {
            return (
              <OpCoSection
                key={index}
                text={section}
                opcoName={opcoName}
                functionNames={functionNames}
                selectedYear={selectedYear}
                keywords={data.keywords}
                groundingChunks={data.groundingChunks}
              />
            );
          }

          // Fallback for non-OpCo content
          if (!section.trim()) return null;
          return (
            <div key={index} className="mb-5 rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm last:mb-0">
              <div className="mb-3 flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-brand-magenta" />
                <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-neutral-400">Strategic Narrative</p>
              </div>
              <div className="prose prose-sm prose-neutral max-w-none
                prose-headings:font-semibold prose-headings:text-brand-navy
                prose-p:text-[13px] prose-p:leading-[1.6] prose-p:text-neutral-700
                prose-li:text-[13px] prose-li:leading-[1.6] prose-li:text-neutral-700
                prose-a:text-brand-magenta prose-a:no-underline hover:prose-a:underline
                print:prose-a:text-black">
                <Markdown
                  remarkPlugins={[remarkGfm]}
                  components={{
                    strong: ({ node, ...props }) => (
                      <InteractiveKeyword keywords={data.keywords} groundingChunks={data.groundingChunks} {...props} />
                    ),
                  }}
                >
                  {section}
                </Markdown>
              </div>
            </div>
          );
        })}
      </div>

      {/* Key People Mentioned */}
      {data.contacts && data.contacts.length > 0 && (
        <div className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm print:shadow-none">
          <div className="mb-4 flex items-center gap-2">
            <Users className="h-4 w-4 text-brand-magenta" />
            <h3 className="text-[13px] font-semibold text-brand-navy">Key People Mentioned</h3>
            <span className="ml-auto rounded-full bg-neutral-100 px-2 py-0.5 text-[10px] font-semibold text-neutral-500">{data.contacts.length}</span>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {data.contacts.map((contact, i) => {
              const initials = contact.name.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase();
              return (
                <div key={i} className="flex gap-3 rounded-xl border border-neutral-150 bg-neutral-50/60 p-3.5 transition-all hover:border-neutral-200 hover:bg-white hover:shadow-sm">
                  {/* Avatar */}
                  <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-brand-navy/8 text-[12px] font-bold text-brand-navy">
                    {initials}
                  </div>
                  <div className="flex min-w-0 flex-1 flex-col">
                    <h4 className="truncate text-[13px] font-semibold leading-tight text-brand-navy">{contact.name}</h4>
                    <p className="mt-0.5 text-[11px] font-medium text-neutral-400">{contact.title}</p>
                    <p className="mt-1.5 text-[12px] leading-5 text-neutral-500 italic">"{contact.relevance}"</p>
                    {onAskAboutContact && (
                      <button
                        type="button"
                        onClick={() => onAskAboutContact(contact)}
                        className="mt-2.5 inline-flex items-center gap-1.5 self-start rounded-lg border border-neutral-200 bg-white px-2.5 py-1.5 text-[11px] font-semibold text-neutral-500 transition-all hover:border-brand-magenta/25 hover:text-brand-magenta print:hidden"
                      >
                        <MessageSquare className="h-3 w-3" />
                        Ask about {contact.name.split(' ')[0]}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Sources */}
      {uniqueSources && uniqueSources.length > 0 && (
        <div className="mt-8 pt-6 border-t border-neutral-100 print:shadow-none print:border-none print:p-0">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-brand-navy flex items-center gap-2">
              <Link2 className="w-4 h-4 text-brand-magenta print:hidden" />
              Sources & References
            </h3>
            <span className="text-[11px] text-neutral-400">{uniqueSources.length} sources</span>
          </div>
          <ul className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {uniqueSources.map((source, index) => (
              <li key={index}>
                <a
                  href={source.uri}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group flex items-start gap-2.5 p-2.5 rounded-xl hover:bg-neutral-50 transition-all border border-neutral-100 hover:border-neutral-200 print:p-0 print:border-none"
                >
                  <div className="w-6 h-6 rounded-md bg-neutral-100 flex items-center justify-center flex-shrink-0 group-hover:bg-brand-magenta/8 transition-colors print:hidden">
                    <ExternalLink className="w-3 h-3 text-neutral-400 group-hover:text-brand-magenta transition-colors" />
                  </div>
                  <div className="overflow-hidden min-w-0">
                    <h4 className="text-[12px] font-medium text-neutral-600 group-hover:text-brand-magenta transition-colors line-clamp-1 print:line-clamp-none">
                      {source.title}
                    </h4>
                    <p className="text-[10px] text-neutral-400 mt-0.5 truncate print:whitespace-normal print:break-all">
                      {source.uri}
                    </p>
                  </div>
                </a>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function stripKeywordsSection(text: string) {
  return text
    .replace(/^##?\s+Keywords\s*$[\s\S]*?(?=^##?\s+|^#\s+|\Z)/gim, '')
    .replace(/^#\s+Keywords\s*$[\s\S]*?(?=^#\s+|\Z)/gim, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}
