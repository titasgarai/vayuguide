import { Moon, Sun, Sunrise } from 'lucide-react';
import { AiGuidance } from '@/shared/types/aqi';

export function RoutinePlanner({ planner }: { planner: AiGuidance['routine_planner'] }) {
  const slots = [
    { key: 'morning', label: 'Morning', icon: Sunrise, data: planner.morning },
    { key: 'afternoon', label: 'Afternoon', icon: Sun, data: planner.afternoon },
    { key: 'evening', label: 'Evening', icon: Moon, data: planner.evening },
  ];

  return (
    <section aria-label="Personalized daily routine planner" className="space-y-3">
      <h3 className="font-serif text-2xl text-ink">Low-Emission Daily Routine</h3>
      <div className="grid gap-4 md:grid-cols-3">
        {slots.map(({ key, label, icon: Icon, data }) => (
          <article
            key={key}
            className="flex flex-col justify-between rounded-2xl border border-hairline bg-surface p-5 shadow-sm"
          >
            <div>
              <div className="mb-2.5 flex items-center gap-2 font-mono text-xs font-medium uppercase tracking-wider text-forest">
                <Icon className="h-4 w-4" aria-hidden="true" />
                <span>{label}</span>
              </div>
              <p className="text-sm font-medium leading-relaxed text-ink">{data.action}</p>
            </div>
            <div className="mt-4 rounded-lg bg-subtle p-3 text-xs leading-relaxed text-ink/80">
              <span className="font-semibold text-ink">Why: </span>
              {data.why}
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

