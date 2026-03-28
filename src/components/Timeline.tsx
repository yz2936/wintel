import { motion } from 'motion/react';
import { TimelineEvent } from '../services/gemini';
import { Calendar, Building2 } from 'lucide-react';

export function Timeline({ events }: { events: TimelineEvent[] }) {
  if (!events || events.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-neutral-400">
        <Calendar className="w-8 h-8 mb-3 text-neutral-300" />
        <p className="text-sm font-medium">No milestones found for the selected criteria.</p>
      </div>
    );
  }

  return (
    <div className="relative border-l-2 border-neutral-200 ml-4 md:ml-8 py-4 space-y-8">
      {events.map((event, index) => (
        <motion.div
          key={index}
          initial={{ opacity: 0, x: -16 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true, margin: "-40px" }}
          transition={{ type: "spring", stiffness: 120, damping: 20, delay: index * 0.06 }}
          className="relative pl-8 md:pl-10"
        >
          {/* Timeline dot */}
          <div className="absolute -left-[9px] top-1.5 w-4 h-4 rounded-full bg-brand-magenta border-[3px] border-white shadow-sm shadow-brand-magenta/20" />

          <div className="rounded-xl border border-neutral-150 bg-white p-5 transition-all hover:border-neutral-200 hover:shadow-sm">
            <div className="flex flex-wrap items-center gap-2 mb-3">
              <div className="flex items-center gap-1.5 rounded-md bg-neutral-100 px-2.5 py-1 text-[11px] font-semibold text-neutral-500">
                <Calendar className="w-3.5 h-3.5" />
                {event.date}
              </div>
              <div className="flex items-center gap-1.5 rounded-md bg-brand-magenta/8 px-2.5 py-1 text-[11px] font-semibold text-brand-magenta">
                <Building2 className="w-3.5 h-3.5" />
                {event.opco}
              </div>
            </div>
            <h3 className="text-base font-semibold text-brand-navy mb-1.5 leading-snug">{event.title}</h3>
            <p className="text-[13px] text-neutral-600 leading-relaxed">{event.description}</p>
          </div>
        </motion.div>
      ))}
    </div>
  );
}
