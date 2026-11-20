import { Clock, Database, Info, Wind } from 'lucide-react';
import { LiveAqiMetrics } from '@/shared/types/aqi';

const CATEGORY_STYLES: Record<LiveAqiMetrics['category'], string> = {
  Good: 'bg-emerald-100 text-emerald-900 border-emerald-300',
  Satisfactory: 'bg-lime-100 text-lime-900 border-lime-300',
  Moderate: 'bg-amber-100 text-amber-900 border-amber-300',
  Poor: 'bg-orange-100 text-orange-900 border-orange-300',
  'Very Poor': 'bg-red-100 text-red-900 border-red-300',
  Severe: 'bg-rose-950 text-rose-50 border-rose-800',
};

export function LiveAqiCard({
  metrics,
  headline,
}: {
  metrics: LiveAqiMetrics;
  headline: string;
}) {
  const stationLabel = metrics.isModelled
    ? `Location (CAMS Modelled Grid) · ${metrics.stationName}`
    : `CPCB Monitoring Station · ${metrics.stationName}`;

  const aqiBadgeLabel = metrics.isModelled ? 'Estimated NAQI' : 'Live NAQI';

  return (
    <section
      aria-label="Live air quality metrics"
      className="rounded-2xl border border-hairline bg-surface p-5 shadow-sm sm:p-6"
    >
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="max-w-2xl">
          <p className="flex items-center gap-1.5 font-mono text-xs uppercase tracking-wider text-ink/60">
            {metrics.isModelled && <Info className="h-3.5 w-3.5 text-pine" aria-hidden="true" />}
            <span>{stationLabel}</span>
          </p>
          <h2 className="mt-1 font-serif text-3xl tracking-tight text-ink sm:text-4xl">
            {metrics.city}
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-ink/80">{headline}</p>
        </div>

        <div
          className={`flex min-w-[130px] flex-col items-center rounded-2xl border px-5 py-3.5 ${
            CATEGORY_STYLES[metrics.category]
          }`}
        >
          <span className="font-mono text-[11px] font-medium uppercase tracking-wider">
            {aqiBadgeLabel}
          </span>
          <span className="font-mono text-4xl font-semibold tabular-nums">{metrics.aqi}</span>
          <span className="mt-0.5 text-xs font-semibold">{metrics.category}</span>
        </div>
      </div>

      <div className="mt-5 grid grid-cols-3 gap-3 rounded-xl border border-hairline bg-subtle p-4 text-center">
        <div>
          <div className="font-mono text-[11px] uppercase tracking-wider text-ink/60">PM2.5</div>
          <div className="mt-1 font-mono text-lg font-semibold tabular-nums text-ink">
            {metrics.pm25} <span className="text-xs font-normal text-ink/65">µg/m³</span>
          </div>
        </div>
        <div>
          <div className="font-mono text-[11px] uppercase tracking-wider text-ink/60">PM10</div>
          <div className="mt-1 font-mono text-lg font-semibold tabular-nums text-ink">
            {metrics.pm10} <span className="text-xs font-normal text-ink/65">µg/m³</span>
          </div>
        </div>
        <div>
          <div className="font-mono text-[11px] uppercase tracking-wider text-ink/60">
            Primary Pollutant
          </div>
          <div className="mt-1 flex items-center justify-center gap-1.5 font-mono text-lg font-semibold text-ink">
            <Wind className="h-4 w-4 text-pine" aria-hidden="true" />
            <span>{metrics.primaryPollutant}</span>
          </div>
        </div>
      </div>

      <footer className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-hairline pt-3 font-mono text-xs text-ink/65">
        <span className="inline-flex items-center gap-1.5">
          <Database className="h-3.5 w-3.5 text-pine" aria-hidden="true" />
          Source: <strong className="font-medium text-ink">{metrics.source}</strong>
        </span>
        <span className="inline-flex items-center gap-1.5 tabular-nums">
          <Clock className="h-3.5 w-3.5 text-pine" aria-hidden="true" />
          Updated: <strong className="font-medium text-ink">{metrics.timestamp}</strong>
        </span>
      </footer>
    </section>
  );
}
