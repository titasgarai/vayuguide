import { LiveAqiMetrics } from '@/shared/types/aqi';

const CACHE_TTL_MS = 15 * 60 * 1000;
const MAX_CACHE_SIZE = 100;
const aqiCache = new Map<string, { data: LiveAqiMetrics; expiresAt: number }>();

export function haversineDistanceKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Earth radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export function getIndianAqiCategory(aqi: number): LiveAqiMetrics['category'] {
  if (aqi <= 50) return 'Good';
  if (aqi <= 100) return 'Satisfactory';
  if (aqi <= 200) return 'Moderate';
  if (aqi <= 300) return 'Poor';
  if (aqi <= 400) return 'Very Poor';
  return 'Severe';
}

type BP = [number, number, number, number]; // concLo, concHi, idxLo, idxHi
const PM25_BP: BP[] = [
  [0, 30, 0, 50],
  [30, 60, 51, 100],
  [60, 90, 101, 200],
  [90, 120, 201, 300],
  [120, 250, 301, 400],
  [250, 380, 401, 500],
];
const PM10_BP: BP[] = [
  [0, 50, 0, 50],
  [50, 100, 51, 100],
  [100, 250, 101, 200],
  [250, 350, 201, 300],
  [350, 430, 301, 400],
  [430, 510, 401, 500],
];

function subIndex(c: number, bps: BP[]): number {
  for (const [cLo, cHi, iLo, iHi] of bps) {
    if (c <= cHi) {
      return Math.round(iLo + ((Math.max(c, cLo) - cLo) * (iHi - iLo)) / (cHi - cLo));
    }
  }
  return 500;
}

export function computeNaqi(pm25: number, pm10: number): { aqi: number; primaryPollutant: string } {
  const s25 = pm25 > 0 ? subIndex(pm25, PM25_BP) : 0;
  const s10 = pm10 > 0 ? subIndex(pm10, PM10_BP) : 0;
  const aqi = Math.max(s25, s10, 0);
  const primaryPollutant = s25 >= s10 ? 'PM2.5' : 'PM10';
  return { aqi, primaryPollutant };
}

export function formatIstTimestamp(rawIsoOrDate?: string): string {
  if (!rawIsoOrDate) {
    return (
      new Date().toLocaleString('en-IN', {
        timeZone: 'Asia/Kolkata',
        dateStyle: 'medium',
        timeStyle: 'short',
      }) + ' IST'
    );
  }

  const hasOffset = /([zZ]|[+-]\d{2}:?\d{2})$/.test(rawIsoOrDate);
  const date = new Date(hasOffset ? rawIsoOrDate : `${rawIsoOrDate}+05:30`);
  if (Number.isNaN(date.getTime())) return rawIsoOrDate;

  return (
    date.toLocaleString('en-IN', {
      timeZone: 'Asia/Kolkata',
      dateStyle: 'medium',
      timeStyle: 'short',
    }) + ' IST'
  );
}

interface ResolvedLocation {
  name: string;
  state: string;
  latitude: number;
  longitude: number;
}

async function resolveIndianLocation(
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
  const geoRes = await fetch(geoUrl, { cache: 'no-store', signal: AbortSignal.timeout(3500) });
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
    throw new Error(`Could not find location "${city}". Please enter a valid Indian city.`);
  }

  const match = indianResults[0];
  return {
    name: match.name,
    state: match.admin1 || '',
    latitude: match.latitude,
    longitude: match.longitude,
  };
}

async function fetchFromWaqiGeo(
  lat: number,
  lon: number,
  resolvedCity: string,
  token: string
): Promise<LiveAqiMetrics | null> {
  const url = `https://api.waqi.info/feed/geo:${lat};${lon}/?token=${encodeURIComponent(token)}`;
  const res = await fetch(url, { cache: 'no-store', signal: AbortSignal.timeout(3500) });
  if (!res.ok) return null;

  const json = await res.json();
  if (json.status !== 'ok' || typeof json.data?.aqi !== 'number') return null;

  const data = json.data;
  const stationGeo = data.city?.geo;

  // Strict 50 km proximity check: WAQI must have coordinates and be <= 50km
  if (
    !Array.isArray(stationGeo) ||
    stationGeo.length < 2 ||
    typeof stationGeo[0] !== 'number' ||
    typeof stationGeo[1] !== 'number'
  ) {
    return null;
  }

  const distanceKm = haversineDistanceKm(lat, lon, stationGeo[0], stationGeo[1]);
  if (distanceKm > 50) {
    // Nearest station is too distant; trigger Open-Meteo fallback
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

async function fetchFromOpenMeteoCams(
  lat: number,
  lon: number,
  resolvedCity: string,
  resolvedState?: string
): Promise<LiveAqiMetrics> {
  const aqUrl = `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${lat}&longitude=${lon}&current=pm2_5,pm10,nitrogen_dioxide,ozone&timezone=Asia%2FKolkata`;
  const aqRes = await fetch(aqUrl, { cache: 'no-store', signal: AbortSignal.timeout(3500) });
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
  if (cachedByCity && cachedByCity.expiresAt > Date.now()) {
    return cachedByCity.data;
  }

  if (coordKey) {
    const cachedByCoord = aqiCache.get(coordKey);
    if (cachedByCoord && cachedByCoord.expiresAt > Date.now()) {
      return cachedByCoord.data;
    }
  }

  // 1. Resolve Indian location coordinates
  const location = await resolveIndianLocation(rawCity, latitude, longitude);

  let metrics: LiveAqiMetrics | null = null;
  const waqiToken = process.env.WAQI_API_TOKEN;

  // 2. Query WAQI by geo-coordinates if token is present
  if (waqiToken) {
    metrics = await fetchFromWaqiGeo(
      location.latitude,
      location.longitude,
      location.name,
      waqiToken
    ).catch(() => null);
  }

  // 3. Strict Fallback: If WAQI failed or nearest station was > 50km, fetch Open-Meteo CAMS
  if (!metrics) {
    metrics = await fetchFromOpenMeteoCams(
      location.latitude,
      location.longitude,
      location.name,
      location.state
    );
  }

  // Manage cache capacity
  if (aqiCache.size >= MAX_CACHE_SIZE) {
    const oldestKey = aqiCache.keys().next().value;
    if (oldestKey) aqiCache.delete(oldestKey);
  }

  const cacheEntry = { data: metrics, expiresAt: Date.now() + CACHE_TTL_MS };
  aqiCache.set(normalizedCity, cacheEntry);
  aqiCache.set(
    `geo:${location.latitude.toFixed(4)},${location.longitude.toFixed(4)}`,
    cacheEntry
  );

  return metrics;
}
