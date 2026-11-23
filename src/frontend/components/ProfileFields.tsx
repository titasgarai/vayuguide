'use client';

import { useId } from 'react';
import { UserCheck } from 'lucide-react';
import { PersonaSlotInput, PersonaType } from '@/shared/types/aqi';
import { PERSONA_LABELS } from '@/frontend/components/PersonaColumn';

export const PERSONA_OPTIONS: Array<{ value: PersonaType; label: string; desc: string }> = [
  { value: 'parent', label: 'Parent with Children', desc: 'School & outdoor play safety' },
  { value: 'commuter', label: 'Daily Commuter', desc: 'Transit & low-emission routes' },
  { value: 'senior', label: 'Senior Citizen', desc: 'Cautious respiratory protection' },
  { value: 'student', label: 'Student / Athlete', desc: 'Sports & campus routine' },
];

interface ProfileFieldsProps {
  value: PersonaSlotInput;
  onChange: (updated: PersonaSlotInput) => void;
  disabled?: boolean;
  variant?: 'tiles' | 'select';
  activityPlaceholder?: string;
}

/**
 * Reusable persona input group (persona picker, planned activity, and air purifier toggle).
 * Uses React.useId() for strictly unique DOM IDs across Single mode and Compare A/B slots.
 */
export function ProfileFields({
  value,
  onChange,
  disabled = false,
  variant = 'tiles',
  activityPlaceholder = 'e.g., Morning jog, school drop-off, office commute',
}: ProfileFieldsProps) {
  const personaSelectId = useId();
  const activityInputId = useId();
  const purifierCheckboxId = useId();

  return (
    <div className="space-y-4">
      {variant === 'tiles' ? (
        <fieldset>
          <legend className="mb-2.5 flex items-center gap-1.5 text-sm font-semibold text-ink">
            <UserCheck className="h-4 w-4 text-forest" aria-hidden="true" />
            <span>Household / Lifestyle Profile</span>
          </legend>
          <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-4">
            {PERSONA_OPTIONS.map((option) => {
              const active = value.persona === option.value;
              return (
                <button
                  key={option.value}
                  type="button"
                  disabled={disabled}
                  aria-pressed={active}
                  onClick={() => onChange({ ...value, persona: option.value })}
                  className={`rounded-xl border p-3.5 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#15502E] focus-visible:ring-offset-1 disabled:opacity-50 ${
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
      ) : (
        <div>
          <label htmlFor={personaSelectId} className="mb-1 block text-xs font-semibold text-ink">
            Profile
          </label>
          <select
            id={personaSelectId}
            value={value.persona}
            disabled={disabled}
            onChange={(e) => onChange({ ...value, persona: e.target.value as PersonaType })}
            className="w-full rounded-lg border border-hairline bg-surface px-3 py-2 text-sm text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#15502E] focus-visible:ring-offset-1 disabled:opacity-50"
          >
            {Object.entries(PERSONA_LABELS).map(([val, text]) => (
              <option key={val} value={val}>
                {text}
              </option>
            ))}
          </select>
        </div>
      )}

      <div>
        <label
          htmlFor={activityInputId}
          className={`mb-1.5 block font-semibold text-ink ${variant === 'tiles' ? 'text-sm' : 'text-xs'}`}
        >
          Planned Activity Today
        </label>
        <input
          id={activityInputId}
          type="text"
          disabled={disabled}
          value={value.plannedActivity}
          onChange={(e) => onChange({ ...value, plannedActivity: e.target.value })}
          placeholder={activityPlaceholder}
          className={`w-full rounded-xl border border-hairline bg-canvas/50 px-3.5 py-2.5 text-sm text-ink placeholder:text-ink/45 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#15502E] focus-visible:ring-offset-1 disabled:opacity-50 ${
            variant === 'select' ? 'rounded-lg px-3 py-2' : ''
          }`}
        />
      </div>

      <div className="flex items-center gap-2.5">
        <input
          id={purifierCheckboxId}
          type="checkbox"
          disabled={disabled}
          checked={value.hasAirPurifier}
          onChange={(e) => onChange({ ...value, hasAirPurifier: e.target.checked })}
          className="h-4 w-4 rounded border-hairline text-forest focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#15502E] focus-visible:ring-offset-1"
        />
        <label
          htmlFor={purifierCheckboxId}
          className={`cursor-pointer text-ink/85 ${variant === 'tiles' ? 'text-sm' : 'text-xs'}`}
        >
          Indoor HEPA air purifier available
        </label>
      </div>
    </div>
  );
}
