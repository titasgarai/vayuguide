'use client';

import { Search } from 'lucide-react';
import { UserProfile } from '@/shared/types/aqi';
import { CityAutocomplete } from '@/frontend/components/CityAutocomplete';
import { ProfileFields } from '@/frontend/components/ProfileFields';

interface LocationProfileFormProps {
  profile: UserProfile;
  onChange: (updated: UserProfile) => void;
  onSubmit: (e: React.FormEvent) => void;
  isLoading: boolean;
}

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
      <div className="max-w-md">
        <CityAutocomplete
          id="city-input"
          label="Indian City or Locality"
          value={profile.city}
          disabled={isLoading}
          required
          onSelectCity={(selection) => {
            onChange({
              ...profile,
              city: selection.city,
              latitude: selection.latitude,
              longitude: selection.longitude,
            });
          }}
        />
      </div>

      <ProfileFields
        value={profile}
        disabled={isLoading}
        variant="tiles"
        onChange={(updated) => onChange({ ...profile, ...updated })}
      />

      <div className="flex justify-end border-t border-hairline pt-4">
        <button
          type="submit"
          disabled={isLoading || !profile.city.trim()}
          className="inline-flex items-center gap-2 rounded-xl bg-forest px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-pine focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#15502E] focus-visible:ring-offset-1 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Search className="h-4 w-4" aria-hidden="true" />
          <span>{isLoading ? 'Fetching Telemetry...' : 'Generate Personalized Plan'}</span>
        </button>
      </div>
    </form>
  );
}
