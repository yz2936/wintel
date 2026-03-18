import { motion } from 'motion/react';
import { TimelineEvent } from '../services/gemini';
import { Calendar, Building2 } from 'lucide-react';

export function Timeline({ events }: { events: TimelineEvent[] }) {
  if (!events || events.length === 0) {
    return <div className="text-center text-neutral-500 py-12">No milestones found for the selected criteria.</div>;
  }

  return (
    <div className="relative border-l-2 border-brand-navy/20 ml-4 md:ml-8 py-8 space-y-12">
      {events.map((event, index) => (
        <motion.div 
          key={index}
          initial={{ opacity: 0, x: -20 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true, margin: "-50px" }}
          transition={{ duration: 0.5, delay: index * 0.1 }}
          className="relative pl-8 md:pl-12"
        >
          {/* Timeline dot */}
          <div className="absolute -left-[11px] top-1 w-5 h-5 rounded-full bg-brand-magenta border-4 border-white shadow-sm" />
          
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-neutral-200 hover:border-brand-magenta/30 transition-colors">
            <div className="flex flex-wrap items-center gap-3 mb-3 text-sm font-medium text-brand-navy/60">
              <div className="flex items-center gap-1.5 bg-brand-navy/5 px-2.5 py-1 rounded-md">
                <Calendar className="w-4 h-4" />
                {event.date}
              </div>
              <div className="flex items-center gap-1.5 bg-brand-magenta/10 text-brand-magenta px-2.5 py-1 rounded-md">
                <Building2 className="w-4 h-4" />
                {event.opco}
              </div>
            </div>
            <h3 className="text-xl font-semibold text-brand-navy mb-2">{event.title}</h3>
            <p className="text-neutral-600 leading-relaxed">{event.description}</p>
          </div>
        </motion.div>
      ))}
    </div>
  );
}
