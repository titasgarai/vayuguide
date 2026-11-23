'use client';

import { useRef, useState } from 'react';
import { AlertCircle } from 'lucide-react';
import { AssistantResponse, UserProfile } from '@/shared/types/aqi';
import { EvaluatorPresetBar } from '@/frontend/components/EvaluatorPresetBar';
import { LocationProfileForm } from '@/frontend/components/LocationProfileForm';
import { LiveAqiCard } from '@/frontend/components/LiveAqiCard';
import { RoutinePlanner } from '@/frontend/components/RoutinePlanner';
import { IndoorAndSwapsSection } from '@/frontend/components/IndoorAndSwapsSection';
import { PersonaCompareView } from '@/frontend/components/PersonaCompareView';

export default function HomePage() {
  const [mode, setMode] = useState<'single' | 'compare'>('single');
  const [profile, setProfile] = useState<UserProfile>({
    city: 'Delhi',
    persona: 'parent',
    hasAirPurifier: false,
    plannedActivity: 'Evening outdoor play at 5 PM',
  });
  const [result, setResult] = useState<AssistantResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const singleTabRef = useRef<HTMLButtonElement>(null);
  const compareTabRef = useRef<HTMLButtonElement>(null);

  function handleTabKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
      e.preventDefault();
      if (mode === 'single') {
        setMode('compare');
        compareTabRef.current?.focus();
      } else {
        setMode('single');
        singleTabRef.current?.focus();
      }
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
      e.preventDefault();
      if (mode === 'compare') {
        setMode('single');
        singleTabRef.current?.focus();
      } else {
        setMode('compare');
        compareTabRef.current?.focus();
      }
    } else if (e.key === 'Home') {
      e.preventDefault();
      setMode('single');
      singleTabRef.current?.focus();
    } else if (e.key === 'End') {
      e.preventDefault();
      setMode('compare');
      compareTabRef.current?.focus();
    }
  }

  async function fetchGuidance(targetProfile: UserProfile) {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(targetProfile),
      });
      if (!res.ok) {
        const errBody = await res.json().catch(() => ({}));
        throw new Error(errBody.error || 'Failed to fetch live air quality guidance.');
      }
      const data: AssistantResponse = await res.json();
      setResult(data);
    } catch (err) {
      setResult(null); // Clean state reset on failure
      setError(err instanceof Error ? err.message : 'Unexpected error occurred.');
    } finally {
      setIsLoading(false);
    }
  }

  function handlePreset(presetProfile: UserProfile) {
    setProfile(presetProfile);
    fetchGuidance(presetProfile);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    fetchGuidance(profile);
  }

  return (
    <main id="main-content" className="mx-auto max-w-5xl space-y-6 px-4 py-10 sm:px-6 lg:px-8">
      <header className="space-y-1.5">
        <p className="font-mono text-xs uppercase tracking-widest text-forest">
          VayuGuide · Pan-India Air Quality Telemetry
        </p>
        <h1 className="font-serif text-4xl tracking-tight text-ink sm:text-5xl">
          Urban Air Quality Assistant
        </h1>
        <p className="max-w-2xl text-sm text-ink/70">
          Real-time CPCB telemetry &amp; Open-Meteo atmospheric readings translated into calm, justified,
          low-emission daily plans for your household.
        </p>
      </header>

      <div
        role="tablist"
        aria-label="View mode selection"
        onKeyDown={handleTabKeyDown}
        className="inline-flex rounded-xl border border-hairline bg-surface p-1 shadow-sm"
      >
        <button
          ref={singleTabRef}
          id="tab-single"
          type="button"
          role="tab"
          tabIndex={mode === 'single' ? 0 : -1}
          aria-selected={mode === 'single'}
          aria-controls="panel-single"
          onClick={() => setMode('single')}
          className={`rounded-lg px-4 py-2 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#15502E] focus-visible:ring-offset-1 ${
            mode === 'single' ? 'bg-forest text-white' : 'text-ink/75 hover:text-ink'
          }`}
        >
          Single Household Plan
        </button>
        <button
          ref={compareTabRef}
          id="tab-compare"
          type="button"
          role="tab"
          tabIndex={mode === 'compare' ? 0 : -1}
          aria-selected={mode === 'compare'}
          aria-controls="panel-compare"
          onClick={() => setMode('compare')}
          className={`rounded-lg px-4 py-2 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#15502E] focus-visible:ring-offset-1 ${
            mode === 'compare' ? 'bg-forest text-white' : 'text-ink/75 hover:text-ink'
          }`}
        >
          Compare Two Personas
        </button>
      </div>

      <div
        id="panel-single"
        role="tabpanel"
        aria-labelledby="tab-single"
        className={mode === 'single' ? 'space-y-6' : 'hidden'}
      >
        <EvaluatorPresetBar onSelectPreset={handlePreset} isLoading={isLoading} />

        <LocationProfileForm
          profile={profile}
          onChange={setProfile}
          onSubmit={handleSubmit}
          isLoading={isLoading}
        />

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
            <div className="h-44 rounded-2xl border border-hairline bg-subtle" />
            <div className="grid gap-4 md:grid-cols-3">
              <div className="h-40 rounded-2xl border border-hairline bg-subtle" />
              <div className="h-40 rounded-2xl border border-hairline bg-subtle" />
              <div className="h-40 rounded-2xl border border-hairline bg-subtle" />
            </div>
          </div>
        )}

        {!isLoading && result && (
          <div className="space-y-6" aria-live="polite">
            <LiveAqiCard metrics={result.metrics} headline={result.guidance.headline_summary} />
            <RoutinePlanner planner={result.guidance.routine_planner} />
            <IndoorAndSwapsSection
              indoorHacks={result.guidance.indoor_air_hacks}
              swaps={result.guidance.sustainable_alternatives}
            />
          </div>
        )}
      </div>

      <div
        id="panel-compare"
        role="tabpanel"
        aria-labelledby="tab-compare"
        className={mode === 'compare' ? 'block' : 'hidden'}
      >
        <PersonaCompareView />
      </div>
    </main>
  );
}
