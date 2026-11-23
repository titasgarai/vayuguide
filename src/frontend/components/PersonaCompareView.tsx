'use client';

import { useState } from 'react';
import { AlertCircle, ArrowLeftRight } from 'lucide-react';
import { CompareResponse, PersonaSlotInput } from '@/shared/types/aqi';
import { LiveAqiCard } from '@/frontend/components/LiveAqiCard';
import { CityAutocomplete } from '@/frontend/components/CityAutocomplete';
import { PERSONA_LABELS, PersonaColumn } from '@/frontend/components/PersonaColumn';
import { ProfileFields } from '@/frontend/components/ProfileFields';

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
      setResult(null); // Clean state reset on failure
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
              <ProfileFields
                value={state}
                disabled={isLoading}
                variant="select"
                onChange={setter}
              />
            </fieldset>
          ))}
        </div>

        <div className="flex justify-end border-t border-hairline pt-4">
          <button
            type="submit"
            disabled={isLoading || !city.trim()}
            className="inline-flex items-center gap-2 rounded-xl bg-forest px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-pine focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#15502E] focus-visible:ring-offset-1 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <ArrowLeftRight className="h-4 w-4" aria-hidden="true" />
            <span>{isLoading ? 'Comparing Live Plans...' : 'Compare Side-by-Side'}</span>
          </button>
        </div>
      </form>

      {error && (
        <div
          role="alert"
          aria-live="assertive"
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
        <div className="space-y-6" aria-live="polite">
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
