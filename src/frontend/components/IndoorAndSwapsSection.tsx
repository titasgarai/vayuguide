import { Home, Leaf } from 'lucide-react';
import { AiGuidance } from '@/shared/types/aqi';

export function IndoorAndSwapsSection({
  indoorHacks,
  swaps,
}: {
  indoorHacks: AiGuidance['indoor_air_hacks'];
  swaps: AiGuidance['sustainable_alternatives'];
}) {
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <section
        aria-label="Indoor air quality hacks"
        className="rounded-2xl border border-hairline bg-surface p-5 shadow-sm sm:p-6"
      >
        <h3 className="mb-4 flex items-center gap-2 font-serif text-2xl text-ink">
          <Home className="h-5 w-5 text-pine" aria-hidden="true" />
          <span>Indoor Air Quality Hacks</span>
        </h3>
        <ul className="space-y-3">
          {indoorHacks.map((item, idx) => (
            <li key={idx} className="rounded-xl border border-hairline bg-subtle p-4">
              <p className="text-sm font-semibold text-ink">{item.hack}</p>
              <p className="mt-1.5 text-xs leading-relaxed text-ink/80">
                <strong className="text-pine">Why it helps:</strong> {item.why}
              </p>
            </li>
          ))}
        </ul>
      </section>

      <section
        aria-label="Sustainable low-emission alternatives"
        className="rounded-2xl border border-hairline bg-surface p-5 shadow-sm sm:p-6"
      >
        <h3 className="mb-4 flex items-center gap-2 font-serif text-2xl text-ink">
          <Leaf className="h-5 w-5 text-forest" aria-hidden="true" />
          <span>Sustainable Swaps &amp; Direct Impact</span>
        </h3>
        <ul className="space-y-3">
          {swaps.map((item, idx) => (
            <li key={idx} className="rounded-xl border border-tint-border bg-tint/70 p-4">
              <p className="text-sm font-semibold text-ink">{item.swap}</p>
              <p className="mt-1.5 text-xs leading-relaxed text-ink/85">
                <strong className="text-forest">Direct Impact:</strong> {item.direct_impact}
              </p>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

