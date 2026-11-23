import { NextResponse } from 'next/server';
import { AnalyzeRequestSchema } from '@/backend/validators/schemas';
import { getLiveAqiForCity } from '@/backend/services/aqi.service';
import { generatePersonalizedGuidance } from '@/backend/services/gemini.service';
import { AssistantResponse } from '@/shared/types/aqi';
import { RateLimiter, getClientIp } from '@/backend/lib/rate-limit';
import { handleApiError } from '@/backend/lib/api-error';

export const maxDuration = 60;

const MAX_ANALYZE_REQUESTS_PER_MINUTE = 30;
const limiter = new RateLimiter();

export async function POST(request: Request) {
  const clientIp = getClientIp(request);

  if (!limiter.check(clientIp, MAX_ANALYZE_REQUESTS_PER_MINUTE)) {
    return NextResponse.json(
      { error: 'Rate limit exceeded. Please wait a moment before trying again.' },
      { status: 429 }
    );
  }

  try {
    const body = await request.json().catch(() => null);
    const parsed = AnalyzeRequestSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || 'Invalid request payload.' },
        { status: 400 }
      );
    }

    const profile = parsed.data;
    const metrics = await getLiveAqiForCity(profile.city, profile.latitude, profile.longitude);
    const guidance = await generatePersonalizedGuidance(metrics, profile);

    const payload: AssistantResponse = { metrics, guidance };
    return NextResponse.json(payload, { status: 200 });
  } catch (error) {
    return handleApiError(
      error,
      'Analyze',
      'Unable to analyze air quality. Please verify the city name or try again later.'
    );
  }
}
