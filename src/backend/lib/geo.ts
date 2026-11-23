/**
 * Geographic calculation and location resolution utilities for Indian coordinates.
 */

export const EARTH_RADIUS_KM = 6371;
export const MAX_WAQI_DISTANCE_KM = 50;
export const FETCH_TIMEOUT_MS = 3500;

export interface ResolvedLocation {
  name: string;
  state: string;
  latitude: number;
  longitude: number;
}

/**
 * Thrown when an Indian city or locality cannot be resolved via geocoding.
 */
export class LocationNotFoundError extends Error {
  constructor(city: string) {
    super(`Could not find location "${city}". Please enter a valid Indian city.`);
    this.name = 'LocationNotFoundError';
  }
}

/**
 * Calculates the great-circle distance between two geographic coordinates using the Haversine formula.
 *
 * @param lat1 Latitude of first point in decimal degrees.
 * @param lon1 Longitude of first point in decimal degrees.
 * @param lat2 Latitude of second point in decimal degrees.
 * @param lon2 Longitude of second point in decimal degrees.
 * @returns Distance in kilometers.
 */
export function haversineDistanceKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return EARTH_RADIUS_KM * c;
}

/**
 * Resolves coordinates for an Indian city or validates provided coordinates.
 * Filters geocoding results to country_code === 'IN'.
 *
 * @throws {LocationNotFoundError} If no matching Indian location is found.
 */
export async function resolveIndianLocation(
  city: string,
  providedLat?: number,
  providedLon?: number
): Promise<ResolvedLocation> {
  if (typeof providedLat === 'number' && typeof providedLon === 'number') {
    return {
      name: city.trim(),
      state: '',
      latitude: providedLat,
      longitude: providedLon,
    };
  }

  const geoUrl = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(
    city.trim()
  )}&count=8&language=en&format=json`;
  const geoRes = await fetch(geoUrl, {
    cache: 'no-store',
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
  });
  if (!geoRes.ok) {
    throw new Error('Failed to geocode location.');
  }

  const geoJson = await geoRes.json();
  const results: Array<{
    name: string;
    admin1?: string;
    country_code?: string;
    latitude: number;
    longitude: number;
  }> = geoJson.results || [];

  const indianResults = results.filter((r) => r.country_code === 'IN');

  if (indianResults.length === 0) {
    throw new LocationNotFoundError(city);
  }

  const match = indianResults[0];
  return {
    name: match.name,
    state: match.admin1 || '',
    latitude: match.latitude,
    longitude: match.longitude,
  };
}
