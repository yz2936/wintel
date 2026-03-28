import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { AlertTriangle, Building2, Calendar, ChevronDown, ChevronRight, FileText, TrendingUp, Users, Zap } from 'lucide-react';
import type { DocketTimelineEvent } from '../services/dockets';

type SignificanceFilter = 'all' | 'high' | 'medium' | 'low';

const SIGNIFICANCE_CONFIG = {
  high: {
    label: 'High Impact',
    dotClass: 'bg-brand-magenta shadow-brand-magenta/30',
    badgeClass: 'bg-brand-magenta/10 text-brand-magenta border border-brand-magenta/20',
    lineClass: 'bg-brand-magenta',
    icon: Zap,
  },
  medium: {
    label: 'Medium Impact',
    dotClass: 'bg-brand-navy shadow-brand-navy/20',
    badgeClass: 'bg-brand-navy/8 text-brand-navy border border-brand-navy/15',
    lineClass: 'bg-brand-navy',
    icon: TrendingUp,
  },
  low: {
    label: 'Low Impact',
    dotClass: 'bg-neutral-400 shadow-neutral-400/20',
    badgeClass: 'bg-neutral-100 text-neutral-500 border border-neutral-200',
    lineClass: 'bg-neutral-300',
    icon: FileText,
  },
} as const;

function EventCard({ event, index }: { event: DocketTimelineEvent; index: number }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const config = SIGNIFICANCE_CONFIG[event.significance] || SIGNIFICANCE_CONFIG.low;
  const Icon = config.icon;

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ type: 'spring', stiffness: 130, damping: 22, delay: index * 0.05 }}
      className="relative pl-10 md:pl-12"
    >
      {/* Connector dot */}
      <div className={`absolute -left-[9px] top-4 w-[18px] h-[18px] rounded-full border-[3px] border-white shadow-md ${config.dotClass}`} />

      <div
        className={`rounded-xl border transition-all ${
          event.significance === 'high'
            ? 'border-brand-magenta/20 bg-white hover:border-brand-magenta/35 hover:shadow-md hover:shadow-brand-magenta/5'
            : event.significance === 'medium'
            ? 'border-brand-navy/15 bg-white hover:border-brand-navy/25 hover:shadow-sm'
            : 'border-neutral-150 bg-white hover:border-neutral-200 hover:shadow-sm'
        }`}
      >
        {/* Card header — always visible */}
        <button
          type="button"
          onClick={() => setIsExpanded(!isExpanded)}
          className="w-full text-left px-4 py-4"
        >
          <div className="flex items-start gap-3">
            <div className={`mt-0.5 flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg ${config.badgeClass}`}>
              <Icon className="h-3.5 w-3.5" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-1.5 mb-2">
                {/* Date */}
                <span className="inline-flex items-center gap-1.5 rounded-md bg-neutral-100 px-2 py-0.5 text-[11px] font-semibold text-neutral-500">
                  <Calendar className="h-3 w-3" />
                  {event.date}
                </span>
                {/* Significance badge */}
                <span className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${config.badgeClass}`}>
                  {config.label}
                </span>
                {/* Utility */}
                <span className="inline-flex items-center gap-1.5 rounded-md bg-neutral-50 border border-neutral-150 px-2 py-0.5 text-[10px] font-semibold text-neutral-500">
                  <Building2 className="h-3 w-3" />
                  {event.utility}
                </span>
              </div>
              <h3 className="text-[14px] font-semibold leading-snug text-brand-navy pr-2">{event.title}</h3>
              <p className="mt-1.5 text-[13px] leading-5 text-neutral-600">{event.description}</p>
            </div>
            <div className="flex-shrink-0 mt-1">
              {isExpanded
                ? <ChevronDown className="h-4 w-4 text-neutral-400" />
                : <ChevronRight className="h-4 w-4 text-neutral-300" />
              }
            </div>
          </div>
        </button>

        {/* Expanded detail */}
        <AnimatePresence>
          {isExpanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 200, damping: 28 }}
              className="overflow-hidden"
            >
              <div className="border-t border-neutral-100 px-4 pb-4 pt-3 space-y-3">
                {/* Document type */}
                {event.documentType && (
                  <div className="flex items-center gap-2">
                    <FileText className="h-3.5 w-3.5 text-neutral-400 flex-shrink-0" />
                    <span className="text-[12px] text-neutral-500">
                      <span className="font-semibold text-neutral-700">Filing type:</span> {event.documentType}
                    </span>
                  </div>
                )}
                {/* Stakeholders */}
                {event.stakeholders.length > 0 && (
                  <div className="flex items-start gap-2">
                    <Users className="h-3.5 w-3.5 text-neutral-400 flex-shrink-0 mt-0.5" />
                    <div>
                      <span className="text-[12px] font-semibold text-neutral-700">Key stakeholders: </span>
                      <span className="text-[12px] text-neutral-500">{event.stakeholders.join(' · ')}</span>
                    </div>
                  </div>
                )}
                {/* Account planning angle */}
                {event.accountAngle && (
                  <div className="rounded-lg bg-brand-magenta/5 border border-brand-magenta/15 px-3 py-2.5">
                    <div className="flex items-center gap-1.5 mb-1">
                      <AlertTriangle className="h-3 w-3 text-brand-magenta" />
                      <span className="text-[10px] font-bold uppercase tracking-wider text-brand-magenta">Account Planning Angle</span>
                    </div>
                    <p className="text-[12px] leading-5 text-brand-navy/80">{event.accountAngle}</p>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

interface DocketTimelineProps {
  events: DocketTimelineEvent[];
  state: 'NY' | 'MA';
}

export function DocketTimeline({ events, state }: DocketTimelineProps) {
  const [filter, setFilter] = useState<SignificanceFilter>('all');

  const counts = {
    high: events.filter(e => e.significance === 'high').length,
    medium: events.filter(e => e.significance === 'medium').length,
    low: events.filter(e => e.significance === 'low').length,
  };

  const filtered = filter === 'all' ? events : events.filter(e => e.significance === filter);

  if (events.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-neutral-400">
        <Calendar className="w-10 h-10 mb-3 text-neutral-300" />
        <p className="text-sm font-medium">No timeline events were found for this docket set.</p>
        <p className="text-[12px] mt-1 text-neutral-400">Try running a docket sync first to populate the data.</p>
      </div>
    );
  }

  return (
    <div>
      {/* Summary stats bar */}
      <div className="mb-5 flex flex-wrap items-center gap-2">
        <span className="text-[11px] font-semibold text-neutral-400 mr-1">{events.length} events</span>

        {/* Filter pills */}
        {(['all', 'high', 'medium', 'low'] as const).map((level) => {
          const count = level === 'all' ? events.length : counts[level];
          const isActive = filter === level;
          const cfg = level !== 'all' ? SIGNIFICANCE_CONFIG[level] : null;

          return (
            <button
              key={level}
              type="button"
              onClick={() => setFilter(level)}
              className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-semibold transition-all ${
                isActive
                  ? level === 'all'
                    ? 'bg-brand-navy text-white shadow-sm'
                    : level === 'high'
                    ? 'bg-brand-magenta text-white shadow-sm'
                    : level === 'medium'
                    ? 'bg-brand-navy text-white shadow-sm'
                    : 'bg-neutral-600 text-white shadow-sm'
                  : 'bg-neutral-100 text-neutral-500 hover:bg-neutral-200'
              }`}
            >
              {cfg && <span className={`w-1.5 h-1.5 rounded-full ${isActive ? 'bg-white/60' : cfg.dotClass}`} />}
              {level === 'all' ? 'All' : cfg!.label}
              <span className={`rounded-full px-1.5 py-0.5 text-[10px] ${isActive ? 'bg-white/20' : 'bg-white text-neutral-500'}`}>
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Timeline track */}
      <div className="relative border-l-2 border-neutral-200 ml-[9px] space-y-5 py-2">
        <AnimatePresence mode="popLayout">
          {filtered.map((event, index) => (
            <EventCard key={`${event.date}-${event.title}`} event={event} index={index} />
          ))}
        </AnimatePresence>

        {filtered.length === 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="pl-10 py-6 text-[13px] text-neutral-400 italic"
          >
            No {filter} significance events in this {state} docket set.
          </motion.div>
        )}
      </div>
    </div>
  );
}
