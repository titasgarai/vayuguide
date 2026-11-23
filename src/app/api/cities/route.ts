import { NextResponse } from 'next/server';
import { FETCH_TIMEOUT_MS } from '@/backend/lib/geo';
import { handleApiError } from '@/backend/lib/api-error';

export const maxDuration = 60;

export interface CitySuggestion {
  name: string;
  state: string;
  latitude: number;
  longitude: number;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get('q')?.trim() || '';

  if (q.length < 2) {
    return NextResponse.json<CitySuggestion[]>([]);
  }

  try {
    const geoUrl = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(
      q
    )}&count=8&language=en&format=json`;
    const res = await fetch(geoUrl, {
      cache: 'no-store',
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });

    if (!res.ok) {
      return NextResponse.json<CitySuggestion[]>([]);
    }

    const data = await res.json();
    const rawResults: Array<{
      name: string;
      admin1?: string;
      country_code?: string;
      latitude: number;
      longitude: number;
    }> = data.results || [];

    // Filter strictly to Indian results
    const indianResults = rawResults.filter((r) => r.country_code === 'IN');

    // Deduplicate by name + state
    const seen = new Set<string>();
    const suggestions: CitySuggestion[] = [];

    for (const item of indianResults) {
      const state = item.admin1 || '';
      const key = `${item.name.toLowerCase()}::${state.toLowerCase()}`;
      if (!seen.has(key)) {
        seen.add(key);
        suggestions.push({
          name: item.name,
          state,
          latitude: Number(item.latitude.toFixed(4)),
          longitude: Number(item.longitude.toFixed(4)),
        });
      }
    }

    return NextResponse.json<CitySuggestion[]>(suggestions, { status: 200 });
  } catch (error) {
    return handleApiError(error, 'Cities', 'Failed to retrieve city suggestions.');
  }
}
