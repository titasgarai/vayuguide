'use client';

import { MapPin, Search, UserCheck } from 'lucide-react';
import { PersonaType, UserProfile } from '@/shared/types/aqi';

interface LocationProfileFormProps {
  profile: UserProfile;
  onChange: (updated: UserProfile) => void;
  onSubmit: (e: React.FormEvent) => void;
  isLoading: boolean;
}

const PERSONA_OPTIONS: Array<{ value: PersonaType; label: string; desc: string }> = [
  { value: 'parent', label: 'Parent with Children', desc: 'School & outdoor play safety' },
  { value: 'commuter', label: 'Daily Commuter', desc: 'Transit & low-emission routes' },
  { value: 'senior', label: 'Senior Citizen', desc: 'Cautious respiratory protection' },
  { value: 'student', label: 'Student / Athlete', desc: 'Sports & campus routine' },
];

export function LocationProfileForm({
  profile,
  onChange,
  onSubmit,
  isLoading,
}: LocationProfileFormProps) {
  return (
    <form
      onSubmit={onSubmit}
      className="space-y-5 rounded-2xl border border-hairline bg-surface p-5 shadow-sm sm:p-6"
    >
      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <label htmlFor="city-input" className="mb-1.5 block text-sm font-semibold text-ink">
            Indian City or Locality
          </label>
          <div className="relative">
            <MapPin
              className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-ink/45"
              aria-hidden="true"
            />
            <input
              id="city-input"
              type="text"
              required
              value={profile.city}
              onChange={(e) => onChange({ ...profile, city: e.target.value })}
              placeholder="e.g., Delhi, Kolkata, Bengaluru, Noida"
              className="w-full rounded-xl border border-hairline bg-canvas/50 py-2.5 pl-9 pr-3 text-sm text-ink placeholder:text-ink/45 focus:border-forest focus:bg-surface focus:outline-none focus:ring-2 focus:ring-forest/20"
            />
          </div>
        </div>

        <div>
          <label htmlFor="activity-input" className="mb-1.5 block text-sm font-semibold text-ink">
            Planned Activity Today
          </label>
          <input
            id="activity-input"
            type="text"
            value={profile.plannedActivity}
            onChange={(e) => onChange({ ...profile, plannedActivity: e.target.value })}
            placeholder="e.g., Morning jog, school drop-off, office commute"
            className="w-full rounded-xl border border-hairline bg-canvas/50 px-3.5 py-2.5 text-sm text-ink placeholder:text-ink/45 focus:border-forest focus:bg-surface focus:outline-none focus:ring-2 focus:ring-forest/20"
          />
        </div>
      </div>

      <fieldset>
        <legend className="mb-2.5 flex items-center gap-1.5 text-sm font-semibold text-ink">
          <UserCheck className="h-4 w-4 text-forest" aria-hidden="true" />
          <span>Household / Lifestyle Profile</span>
        </legend>
        <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-4">
          {PERSONA_OPTIONS.map((option) => {
            const active = profile.persona === option.value;
            return (
              <button
                key={option.value}
                type="button"
                aria-pressed={active}
                onClick={() => onChange({ ...profile, persona: option.value })}
                className={`rounded-xl border p-3.5 text-left transition focus:outline-none focus:ring-2 focus:ring-forest/40 ${
                  active
                    ? 'border-forest bg-tint text-ink ring-1 ring-forest'
                    : 'border-hairline bg-canvas/60 text-ink/80 hover:border-pine/40 hover:bg-canvas'
                }`}
              >
                <div className="text-sm font-semibold text-ink">{option.label}</div>
                <div className="mt-0.5 text-xs text-ink/65">{option.desc}</div>
              </button>
            );
          })}
        </div>
      </fieldset>

      <div className="flex flex-wrap items-center justify-between gap-4 border-t border-hairline pt-4">
        <label className="inline-flex cursor-pointer items-center gap-2.5 text-sm text-ink/85">
          <input
            type="checkbox"
            checked={profile.hasAirPurifier}
            onChange={(e) => onChange({ ...profile, hasAirPurifier: e.target.checked })}
            className="h-4 w-4 rounded border-hairline text-forest focus:ring-forest"
          />
          <span>I have an indoor HEPA air purifier at home</span>
        </label>

        <button
          type="submit"
          disabled={isLoading || !profile.city.trim()}
          className="inline-flex items-center gap-2 rounded-xl bg-forest px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-pine focus:outline-none focus:ring-2 focus:ring-forest/50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Search className="h-4 w-4" aria-hidden="true" />
          <span>{isLoading ? 'Analyzing Live Air Data...' : 'Get Personalized Plan'}</span>
        </button>
      </div>
    </form>
  );
}

