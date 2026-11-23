'use client';

import { Sparkles } from 'lucide-react';
import { UserProfile } from '@/shared/types/aqi';

interface EvaluatorPresetBarProps {
  onSelectPreset: (profile: UserProfile) => void;
  isLoading: boolean;
}

const PRESETS: Array<{ label: string; profile: UserProfile }> = [
  {
    label: 'Delhi · Parent (2 Kids)',
    profile: {
      city: 'Delhi',
      persona: 'parent',
      hasAirPurifier: false,
      plannedActivity: 'Evening outdoor park play at 5 PM',
    },
  },
  {
    label: 'Kolkata · Daily Commuter',
    profile: {
      city: 'Kolkata',
      persona: 'commuter',
      hasAirPurifier: false,
      plannedActivity: 'Morning office commute by two-wheeler',
    },
  },
  {
    label: 'Mumbai · Senior Citizen',
    profile: {
      city: 'Mumbai',
      persona: 'senior',
      hasAirPurifier: true,
      plannedActivity: 'Early morning walk at 6:30 AM',
    },
  },
];

export function EvaluatorPresetBar({ onSelectPreset, isLoading }: EvaluatorPresetBarProps) {
  return (
    <section
      aria-label="Quick demo presets"
      className="rounded-2xl border border-tint-border bg-tint px-5 py-4"
    >
      <div className="mb-2.5 flex items-center gap-2 font-mono text-[11px] font-medium uppercase tracking-wider text-pine">
        <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
        <span>Quick Test Presets · Live AQI &amp; Persona Comparison</span>
      </div>
      <div className="flex flex-wrap gap-2">
        {PRESETS.map((preset) => (
          <button
            key={preset.label}
            type="button"
            disabled={isLoading}
            onClick={() => onSelectPreset(preset.profile)}
            className="rounded-xl border border-tint-border bg-surface px-3.5 py-1.5 text-sm font-medium text-ink transition hover:border-forest hover:bg-canvas focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#15502E] focus-visible:ring-offset-1 disabled:opacity-50"
          >
            {preset.label}
          </button>
        ))}
      </div>
    </section>
  );
}

