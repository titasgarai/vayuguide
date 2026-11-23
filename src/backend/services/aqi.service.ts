/**
 * Core orchestration service for live Indian air quality telemetry.
 * Integrates WAQI real-time station feeds with Open-Meteo CAMS fallback.
 */

import { LiveAqiMetrics } from '@/shared/types/aqi';
import {
  EARTH_RADIUS_KM,
  FETCH_TIMEOUT_MS,
  MAX_WAQI_DISTANCE_KM,
  LocationNotFoundError,
  haversineDistanceKm,
  resolveIndianLocation,
} from '@/backend/lib/geo';
import {
  PM10_BREAKPOINTS,
  PM25_BREAKPOINTS,
  computeNaqi,
  formatIstTimestamp,
  getIndianAqiCategory,
} from '@/backend/lib/naqi';
import { AQI_CACHE_TTL_MS, TtlCache } from '@/backend/lib/cache';
import { fetchFromOpenMeteoCams, fetchFromWaqiGeo } from '@/backend/lib/providers';

// Re-export for downstream consumers and unit tests
export {
  EARTH_RADIUS_KM,
  MAX_WAQI_DISTANCE_KM,
  FETCH_TIMEOUT_MS,
  LocationNotFoundError,
  haversineDistanceKm,
  resolveIndianLocation,
  computeNaqi,
  getIndianAqiCategory,
  formatIstTimestamp,
  PM25_BREAKPOINTS,
  PM10_BREAKPOINTS,
  TtlCache,
  AQI_CACHE_TTL_MS,
};

const aqiCache = new TtlCache<LiveAqiMetrics>();

/**
 * Retrieves live air quality telemetry for an Indian city with automatic failover to Open-Meteo CAMS.
 *
 * @param rawCity City name string.
 * @param latitude Optional latitude coordinates.
 * @param longitude Optional longitude coordinates.
 * @returns Standardized LiveAqiMetrics telemetry data.
 */
export async function getLiveAqiForCity(
  rawCity: string,
  latitude?: number,
  longitude?: number
): Promise<LiveAqiMetrics> {
  const normalizedCity = rawCity.trim().toLowerCase();
  const coordKey =
    typeof latitude === 'number' && typeof longitude === 'number'
      ? `geo:${latitude.toFixed(4)},${longitude.toFixed(4)}`
      : null;

  const cachedByCity = aqiCache.get(normalizedCity);
  if (cachedByCity) return cachedByCity;

  if (coordKey) {
    const cachedByCoord = aqiCache.get(coordKey);
    if (cachedByCoord) return cachedByCoord;
  }

  const location = await resolveIndianLocation(rawCity, latitude, longitude);

  let metrics: LiveAqiMetrics | null = null;
  const waqiToken = process.env.WAQI_API_TOKEN;

  if (waqiToken) {
    metrics = await fetchFromWaqiGeo(
      location.latitude,
      location.longitude,
      location.name,
      waqiToken
    ).catch(() => null);
  }

  if (!metrics) {
    metrics = await fetchFromOpenMeteoCams(
      location.latitude,
      location.longitude,
      location.name,
      location.state
    );
  }

  aqiCache.set(normalizedCity, metrics);
  aqiCache.set(
    `geo:${location.latitude.toFixed(4)},${location.longitude.toFixed(4)}`,
    metrics
  );

  return metrics;
}
