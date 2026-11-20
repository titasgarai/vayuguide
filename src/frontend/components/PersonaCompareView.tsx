'use client';

import { useState } from 'react';
import { AlertCircle, ArrowLeftRight, Home, Leaf, Moon, Sun, Sunrise } from 'lucide-react';
import { AiGuidance, CompareResponse, PersonaSlotInput, PersonaType } from '@/shared/types/aqi';
import { LiveAqiCard } from '@/frontend/components/LiveAqiCard';
import { CityAutocomplete } from '@/frontend/components/CityAutocomplete';

const PERSONA_LABELS: Record<PersonaType, string> = {
  parent: 'Parent with Children',
  commuter: 'Daily Commuter',
  senior: 'Senior Citizen',
  student: 'Student / Athlete',
};

function PersonaColumn({
  badge,
  slot,
  guidance,
}: {
  badge: string;
  slot: PersonaSlotInput;
  guidance: AiGuidance;
}) {
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

export function PersonaCompareView() {
  const [city, setCity] = useState('Delhi');
  const [latitude, setLatitude] = useState<number | undefined>(undefined);
  const [longitude, setLongitude] = useState<number | undefined>(undefined);

  const [profileA, setProfileA] = useState<PersonaSlotInput>({
    persona: 'parent',
    hasAirPurifier: false,
    plannedActivity: 'Evening outdoor park play at 5 PM',
  });
  const [profileB, setProfileB] = useState<PersonaSlotInput>({
    persona: 'commuter',
    hasAirPurifier: false,
    plannedActivity: 'Morning office commute by two-wheeler',
  });
  const [result, setResult] = useState<CompareResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleCompare(e: React.FormEvent) {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/compare', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ city, latitude, longitude, profileA, profileB }),
      });
      if (!res.ok) {
        const errBody = await res.json().catch(() => ({}));
        throw new Error(errBody.error || 'Failed to generate side-by-side comparison.');
      }
      const data: CompareResponse = await res.json();
      setResult(data);
    } catch (err) {
      setResult(null); // Clean state reset: wipe previous results on failure
      setError(err instanceof Error ? err.message : 'Unexpected error occurred.');
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <section aria-label="Side-by-side persona comparison" className="space-y-6">
      <form
        onSubmit={handleCompare}
        className="space-y-5 rounded-2xl border border-hairline bg-surface p-5 shadow-sm sm:p-6"
      >
        <div className="max-w-md">
          <CityAutocomplete
            id="compare-city"
            label="Shared Indian City"
            value={city}
            disabled={isLoading}
            required
            onSelectCity={(selection) => {
              setCity(selection.city);
              setLatitude(selection.latitude);
              setLongitude(selection.longitude);
            }}
          />
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          {[
            { id: 'A', label: 'Persona A', state: profileA, setter: setProfileA },
            { id: 'B', label: 'Persona B', state: profileB, setter: setProfileB },
          ].map(({ id, label, state, setter }) => (
            <fieldset
              key={id}
              className="space-y-3 rounded-xl border border-hairline bg-canvas/60 p-4"
            >
              <legend className="px-1 font-mono text-xs font-semibold uppercase tracking-wider text-forest">
                {label}
              </legend>

              <div>
                <label
                  htmlFor={`persona-${id}`}
                  className="mb-1 block text-xs font-semibold text-ink"
                >
                  Profile
                </label>
                <select
                  id={`persona-${id}`}
                  value={state.persona}
                  onChange={(e) => setter({ ...state, persona: e.target.value as PersonaType })}
                  className="w-full rounded-lg border border-hairline bg-surface px-3 py-2 text-sm text-ink focus:border-forest focus:outline-none focus:ring-2 focus:ring-forest/20"
                >
                  {Object.entries(PERSONA_LABELS).map(([val, text]) => (
                    <option key={val} value={val}>
                      {text}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label
                  htmlFor={`activity-${id}`}
                  className="mb-1 block text-xs font-semibold text-ink"
                >
                  Planned Activity
                </label>
                <input
                  id={`activity-${id}`}
                  type="text"
                  value={state.plannedActivity}
                  onChange={(e) => setter({ ...state, plannedActivity: e.target.value })}
                  className="w-full rounded-lg border border-hairline bg-surface px-3 py-2 text-sm text-ink focus:border-forest focus:outline-none focus:ring-2 focus:ring-forest/20"
                />
              </div>

              <label className="inline-flex cursor-pointer items-center gap-2 text-xs text-ink/85">
                <input
                  type="checkbox"
                  checked={state.hasAirPurifier}
                  onChange={(e) => setter({ ...state, hasAirPurifier: e.target.checked })}
                  className="h-4 w-4 rounded border-hairline text-forest focus:ring-forest"
                />
                <span>Has indoor HEPA air purifier</span>
              </label>
            </fieldset>
          ))}
        </div>

        <div className="flex justify-end border-t border-hairline pt-4">
          <button
            type="submit"
            disabled={isLoading || !city.trim()}
            className="inline-flex items-center gap-2 rounded-xl bg-forest px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-pine focus:outline-none focus:ring-2 focus:ring-forest/50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <ArrowLeftRight className="h-4 w-4" aria-hidden="true" />
            <span>{isLoading ? 'Comparing Live Plans...' : 'Compare Side-by-Side'}</span>
          </button>
        </div>
      </form>

      {error && (
        <div
          role="alert"
          className="flex items-center gap-2.5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-900"
        >
          <AlertCircle className="h-4 w-4 shrink-0" aria-hidden="true" />
          <span>{error}</span>
        </div>
      )}

      {isLoading && (
        <div className="animate-pulse space-y-4" aria-busy="true">
          <div className="h-36 rounded-2xl border border-hairline bg-subtle" />
          <div className="grid gap-6 lg:grid-cols-2">
            <div className="h-96 rounded-2xl border border-hairline bg-subtle" />
            <div className="h-96 rounded-2xl border border-hairline bg-subtle" />
          </div>
        </div>
      )}

      {!isLoading && result && (
        <div className="space-y-6">
          <LiveAqiCard
            metrics={result.metrics}
            headline={`Comparing live air quality guidance for ${PERSONA_LABELS[result.profileA.persona]} vs. ${PERSONA_LABELS[result.profileB.persona]} using identical station telemetry.`}
          />
          <div className="grid gap-6 lg:grid-cols-2">
            <PersonaColumn badge="Persona A" slot={result.profileA} guidance={result.guidanceA} />
            <PersonaColumn badge="Persona B" slot={result.profileB} guidance={result.guidanceB} />
          </div>
        </div>
      )}
    </section>
  );
}
