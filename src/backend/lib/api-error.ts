/**
 * Shared API error handler mapping Zod errors, location resolution errors, and unexpected rejections.
 */

import { NextResponse } from 'next/server';
import { ZodError } from 'zod';
import { LocationNotFoundError } from './geo';

/**
 * Formats caught API errors into consistent HTTP responses.
 *
 * @param error Caught error object or exception.
 * @param context Name of the endpoint or service for logging context.
 * @param fallbackMessage User-safe error description for 500 status codes.
 * @returns NextResponse with appropriate status code and JSON error payload.
 */
export function handleApiError(
  error: unknown,
  context: string,
  fallbackMessage: string = 'An unexpected error occurred. Please try again later.'
): NextResponse {
  console.error(`[${context} API Error]:`, error);

  if (error instanceof ZodError) {
    return NextResponse.json(
      { error: error.issues[0]?.message || 'Invalid request payload.' },
      { status: 400 }
    );
  }

  if (error instanceof LocationNotFoundError) {
    return NextResponse.json({ error: error.message }, { status: 404 });
  }

  const message = error instanceof Error ? error.message : String(error);
  if (message.includes('Could not find location') || message.includes('valid Indian city')) {
    return NextResponse.json({ error: message }, { status: 404 });
  }

  return NextResponse.json({ error: fallbackMessage }, { status: 500 });
}
