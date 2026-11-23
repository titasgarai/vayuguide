'use client';

import { Home, Leaf, Moon, Sun, Sunrise } from 'lucide-react';
import { AiGuidance, PersonaSlotInput, PersonaType } from '@/shared/types/aqi';

export const PERSONA_LABELS: Record<PersonaType, string> = {
  parent: 'Parent with Children',
  commuter: 'Daily Commuter',
  senior: 'Senior Citizen',
  student: 'Student / Athlete',
};

interface PersonaColumnProps {
  badge: string;
  slot: PersonaSlotInput;
  guidance: AiGuidance;
}

/**
 * Renders an individual persona recommendation column for side-by-side comparison.
 */
export function PersonaColumn({ badge, slot, guidance }: PersonaColumnProps) {
  const routineSlots = [
    { key: 'morning', label: 'Morning', icon: Sunrise, data: guidance.routine_planner.morning },
    { key: 'afternoon', label: 'Afternoon', icon: Sun, data: guidance.routine_planner.afternoon },
    { key: 'evening', label: 'Evening', icon: Moon, data: guidance.routine_planner.evening },
  ];

  return (
    <article className="flex flex-col space-y-4 rounded-2xl border border-hairline bg-surface p-5 shadow-sm">
      <header className="border-b border-hairline pb-3.5">
        <div className="flex items-center justify-between gap-2">
          <span className="font-mono text-[11px] font-medium uppercase tracking-wider text-forest">
            {badge} · {slot.hasAirPurifier ? 'HEPA Purifier' : 'No Purifier'}
          </span>
          <span className="rounded-lg border border-hairline bg-subtle px-2.5 py-0.5 font-mono text-[11px] font-semibold text-ink">
            Risk: {guidance.risk_level}
          </span>
        </div>
        <h3 className="mt-1 font-serif text-2xl text-ink">{PERSONA_LABELS[slot.persona]}</h3>
        <p className="mt-1.5 text-sm leading-relaxed text-ink/80">{guidance.headline_summary}</p>
      </header>

      <div className="space-y-2.5">
        <h4 className="font-mono text-[11px] font-semibold uppercase tracking-wider text-ink/60">
          Daily Routine
        </h4>
        {routineSlots.map(({ key, label, icon: Icon, data }) => (
          <div key={key} className="rounded-xl border border-hairline bg-canvas/60 p-3.5">
            <div className="mb-1 flex items-center gap-1.5 font-mono text-[11px] font-medium uppercase text-forest">
              <Icon className="h-3.5 w-3.5" aria-hidden="true" />
              <span>{label}</span>
            </div>
            <p className="text-sm font-medium text-ink">{data.action}</p>
            <p className="mt-1.5 rounded-lg bg-subtle p-2.5 text-xs text-ink/80">
              <strong className="text-ink">Why:</strong> {data.why}
            </p>
          </div>
        ))}
      </div>

      <div className="space-y-2">
        <h4 className="flex items-center gap-1.5 font-mono text-[11px] font-semibold uppercase tracking-wider text-pine">
          <Home className="h-3.5 w-3.5" aria-hidden="true" />
          <span>Indoor Air Hacks</span>
        </h4>
        <ul className="space-y-2">
          {guidance.indoor_air_hacks.map((item, idx) => (
            <li key={idx} className="rounded-xl border border-hairline bg-subtle p-3 text-xs">
              <p className="font-semibold text-ink">{item.hack}</p>
              <p className="mt-1 text-ink/80">
                <strong className="text-pine">Why:</strong> {item.why}
              </p>
            </li>
          ))}
        </ul>
      </div>

      <div className="space-y-2">
        <h4 className="flex items-center gap-1.5 font-mono text-[11px] font-semibold uppercase tracking-wider text-forest">
          <Leaf className="h-3.5 w-3.5" aria-hidden="true" />
          <span>Sustainable Swaps</span>
        </h4>
        <ul className="space-y-2">
          {guidance.sustainable_alternatives.map((item, idx) => (
            <li
              key={idx}
              className="rounded-xl border border-tint-border bg-tint/70 p-3 text-xs"
            >
              <p className="font-semibold text-ink">{item.swap}</p>
              <p className="mt-1 text-ink/85">
                <strong className="text-forest">Direct Impact:</strong> {item.direct_impact}
              </p>
            </li>
          ))}
        </ul>
      </div>
    </article>
  );
}
