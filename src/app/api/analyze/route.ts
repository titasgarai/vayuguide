import { NextResponse } from 'next/server';
import { AnalyzeRequestSchema } from '@/backend/validators/schemas';
import { getLiveAqiForCity } from '@/backend/services/aqi.service';
import { generatePersonalizedGuidance } from '@/backend/services/gemini.service';
import { AssistantResponse } from '@/shared/types/aqi';

export const maxDuration = 60;

// In-memory sliding rate-limiter: max 30 requests per IP per minute
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT_WINDOW_MS = 60 * 1000;
const MAX_REQUESTS_PER_WINDOW = 30;

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);

  if (rateLimitMap.size > 500) {
    const oldestKey = rateLimitMap.keys().next().value;
    if (oldestKey) rateLimitMap.delete(oldestKey);
  }

  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return true;
  }

  if (entry.count >= MAX_REQUESTS_PER_WINDOW) {
    return false;
  }

  entry.count += 1;
  return true;
}

export async function POST(request: Request) {
  const forwarded = request.headers.get('x-forwarded-for') || 'unknown-client';
  const clientIp = forwarded.split(',')[0].trim();

  if (!checkRateLimit(clientIp)) {
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
    console.error('[Analyze API Error]:', error);
    const message = error instanceof Error ? error.message : '';

    if (message.includes('Could not find location') || message.includes('valid Indian city')) {
      return NextResponse.json({ error: message }, { status: 404 });
    }

    return NextResponse.json(
      { error: 'Unable to analyze air quality. Please verify the city name or try again later.' },
      { status: 500 }
    );
  }
}
