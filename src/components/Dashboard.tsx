import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { ExternalLink, Link2, Clock, Loader2, Sparkles, ArrowUpRight, Radar, Clock3, BriefcaseBusiness, UsersRound, Target } from 'lucide-react';
import React, { useState } from 'react';
import { fetchTimeline, TimelineEvent, KeywordInsight } from '../services/gemini';
import { Timeline } from './Timeline';

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
    if (matchingChunk?.web?.uri) {
      finalUrl = matchingChunk.web.uri;
    }
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
          <span className="text-xs leading-relaxed mb-4 block">
            {insight.summary}
          </span>
          <span className="flex items-center gap-2">
            {finalUrl && finalUrl.startsWith('http') ? (
              <a
                href={finalUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 flex items-center justify-center gap-2 rounded-lg bg-brand-navy py-2 text-[10px] font-bold text-white transition-colors hover:bg-brand-navy/90"
              >
                <ExternalLink className="w-3 h-3" />
                View Source
              </a>
            ) : (
              <a
                href={`https://www.google.com/search?q=${encodeURIComponent(insight.term)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 flex items-center justify-center gap-2 rounded-lg bg-neutral-100 py-2 text-[10px] font-bold text-neutral-600 transition-colors hover:bg-neutral-200"
              >
                <ExternalLink className="w-3 h-3" />
                Search Info
              </a>
            )}
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
    contacts?: any[];
    keywords?: KeywordInsight[];
  };
  functionNames: string[];
  selectedYear: number | null;
}

function OpCoSection({ text, opcoName, functionNames, selectedYear, keywords, groundingChunks }: { text: string, opcoName: string, functionNames: string[], selectedYear: number | null, keywords?: KeywordInsight[], groundingChunks?: any[] }) {
  const [timelineEvents, setTimelineEvents] = useState<TimelineEvent[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const prioritySections = extractPrioritySections(text);
  const overflowNarrative = extractOverflowNarrative(text, prioritySections);
  const consolidatedReadout = buildConsolidatedReadout(prioritySections, overflowNarrative);

  const handleGenerateTimeline = async () => {
    setLoading(true);
    setError(null);
    try {
      const events = await fetchTimeline([opcoName], functionNames, selectedYear);
      setTimelineEvents(events);
    } catch (err: any) {
      setError(err.message || "Failed to fetch timeline.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mb-6 rounded-2xl border border-neutral-200 bg-white shadow-sm last:mb-0 overflow-hidden">
      {/* OpCo header */}
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

      <div className="px-5 py-5">
        {/* Keyword pills */}
        {keywords && keywords.length > 0 && (
          <div className="mb-5 flex flex-wrap gap-1.5">
            {keywords.slice(0, 5).map((keyword) => (
              <span key={`${opcoName}-${keyword.term}`} className="rounded-full border border-neutral-150 bg-neutral-50 px-2.5 py-1 text-[10px] font-semibold text-neutral-500">
                {keyword.term.replace(/\*/g, '')}
              </span>
            ))}
          </div>
        )}

        {/* Priority lens cards — 2x2 grid */}
        <div className="grid gap-3 lg:grid-cols-2">
          {prioritySections.map((section) => {
            const Icon = section.icon;
            const snapshotBullets = buildStrategicSnapshot(section.body);
            return (
              <div key={`${opcoName}-${section.key}`} className="group rounded-xl border border-neutral-150 bg-white transition-all hover:border-neutral-200 hover:shadow-sm">
                <div className="border-b border-neutral-100 px-4 py-3">
                  <div className="flex items-center gap-2">
                    <div className="flex h-6 w-6 items-center justify-center rounded-md bg-brand-magenta/8">
                      <Icon className="h-3.5 w-3.5 text-brand-magenta" />
                    </div>
                    <span className="text-[11px] font-bold uppercase tracking-[0.16em] text-neutral-500">{section.title}</span>
                  </div>
                  <p className="mt-1.5 text-[11px] leading-4 text-neutral-400">{section.subtitle}</p>
                </div>
                <div className="px-4 py-3.5">
                  {snapshotBullets.length > 0 ? (
                    <ul className="space-y-2">
                      {snapshotBullets.map((bullet, index) => (
                        <li key={`${section.key}-${index}`} className="flex gap-2.5 text-[13px] leading-[1.55] text-neutral-700">
                          <span className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full bg-brand-magenta/60" />
                          <span>{bullet}</span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-[13px] leading-5 text-neutral-400 italic">Not a primary emphasis in this brief.</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Consolidated readout */}
        {consolidatedReadout.length > 0 && (
          <div className="mt-4 rounded-xl border border-neutral-100 bg-neutral-50/60 p-4">
            <div className="mb-3 flex items-center gap-2">
              <ArrowUpRight className="h-4 w-4 text-brand-magenta" />
              <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-neutral-400">Sharp Readout</p>
            </div>
            <ul className="space-y-2">
              {consolidatedReadout.map((item, index) => (
                <li key={`${opcoName}-consolidated-${index}`} className="flex gap-2.5 text-[13px] leading-[1.55] text-neutral-700">
                  <span className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full bg-brand-magenta/60" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
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
          <h3 className="mb-5 flex items-center gap-2 text-lg font-semibold text-brand-navy">
            <Clock className="w-5 h-5 text-brand-magenta" />
            Critical Timeline: {opcoName}
          </h3>
          <Timeline events={timelineEvents} />
        </div>
      )}
    </div>
  );
}

export function Dashboard({ data, functionNames, selectedYear }: DashboardProps) {
  if (!data) return null;

  const sources = data.groundingChunks
    ?.map(chunk => chunk.web)
    ?.filter(web => web && web.uri && web.title);

  const uniqueSources = sources?.reduce((acc, current) => {
    const x = acc.find((item: any) => item.uri === current.uri);
    if (!x) {
      return acc.concat([current]);
    } else {
      return acc;
    }
  }, [] as any[]);

  const cleanedText = stripKeywordsSection(data.text || '');
  const sections = cleanedText.split(/(?=^# )/m);

  return (
    <div className="space-y-5 print:space-y-4">
      <div className="print:p-0">
        {sections.map((section, index) => {
          const match = section.match(/^#\s+(.+)/);
          const opcoName = match ? match[1].trim() : null;

          if (opcoName) {
            return <OpCoSection key={index} text={section} opcoName={opcoName} functionNames={functionNames} selectedYear={selectedYear} keywords={data.keywords} groundingChunks={data.groundingChunks} />;
          }

          return (
            <div key={index} className="mb-5 rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm last:mb-0">
              <div className="mb-3 flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-brand-magenta" />
                <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-neutral-400">Strategic Narrative</p>
              </div>
              <div className="prose prose-sm prose-neutral max-w-none prose-headings:font-semibold prose-headings:text-brand-navy prose-a:text-brand-magenta prose-a:no-underline hover:prose-a:underline print:prose-a:text-black">
              <Markdown
                remarkPlugins={[remarkGfm]}
                components={{
                  strong: ({node, ...props}) => <InteractiveKeyword keywords={data.keywords} groundingChunks={data.groundingChunks} {...props} />,
                  h2: ({node, ...props}) => <h2 className="mt-8 mb-4 flex items-center gap-2 border-b border-neutral-200 pb-2 text-brand-navy" {...props} />
                }}
              >
                {section}
              </Markdown>
              </div>
            </div>
          );
        })}
      </div>

      {/* Sources — improved card grid */}
      {uniqueSources && uniqueSources.length > 0 && (
        <div className="mt-10 pt-6 border-t border-neutral-100 print:shadow-none print:border-none print:p-0">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-base font-semibold text-brand-navy flex items-center gap-2">
              <Link2 className="w-4 h-4 text-brand-magenta print:hidden" />
              Sources & References
            </h3>
            <span className="text-[11px] text-neutral-400 font-medium">{uniqueSources.length} sources</span>
          </div>
          <ul className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
            {uniqueSources.map((source, index) => (
              <li key={index}>
                <a
                  href={source.uri}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group flex items-start gap-3 p-3 rounded-xl hover:bg-neutral-50 transition-all border border-neutral-100 hover:border-neutral-200 hover:shadow-sm print:p-0 print:border-none"
                >
                  <div className="w-7 h-7 rounded-lg bg-brand-navy/5 flex items-center justify-center flex-shrink-0 group-hover:bg-brand-magenta/8 transition-colors print:hidden">
                    <ExternalLink className="w-3.5 h-3.5 text-neutral-400 group-hover:text-brand-magenta transition-colors" />
                  </div>
                  <div className="overflow-hidden min-w-0">
                    <h4 className="text-[13px] font-medium text-neutral-700 group-hover:text-brand-magenta transition-colors line-clamp-1 print:line-clamp-none">
                      {source.title}
                    </h4>
                    <p className="text-[11px] text-neutral-400 mt-0.5 truncate print:whitespace-normal print:break-all">
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

const PRIORITY_CONFIG = [
  {
    key: 'recency',
    title: 'Recency & Material News',
    subtitle: 'What changed recently and what now matters most',
    icon: Clock3,
    aliases: ['recency', 'material news', 'high-level news', 'market intel', 'news']
  },
  {
    key: 'opportunities',
    title: 'Insights & Opportunities',
    subtitle: 'Commercial implications, buying motion, and openings',
    icon: BriefcaseBusiness,
    aliases: ['insights', 'opportunities', 'pain points', 'functional insights', 'buying signals', 'actionable pitch']
  },
  {
    key: 'stakeholders',
    title: 'Key Client Stakeholders',
    subtitle: 'Who is involved and why they matter now',
    icon: UsersRound,
    aliases: ['stakeholders', 'stakeholder', 'persona takeaways', 'client stakeholders']
  },
  {
    key: 'attack',
    title: 'Talking Points & Attack Strategy',
    subtitle: 'How to engage, what to say, and next-step motions',
    icon: Target,
    aliases: ['attack strategy', 'talking points', 'plan of attack', 'pitch ideas', 'outreach']
  }
] as const;

function extractPrioritySections(text: string) {
  const cleaned = text.replace('[TIMELINE_PLACEHOLDER]', '').trim();
  const narrative = cleaned.replace(/^#\s+.+$/m, '').trim();
  const rawSections = splitMarkdownSections(narrative);

  return PRIORITY_CONFIG.map((config) => {
    const match = rawSections.find((section) => {
      const heading = normalizeHeading(section.heading);
      return config.aliases.some((alias) => heading.includes(alias));
    });

    return {
      ...config,
      body: match?.body?.trim() || extractFallbackSectionBody(narrative, config.aliases)
    };
  });
}

function extractOverflowNarrative(text: string, prioritySections: Array<{ body: string }>) {
  const cleaned = text.replace('[TIMELINE_PLACEHOLDER]', '').trim();
  const narrative = cleaned.replace(/^#\s+.+$/m, '').trim();
  const strippedBodies = prioritySections
    .map((section) => section.body.trim())
    .filter(Boolean);

  let overflow = narrative;
  for (const body of strippedBodies) {
    overflow = overflow.replace(body, '');
  }

  overflow = overflow
    .replace(/^#{2,4}\s+.+$/gm, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  return overflow;
}

function splitMarkdownSections(text: string) {
  const matches = [...text.matchAll(/^#{2,4}\s+(.+)$/gm)];
  if (matches.length === 0) {
    return [];
  }

  return matches.map((match, index) => {
    const heading = match[1].trim();
    const start = match.index ?? 0;
    const bodyStart = start + match[0].length;
    const end = index + 1 < matches.length ? (matches[index + 1].index ?? text.length) : text.length;
    const body = text.slice(bodyStart, end).trim();
    return { heading, body };
  });
}

function normalizeHeading(heading: string) {
  return heading
    .toLowerCase()
    .replace(/^[\d.\-)\s]+/, '')
    .replace(/[*_`:#]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function extractFallbackSectionBody(text: string, aliases: readonly string[]) {
  const lines = text.split('\n');
  const sections: Array<{ heading: string; body: string[] }> = [];
  let current: { heading: string; body: string[] } | null = null;

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) {
      if (current) {
        current.body.push('');
      }
      continue;
    }

    const normalized = normalizeHeading(line);
    const looksLikeHeading =
      aliases.some((alias) => normalized.includes(alias)) ||
      PRIORITY_CONFIG.some((config) => config.aliases.some((alias) => normalized.includes(alias)));

    if (looksLikeHeading) {
      current = { heading: normalized, body: [] };
      sections.push(current);
      continue;
    }

    if (current) {
      current.body.push(rawLine);
    }
  }

  const match = sections.find((section) => aliases.some((alias) => section.heading.includes(alias)));
  return match ? match.body.join('\n').trim() : '';
}

function buildStrategicSnapshot(body: string) {
  if (!body.trim()) {
    return [];
  }

  const plainText = body
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '$1')
    .replace(/[*_`>#-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  const bullets = body
    .split('\n')
    .map((line) => line.replace(/^[-*•\d.)\s]+/, '').trim())
    .filter(Boolean)
    .filter((line) => line.length > 24)
    .slice(0, 2);

  if (bullets.length > 0) {
    return bullets.map(compactSentence);
  }

  return plainText
    .split(/(?<=[.?!])\s+/)
    .map((sentence) => sentence.trim())
    .filter((sentence) => sentence.length > 24)
    .slice(0, 2)
    .map(compactSentence);
}

function compactSentence(sentence: string) {
  return sentence
    .replace(/\s+/g, ' ')
    .replace(/^Summary:\s*/i, '')
    .trim();
}

function buildConsolidatedReadout(
  prioritySections: Array<{ title: string; body: string }>,
  overflowNarrative: string
) {
  const consolidated = prioritySections
    .map((section) => {
      const firstBullet = buildStrategicSnapshot(section.body)[0];
      if (!firstBullet) {
        return null;
      }

      return `${section.title}: ${firstBullet}`;
    })
    .filter((item): item is string => Boolean(item))
    .slice(0, 4);

  const overflowItems = buildStrategicSnapshot(overflowNarrative)
    .filter((item) => !consolidated.includes(item))
    .slice(0, Math.max(0, 5 - consolidated.length));

  return [...consolidated, ...overflowItems];
}
