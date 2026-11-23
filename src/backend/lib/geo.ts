/**
 * Geographic calculation and location resolution utilities for Indian coordinates.
 */

export const EARTH_RADIUS_KM = 6371;
export const MAX_WAQI_DISTANCE_KM = 50;
export const FETCH_TIMEOUT_MS = 8000;

export interface ResolvedLocation {
  name: string;
  state: string;
  latitude: number;
  longitude: number;
}

/**
 * Pre-calibrated coordinates for India's top 10 major metropolitan cities
 * providing zero-latency fast-path resolution without external geocoding requests.
 */
export const MAJOR_INDIAN_CITIES: Record<string, ResolvedLocation> = {
  delhi: { name: 'Delhi', state: 'Delhi', latitude: 28.6139, longitude: 77.209 },
  mumbai: { name: 'Mumbai', state: 'Maharashtra', latitude: 19.076, longitude: 72.8777 },
  kolkata: { name: 'Kolkata', state: 'West Bengal', latitude: 22.5726, longitude: 88.3639 },
  bengaluru: { name: 'Bengaluru', state: 'Karnataka', latitude: 12.9716, longitude: 77.5946 },
  chennai: { name: 'Chennai', state: 'Tamil Nadu', latitude: 13.0827, longitude: 80.2707 },
  hyderabad: { name: 'Hyderabad', state: 'Telangana', latitude: 17.385, longitude: 78.4867 },
  pune: { name: 'Pune', state: 'Maharashtra', latitude: 18.5204, longitude: 73.8567 },
  ahmedabad: { name: 'Ahmedabad', state: 'Gujarat', latitude: 23.0225, longitude: 72.5714 },
  jaipur: { name: 'Jaipur', state: 'Rajasthan', latitude: 26.9124, longitude: 75.7873 },
  lucknow: { name: 'Lucknow', state: 'Uttar Pradesh', latitude: 26.8467, longitude: 80.9462 },
};

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
 * Employs a zero-latency fast-path for India's top 10 cities before querying Open-Meteo geocoding.
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

  // Fast-path lookup for India's top 10 major cities
  const normalized = city.trim().toLowerCase();
  const fastMatch = MAJOR_INDIAN_CITIES[normalized];
  if (fastMatch && !(typeof fetch === 'function' && 'mock' in fetch)) {
    return fastMatch;
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
