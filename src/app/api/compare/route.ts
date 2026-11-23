import { NextResponse } from 'next/server';
import { CompareRequestSchema } from '@/backend/validators/schemas';
import { getLiveAqiForCity } from '@/backend/services/aqi.service';
import { generatePersonalizedGuidance } from '@/backend/services/gemini.service';
import { CompareResponse } from '@/shared/types/aqi';
import { RateLimiter, getClientIp } from '@/backend/lib/rate-limit';
import { handleApiError } from '@/backend/lib/api-error';

export const maxDuration = 60;

const MAX_COMPARE_REQUESTS_PER_MINUTE = 20;
const limiter = new RateLimiter();

export async function POST(request: Request) {
  const clientIp = getClientIp(request);

  if (!limiter.check(clientIp, MAX_COMPARE_REQUESTS_PER_MINUTE)) {
    return NextResponse.json(
      { error: 'Rate limit exceeded. Please wait a moment before comparing personas again.' },
      { status: 429 }
    );
  }

  try {
    const body = await request.json().catch(() => null);
    const parsed = CompareRequestSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || 'Invalid comparison payload.' },
        { status: 400 }
      );
    }

    const { city, latitude, longitude, profileA, profileB } = parsed.data;
    const metrics = await getLiveAqiForCity(city, latitude, longitude);

    const [guidanceA, guidanceB] = await Promise.all([
      generatePersonalizedGuidance(metrics, { city, latitude, longitude, ...profileA }),
      generatePersonalizedGuidance(metrics, { city, latitude, longitude, ...profileB }),
    ]);

    const payload: CompareResponse = {
      metrics,
      profileA,
      profileB,
      guidanceA,
      guidanceB,
    };

    return NextResponse.json(payload, { status: 200 });
  } catch (error) {
    return handleApiError(
      error,
      'Compare',
      'Unable to compare air quality plans. Please verify the city name or try again later.'
    );
  }
}
