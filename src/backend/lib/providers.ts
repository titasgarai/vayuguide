/**
 * Telemetry provider clients for WAQI (CPCB station feed) and Open-Meteo CAMS atmospheric model.
 */

import { LiveAqiMetrics } from '@/shared/types/aqi';
import {
  FETCH_TIMEOUT_MS,
  MAX_WAQI_DISTANCE_KM,
  haversineDistanceKm,
} from '@/backend/lib/geo';
import {
  computeNaqi,
  formatIstTimestamp,
  getIndianAqiCategory,
} from '@/backend/lib/naqi';

/**
 * Fetches real-time air quality metrics from WAQI Geo Feed within MAX_WAQI_DISTANCE_KM threshold.
 */
export async function fetchFromWaqiGeo(
  lat: number,
  lon: number,
  resolvedCity: string,
  token: string
): Promise<LiveAqiMetrics | null> {
  const url = `https://api.waqi.info/feed/geo:${lat};${lon}/?token=${encodeURIComponent(token)}`;
  const res = await fetch(url, {
    cache: 'no-store',
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
  });
  if (!res.ok) return null;

  const json = await res.json();
  if (json.status !== 'ok' || typeof json.data?.aqi !== 'number') return null;

  const data = json.data;
  const stationGeo = data.city?.geo;

  // Strict proximity check: WAQI station coordinates must exist and be <= MAX_WAQI_DISTANCE_KM
  if (
    !Array.isArray(stationGeo) ||
    stationGeo.length < 2 ||
    typeof stationGeo[0] !== 'number' ||
    typeof stationGeo[1] !== 'number'
  ) {
    return null;
  }

  const distanceKm = haversineDistanceKm(lat, lon, stationGeo[0], stationGeo[1]);
  if (distanceKm > MAX_WAQI_DISTANCE_KM) {
    return null;
  }

  const pm25 = Math.round(data.iaqi?.pm25?.v ?? 0);
  const pm10 = Math.round(data.iaqi?.pm10?.v ?? 0);

  let aqi: number;
  let primaryPollutant: string;

  if (pm25 > 0 || pm10 > 0) {
    const naqi = computeNaqi(pm25, pm10);
    aqi = naqi.aqi;
    primaryPollutant = naqi.primaryPollutant;
  } else {
    aqi = Math.round(data.aqi);
    const dominent = String(data.dominentpol || 'PM2.5').toUpperCase();
    primaryPollutant = dominent === 'PM25' ? 'PM2.5' : dominent;
  }

  return {
    city: resolvedCity,
    stationName: data.city?.name || `${resolvedCity} Monitoring Station`,
    aqi,
    category: getIndianAqiCategory(aqi),
    pm25,
    pm10,
    primaryPollutant,
    source: 'WAQI / CPCB Live Station Feed',
    timestamp: formatIstTimestamp(data.time?.iso),
    isModelled: false,
  };
}

/**
 * Fetches modeled atmospheric telemetry from Open-Meteo CAMS for pan-India coverage.
 */
export async function fetchFromOpenMeteoCams(
  lat: number,
  lon: number,
  resolvedCity: string,
  resolvedState?: string
): Promise<LiveAqiMetrics> {
  const aqUrl = `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${lat}&longitude=${lon}&current=pm2_5,pm10,nitrogen_dioxide,ozone&timezone=Asia%2FKolkata`;
  const aqRes = await fetch(aqUrl, {
    cache: 'no-store',
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
  });
  if (!aqRes.ok) {
    throw new Error('Live air quality service is temporarily unavailable.');
  }

  const aqJson = await aqRes.json();
  const current = aqJson.current;
  if (!current || (typeof current.pm2_5 !== 'number' && typeof current.pm10 !== 'number')) {
    throw new Error('Live air quality data unavailable for this location.');
  }

  const pm25 = Math.round(current.pm2_5 ?? 0);
  const pm10 = Math.round(current.pm10 ?? 0);
  const { aqi, primaryPollutant } = computeNaqi(pm25, pm10);

  return {
    city: resolvedCity,
    stationName: resolvedState ? `${resolvedCity}, ${resolvedState}` : resolvedCity,
    aqi,
    category: getIndianAqiCategory(aqi),
    pm25,
    pm10,
    primaryPollutant,
    source: 'Open-Meteo (CAMS modelled) · NAQI estimated from PM',
    timestamp: formatIstTimestamp(current.time),
    isModelled: true,
  };
}
