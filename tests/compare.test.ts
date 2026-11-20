import { describe, expect, it, vi } from 'vitest';
import * as aqiService from '@/backend/services/aqi.service';
import * as geminiService from '@/backend/services/gemini.service';
import { POST } from '@/app/api/compare/route';
import { AiGuidance, LiveAqiMetrics } from '@/shared/types/aqi';

const MOCK_METRICS: LiveAqiMetrics = {
  city: 'Delhi',
  stationName: 'Anand Vihar, Delhi',
  aqi: 342,
  category: 'Very Poor',
  pm25: 218,
  pm10: 315,
  primaryPollutant: 'PM2.5',
  source: 'WAQI / CPCB Live Feed',
  timestamp: '20 Nov 2026, 6:00 pm IST',
};

function makeGuidance(summary: string, eveningAction: string): AiGuidance {
  return {
    headline_summary: summary,
    risk_level: 'High',
    routine_planner: {
      morning: {
        action: 'Wear an N95 respirator before stepping out.',
        why: 'Winter temperature inversion traps PM2.5 near ground level.',
      },
      afternoon: {
        action: 'Limit outdoor exposure to essential errands only.',
        why: 'PM2.5 remains elevated during winter smog.',
      },
      evening: {
        action: eveningAction,
        why: 'AQI 342 (Very Poor) elevates respiratory irritation risk.',
      },
    },
    indoor_air_hacks: [
      {
        hack: 'Wet-mop floors and seal under-door drafts.',
        why: 'Prevents outdoor PM2.5 infiltration and dust resuspension.',
      },
    ],
    sustainable_alternatives: [
      {
        swap: 'Use Delhi Metro instead of solo two-wheeler trips.',
        direct_impact: 'Cuts personal exposure and eliminates tailpipe emissions.',
      },
    ],
    data_attribution: `Source: ${MOCK_METRICS.source} | Last Updated: ${MOCK_METRICS.timestamp}`,
  };
}

describe('POST /api/compare Route Handler', () => {
  it('fetches live AQI once and executes both Gemini persona calls in parallel', async () => {
    const aqiSpy = vi.spyOn(aqiService, 'getLiveAqiForCity').mockResolvedValueOnce(MOCK_METRICS);

    let activeCalls = 0;
    let peakConcurrency = 0;
    const resolvers: Array<() => void> = [];

    const parentGuidance = makeGuidance(
      'Keep children indoors in Delhi today.',
      'Move 5 PM park play indoors.'
    );
    const commuterGuidance = makeGuidance(
      'Switch to enclosed transit for your Delhi commute.',
      'Avoid evening two-wheeler rides; take the metro.'
    );

    const geminiSpy = vi
      .spyOn(geminiService, 'generatePersonalizedGuidance')
      .mockImplementation((_metrics, profile) => {
        activeCalls += 1;
        peakConcurrency = Math.max(peakConcurrency, activeCalls);

        return new Promise<AiGuidance>((resolve) => {
          resolvers.push(() => {
            activeCalls -= 1;
            resolve(profile.persona === 'parent' ? parentGuidance : commuterGuidance);
          });

          if (resolvers.length === 2) {
            resolvers.forEach((fn) => fn());
          }
        });
      });

    const req = new Request('http://localhost:3000/api/compare', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        city: 'Delhi',
        latitude: 28.6139,
        longitude: 77.209,
        profileA: {
          persona: 'parent',
          hasAirPurifier: false,
          plannedActivity: 'Evening park play at 5 PM',
        },
        profileB: {
          persona: 'commuter',
          hasAirPurifier: true,
          plannedActivity: 'Morning commute via metro',
        },
      }),
    });

    const res = await POST(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(aqiSpy).toHaveBeenCalledTimes(1);
    expect(geminiSpy).toHaveBeenCalledTimes(2);
    expect(peakConcurrency).toBe(2);

    expect(body.metrics.city).toBe('Delhi');
    expect(body.guidanceA.headline_summary).toContain('children');
    expect(body.guidanceB.headline_summary).toContain('transit');
  });

  it('rejects invalid persona slots with 400', async () => {
    const req = new Request('http://localhost:3000/api/compare', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        city: 'Delhi',
        profileA: { persona: 'invalid_role' },
        profileB: { persona: 'commuter' },
      }),
    });

    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it('returns 404 when city is not found in India', async () => {
    vi.spyOn(aqiService, 'getLiveAqiForCity').mockRejectedValueOnce(
      new Error('Could not find location "NowhereLand". Please enter a valid Indian city.')
    );

    const req = new Request('http://localhost:3000/api/compare', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        city: 'NowhereLand',
        profileA: { persona: 'parent' },
        profileB: { persona: 'commuter' },
      }),
    });

    const res = await POST(req);
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.error).toContain('Could not find location');
  });
});
