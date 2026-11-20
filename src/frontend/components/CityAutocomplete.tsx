'use client';

import { useEffect, useRef, useState } from 'react';
import { ChevronDown, Loader2, MapPin } from 'lucide-react';
import { CitySuggestion } from '@/app/api/cities/route';

interface CityAutocompleteProps {
  id: string;
  label?: string;
  value: string;
  onSelectCity: (selection: { city: string; latitude?: number; longitude?: number }) => void;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
}

const QUICK_PICKS: CitySuggestion[] = [
  { name: 'Delhi', state: 'Delhi', latitude: 28.6139, longitude: 77.209 },
  { name: 'Kolkata', state: 'West Bengal', latitude: 22.5726, longitude: 88.3639 },
  { name: 'Mumbai', state: 'Maharashtra', latitude: 19.076, longitude: 72.8777 },
  { name: 'Bengaluru', state: 'Karnataka', latitude: 12.9716, longitude: 77.5946 },
  { name: 'Chennai', state: 'Tamil Nadu', latitude: 13.0827, longitude: 80.2707 },
  { name: 'Malda', state: 'West Bengal', latitude: 25.0045, longitude: 88.1457 },
  { name: 'Siliguri', state: 'West Bengal', latitude: 26.7271, longitude: 88.3953 },
  { name: 'Asansol', state: 'West Bengal', latitude: 23.6889, longitude: 86.9661 },
  { name: 'Jaipur', state: 'Rajasthan', latitude: 26.9124, longitude: 75.7873 },
  { name: 'Patna', state: 'Bihar', latitude: 25.6093, longitude: 85.1376 },
];

export function CityAutocomplete({
  id,
  label,
  value,
  onSelectCity,
  placeholder = 'Search Indian city or town (e.g., Malda, Delhi, Kolkata)...',
  required = false,
  disabled = false,
}: CityAutocompleteProps) {
  const [inputValue, setInputValue] = useState(value);
  const [isOpen, setIsOpen] = useState(false);
  const [suggestions, setSuggestions] = useState<CitySuggestion[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Sync external value changes
  useEffect(() => {
    setInputValue(value);
  }, [value]);

  // Click outside listener
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Debounced search on typing
  useEffect(() => {
    const trimmed = inputValue.trim();
    if (trimmed.length < 2) {
      setSuggestions([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    const handler = setTimeout(async () => {
      try {
        const res = await fetch(`/api/cities?q=${encodeURIComponent(trimmed)}`);
        if (res.ok) {
          const data: CitySuggestion[] = await res.json();
          setSuggestions(data);
        } else {
          setSuggestions([]);
        }
      } catch {
        setSuggestions([]);
      } finally {
        setIsLoading(false);
      }
    }, 250);

    return () => clearTimeout(handler);
  }, [inputValue]);

  function handleSelect(item: CitySuggestion) {
    const display = item.state ? `${item.name}, ${item.state}` : item.name;
    setInputValue(display);
    setIsOpen(false);
    onSelectCity({
      city: item.name,
      latitude: item.latitude,
      longitude: item.longitude,
    });
  }

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const text = e.target.value;
    setInputValue(text);
    setIsOpen(true);
    // Allow free-text submission without coords (resolved server-side)
    onSelectCity({ city: text });
  }

  function handleFocus() {
    setIsOpen(true);
  }

  const showQuickPicks = inputValue.trim().length < 2;

  return (
    <div ref={containerRef} className="relative w-full">
      {label && (
        <label htmlFor={id} className="mb-1.5 block text-sm font-semibold text-ink">
          {label}
        </label>
      )}

      <div className="relative">
        <MapPin
          className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-ink/45"
          aria-hidden="true"
        />
        <input
          id={id}
          type="text"
          role="combobox"
          aria-autocomplete="list"
          aria-expanded={isOpen}
          aria-controls={`${id}-suggestions`}
          required={required}
          disabled={disabled}
          value={inputValue}
          onChange={handleInputChange}
          onFocus={handleFocus}
          placeholder={placeholder}
          className="w-full rounded-xl border border-hairline bg-canvas/50 py-2.5 pl-9 pr-9 text-sm text-ink placeholder:text-ink/45 focus:border-forest focus:bg-surface focus:outline-none focus:ring-2 focus:ring-forest/20 disabled:opacity-50"
        />
        <div className="pointer-events-none absolute right-3 top-3 text-ink/45">
          {isLoading ? (
            <Loader2 className="h-4 w-4 animate-spin text-forest" />
          ) : (
            <ChevronDown className="h-4 w-4" />
          )}
        </div>
      </div>

      {isOpen && (
        <div
          id={`${id}-suggestions`}
          role="listbox"
          className="absolute z-30 mt-1.5 max-h-64 w-full overflow-y-auto rounded-xl border border-hairline bg-surface p-1.5 shadow-lg backdrop-blur"
        >
          {showQuickPicks ? (
            <div>
              <div className="px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider text-forest">
                Quick Picks · Pan-India Stations
              </div>
              {QUICK_PICKS.map((item) => (
                <button
                  key={`${item.name}-${item.state}`}
                  type="button"
                  role="option"
                  aria-selected={false}
                  onClick={() => handleSelect(item)}
                  className="flex w-full items-center justify-between rounded-lg px-2.5 py-2 text-left text-sm text-ink hover:bg-tint transition"
                >
                  <span className="font-medium">{item.name}</span>
                  <span className="text-xs text-ink/55">{item.state}</span>
                </button>
              ))}
            </div>
          ) : suggestions.length > 0 ? (
            <div>
              <div className="px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider text-forest">
                Matching Indian Locations
              </div>
              {suggestions.map((item) => (
                <button
                  key={`${item.name}-${item.state}-${item.latitude}`}
                  type="button"
                  role="option"
                  aria-selected={false}
                  onClick={() => handleSelect(item)}
                  className="flex w-full items-center justify-between rounded-lg px-2.5 py-2 text-left text-sm text-ink hover:bg-tint transition"
                >
                  <span className="font-medium">{item.name}</span>
                  <span className="text-xs text-ink/65">{item.state || 'India'}</span>
                </button>
              ))}
            </div>
          ) : !isLoading ? (
            <div className="px-3 py-3 text-center text-xs text-ink/60">
              No matching Indian cities found. Press enter to search anyway.
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}
