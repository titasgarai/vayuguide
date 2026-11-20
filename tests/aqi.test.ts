import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  computeNaqi,
  formatIstTimestamp,
  getIndianAqiCategory,
  getLiveAqiForCity,
} from '@/backend/services/aqi.service';
import * as geminiService from '@/backend/services/gemini.service';
import { AiGuidanceSchema } from '@/backend/validators/schemas';
import { POST } from '@/app/api/analyze/route';
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

describe('Indian CPCB NAQI Categorizer & Breakpoints', () => {
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
    // 94 µg/m³ PM2.5 is Poor in CPCB (201-300 band)
    const result = computeNaqi(94, 148);
    expect(result.aqi).toBeGreaterThanOrEqual(201);
    expect(result.aqi).toBeLessThanOrEqual(300);
    expect(getIndianAqiCategory(result.aqi)).toBe('Poor');
    expect(result.primaryPollutant).toBe('PM2.5');

    // Good band
    const good = computeNaqi(15, 25);
    expect(good.aqi).toBeLessThanOrEqual(50);
    expect(getIndianAqiCategory(good.aqi)).toBe('Good');
  });

  it('correctly handles offset-less Open-Meteo timestamps without double-offsetting', () => {
    // Open-Meteo returns ISO timestamps without offset for requested timezone Asia/Kolkata
    const raw = '2026-11-20T18:00';
    const formatted = formatIstTimestamp(raw);
    expect(formatted).toContain('6:00');
    expect(formatted).toContain('IST');
    // Ensure it was not shifted 5.5 hours ahead to 23:30 or 11:30 pm
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
        evening: { action: 'Stay inside', why: '' }, // empty why
      },
    };
    const parsed = AiGuidanceSchema.safeParse(invalid);
    expect(parsed.success).toBe(false);
  });
});

describe('Live Pan-India AQI Service & Fallback', () => {
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

  it('falls back to Open-Meteo and prefers Indian (IN) matches when WAQI fails', async () => {
    process.env.WAQI_API_TOKEN = 'test-token';

    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({ ok: true, json: async () => ({ status: 'error' }) })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          results: [
            { name: 'Malda', country_code: 'US', latitude: 40.0, longitude: -74.0 },
            { name: 'Malda', admin1: 'West Bengal', country_code: 'IN', latitude: 25.01, longitude: 88.14 },
          ],
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          current: { pm2_5: 94.4, pm10: 148.2, time: '2026-11-20T12:00' },
        }),
      });

    vi.stubGlobal('fetch', fetchMock);
    const metrics = await getLiveAqiForCity('Malda');

    expect(metrics.stationName).toBe('Malda, West Bengal');
    expect(metrics.aqi).toBeGreaterThanOrEqual(201);
    expect(metrics.category).toBe('Poor');
    expect(metrics.source).toContain('Open-Meteo (CAMS modelled)');
    expect(metrics.isModelled).toBe(true);
    expect(metrics.timestamp).toContain('IST');
  });

  it('caches city readings for 15 minutes', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          results: [{ name: 'Asansol', admin1: 'West Bengal', country_code: 'IN', latitude: 23.68, longitude: 86.95 }],
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          current: { pm2_5: 130, pm10: 210, time: '2026-11-20T12:00' },
        }),
      });

    vi.stubGlobal('fetch', fetchMock);
    const first = await getLiveAqiForCity('Asansol');
    const second = await getLiveAqiForCity('asansol');

    expect(first).toEqual(second);
    expect(fetchMock).toHaveBeenCalledTimes(2);
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
