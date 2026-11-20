import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  computeNaqi,
  formatIstTimestamp,
  getIndianAqiCategory,
  getLiveAqiForCity,
  haversineDistanceKm,
} from '@/backend/services/aqi.service';
import * as geminiService from '@/backend/services/gemini.service';
import { AiGuidanceSchema } from '@/backend/validators/schemas';
import { POST } from '@/app/api/analyze/route';
import { GET as getCities } from '@/app/api/cities/route';
import { AiGuidance } from '@/shared/types/aqi';

const MOCK_GUIDANCE: AiGuidance = {
  headline_summary: 'Air quality is poor in Delhi today; keep evening play indoors.',
  risk_level: 'High',
  routine_planner: {
    morning: {
      action: 'Use an N95 mask during school drop-off.',
      why: 'PM2.5 peaks during winter morning inversions.',
    },
    afternoon: {
      action: 'Briefly ventilate rooms between 1 PM and 3 PM.',
      why: 'Higher afternoon mixing heights temporarily reduce ground-level smog.',
    },
    evening: {
      action: 'Shift children’s 5 PM park play to indoor activities.',
      why: 'AQI above 200 increases respiratory irritation for young lungs.',
    },
  },
  indoor_air_hacks: [
    {
      hack: 'Wet-mop floors instead of dry sweeping.',
      why: 'Prevents settled PM10 dust from resuspending indoors.',
    },
  ],
  sustainable_alternatives: [
    {
      swap: 'Batch evening errands into one metro/walking trip.',
      direct_impact: 'Eliminates cold-start tailpipe emissions during peak smog hours.',
    },
  ],
  data_attribution: 'Source: Open-Meteo (CAMS modelled) · NAQI estimated from PM | Last Updated: 20 Nov 2026 IST',
};

describe('Haversine Distance & CPCB Utilities', () => {
  it('calculates accurate Haversine distance between two coordinates', () => {
    // Malda (25.0045, 88.1457) to Katihar (25.5601, 87.5533) is ~85.8 km
    const dist = haversineDistanceKm(25.0045, 88.1457, 25.5601, 87.5533);
    expect(dist).toBeGreaterThan(80);
    expect(dist).toBeLessThan(90);

    // Same point is 0 km
    expect(haversineDistanceKm(28.6139, 77.209, 28.6139, 77.209)).toBe(0);
  });

  it('maps exact boundary values across all 6 CPCB tiers', () => {
    expect(getIndianAqiCategory(0)).toBe('Good');
    expect(getIndianAqiCategory(50)).toBe('Good');
    expect(getIndianAqiCategory(51)).toBe('Satisfactory');
    expect(getIndianAqiCategory(100)).toBe('Satisfactory');
    expect(getIndianAqiCategory(101)).toBe('Moderate');
    expect(getIndianAqiCategory(200)).toBe('Moderate');
    expect(getIndianAqiCategory(201)).toBe('Poor');
    expect(getIndianAqiCategory(300)).toBe('Poor');
    expect(getIndianAqiCategory(301)).toBe('Very Poor');
    expect(getIndianAqiCategory(400)).toBe('Very Poor');
    expect(getIndianAqiCategory(401)).toBe('Severe');
  });

  it('computes authentic CPCB NAQI sub-indices accurately from PM2.5 and PM10', () => {
    const result = computeNaqi(94, 148);
    expect(result.aqi).toBeGreaterThanOrEqual(201);
    expect(result.aqi).toBeLessThanOrEqual(300);
    expect(getIndianAqiCategory(result.aqi)).toBe('Poor');
    expect(result.primaryPollutant).toBe('PM2.5');

    const good = computeNaqi(15, 25);
    expect(good.aqi).toBeLessThanOrEqual(50);
    expect(getIndianAqiCategory(good.aqi)).toBe('Good');
  });

  it('correctly handles offset-less Open-Meteo timestamps without double-offsetting', () => {
    const raw = '2026-11-20T18:00';
    const formatted = formatIstTimestamp(raw);
    expect(formatted).toContain('6:00');
    expect(formatted).toContain('IST');
    expect(formatted).not.toContain('11:30');
  });
});

describe('Gemini Output Zod Validation Schema', () => {
  it('accepts valid schema responses', () => {
    const parsed = AiGuidanceSchema.safeParse(MOCK_GUIDANCE);
    expect(parsed.success).toBe(true);
  });

  it('rejects guidance missing required why justifications', () => {
    const invalid = {
      ...MOCK_GUIDANCE,
      routine_planner: {
        ...MOCK_GUIDANCE.routine_planner,
        evening: { action: 'Stay inside', why: '' },
      },
    };
    const parsed = AiGuidanceSchema.safeParse(invalid);
    expect(parsed.success).toBe(false);
  });
});

describe('Live Pan-India AQI Service & Fallback Guards', () => {
  const originalEnv = process.env.WAQI_API_TOKEN;

  beforeEach(() => {
    delete process.env.WAQI_API_TOKEN;
  });

  afterEach(() => {
    if (originalEnv) {
      process.env.WAQI_API_TOKEN = originalEnv;
    } else {
      delete process.env.WAQI_API_TOKEN;
    }
    vi.unstubAllGlobals();
  });

  it('resolves Malda to West Bengal and triggers Open-Meteo fallback when WAQI station is > 50 km away', async () => {
    process.env.WAQI_API_TOKEN = 'test-token';

    const fetchMock = vi
      .fn()
      // 1. Geocoding search for Malda
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          results: [
            { name: 'Malda', country_code: 'ES', latitude: 41.55, longitude: 1.03 },
            { name: 'Malda', admin1: 'West Bengal', country_code: 'IN', latitude: 25.0045, longitude: 88.1457 },
          ],
        }),
      })
      // 2. WAQI geo call returning a distant station (Katihar, ~85.8 km away)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          status: 'ok',
          data: {
            aqi: 220,
            city: { name: 'Mirchaibari, Katihar', geo: [25.5601, 87.5533] },
            time: { iso: '2026-11-20T12:00:00+05:30' },
          },
        }),
      })
      // 3. Open-Meteo CAMS fallback fetch for Malda coordinates
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          current: { pm2_5: 94.4, pm10: 148.2, time: '2026-11-20T12:00' },
        }),
      });

    vi.stubGlobal('fetch', fetchMock);

    const metrics = await getLiveAqiForCity('Malda');

    // Must resolve to Malda, West Bengal (NOT Delhi or Katihar)
    expect(metrics.city).toBe('Malda');
    expect(metrics.stationName).toBe('Malda, West Bengal');
    expect(metrics.source).toContain('Open-Meteo (CAMS modelled)');
    expect(metrics.isModelled).toBe(true);
    expect(metrics.category).toBe('Poor');
  });

  it('accepts WAQI station when it is within 50 km', async () => {
    process.env.WAQI_API_TOKEN = 'test-token';

    const fetchMock = vi
      .fn()
      // 1. Geocoding search for Kolkata
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          results: [
            { name: 'Kolkata', admin1: 'West Bengal', country_code: 'IN', latitude: 22.5726, longitude: 88.3639 },
          ],
        }),
      })
      // 2. WAQI geo call returning Victoria, Kolkata (approx 3 km away)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          status: 'ok',
          data: {
            aqi: 165,
            city: { name: 'Victoria, Kolkata', geo: [22.5448, 88.3426] },
            iaqi: { pm25: { v: 78 }, pm10: { v: 120 } },
            time: { iso: '2026-11-20T12:00:00+05:30' },
          },
        }),
      });

    vi.stubGlobal('fetch', fetchMock);

    const metrics = await getLiveAqiForCity('Kolkata');

    expect(metrics.city).toBe('Kolkata');
    expect(metrics.stationName).toBe('Victoria, Kolkata');
    expect(metrics.source).toContain('WAQI / CPCB Live Station Feed');
    expect(metrics.isModelled).toBe(false);
  });

  it('throws a clean error for gibberish or non-Indian cities (never Delhi)', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          results: [
            { name: 'Paris', country_code: 'FR', latitude: 48.8566, longitude: 2.3522 },
          ],
        }),
      });

    vi.stubGlobal('fetch', fetchMock);

    await expect(getLiveAqiForCity('Paris')).rejects.toThrow(
      'Could not find location "Paris". Please enter a valid Indian city.'
    );
  });
});

describe('GET /api/cities Autocomplete Route Handler', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('returns empty array for queries with length < 2', async () => {
    const req = new Request('http://localhost:3000/api/cities?q=M');
    const res = await getCities(req);
    const data = await res.json();
    expect(res.status).toBe(200);
    expect(data).toEqual([]);
  });

  it('returns West Bengal coordinates for /api/cities?q=Malda', async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        results: [
          { name: 'Malda', admin1: 'West Bengal', country_code: 'IN', latitude: 25.0045, longitude: 88.1457 },
          { name: 'Maldà', admin1: 'Catalonia', country_code: 'ES', latitude: 41.55, longitude: 1.0333 },
        ],
      }),
    });

    vi.stubGlobal('fetch', fetchMock);

    const req = new Request('http://localhost:3000/api/cities?q=Malda');
    const res = await getCities(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.length).toBe(1);
    expect(data[0].name).toBe('Malda');
    expect(data[0].state).toBe('West Bengal');
    expect(data[0].latitude).toBe(25.0045);
    expect(data[0].longitude).toBe(88.1457);
  });
});

describe('POST /api/analyze Route Handler', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('rejects invalid payloads with 400', async () => {
    const req = new Request('http://localhost:3000/api/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ city: 'A', persona: 'parent' }),
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it('returns 404 when an unknown non-Indian city is requested', async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => ({ results: [] }),
    });

    vi.stubGlobal('fetch', fetchMock);

    const req = new Request('http://localhost:3000/api/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        city: 'NonExistentCity12345',
        persona: 'parent',
      }),
    });

    const res = await POST(req);
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.error).toContain('Could not find location');
  });

  it('returns 200 with live AQI and Gemini guidance', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          results: [{ name: 'Noida', admin1: 'Uttar Pradesh', country_code: 'IN', latitude: 28.53, longitude: 77.39 }],
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          current: { pm2_5: 195, pm10: 290, time: '2026-11-20T12:15' },
        }),
      });

    vi.stubGlobal('fetch', fetchMock);
    vi.spyOn(geminiService, 'generatePersonalizedGuidance').mockResolvedValueOnce(MOCK_GUIDANCE);

    const req = new Request('http://localhost:3000/api/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        city: 'Noida',
        persona: 'parent',
        hasAirPurifier: false,
        plannedActivity: 'Evening park play at 5 PM',
      }),
    });

    const res = await POST(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.metrics.city).toBe('Noida');
    expect(body.metrics.category).toBe('Very Poor');
    expect(body.guidance.routine_planner.evening.why).toBeTruthy();
  });
});
