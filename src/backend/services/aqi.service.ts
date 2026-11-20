import { LiveAqiMetrics } from '@/shared/types/aqi';

const CACHE_TTL_MS = 15 * 60 * 1000;
const MAX_CACHE_SIZE = 100;
const aqiCache = new Map<string, { data: LiveAqiMetrics; expiresAt: number }>();

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

async function fetchFromWaqi(city: string, token: string): Promise<LiveAqiMetrics | null> {
  const url = `https://api.waqi.info/feed/${encodeURIComponent(city)}/?token=${encodeURIComponent(token)}`;
  const res = await fetch(url, { cache: 'no-store', signal: AbortSignal.timeout(3500) });
  if (!res.ok) return null;

  const json = await res.json();
  if (json.status !== 'ok' || typeof json.data?.aqi !== 'number') return null;

  const data = json.data;
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
    city,
    stationName: data.city?.name || `${city} Monitoring Station`,
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

async function fetchFromOpenMeteo(city: string): Promise<LiveAqiMetrics> {
  const geoUrl = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(
    city
  )}&count=5&language=en&format=json`;
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

  if (results.length === 0) {
    throw new Error(`Could not find location "${city}". Please enter a valid Indian city.`);
  }

  const match = results.find((r) => r.country_code === 'IN') || results[0];

  const aqUrl = `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${match.latitude}&longitude=${match.longitude}&current=pm2_5,pm10,nitrogen_dioxide,ozone&timezone=Asia%2FKolkata`;
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
    city: match.name,
    stationName: match.admin1 ? `${match.name}, ${match.admin1}` : match.name,
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

export async function getLiveAqiForCity(rawCity: string): Promise<LiveAqiMetrics> {
  const normalizedKey = rawCity.trim().toLowerCase();
  const cached = aqiCache.get(normalizedKey);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.data;
  }

  let metrics: LiveAqiMetrics | null = null;
  const waqiToken = process.env.WAQI_API_TOKEN;

  if (waqiToken) {
    metrics = await fetchFromWaqi(rawCity.trim(), waqiToken).catch(() => null);
  }

  if (!metrics) {
    metrics = await fetchFromOpenMeteo(rawCity.trim());
  }

  if (aqiCache.size >= MAX_CACHE_SIZE) {
    const oldestKey = aqiCache.keys().next().value;
    if (oldestKey) aqiCache.delete(oldestKey);
  }

  aqiCache.set(normalizedKey, { data: metrics, expiresAt: Date.now() + CACHE_TTL_MS });
  return metrics;
}
