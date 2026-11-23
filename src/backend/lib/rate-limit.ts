/**
 * Sliding-window in-memory IP rate limiter and client IP extraction utilities.
 */

export const RATE_LIMIT_WINDOW_MS = 60 * 1000;
export const DEFAULT_MAX_IP_ENTRIES = 500;

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

/**
 * Extracts client IP address safely from Request headers.
 */
export function getClientIp(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for') || 'unknown-client';
  return forwarded.split(',')[0].trim();
}

/**
 * Sliding-window in-memory rate limiter per IP address with entry cap pruning.
 */
export class RateLimiter {
  private readonly map = new Map<string, RateLimitEntry>();
  private readonly windowMs: number;
  private readonly maxEntries: number;

  constructor(
    windowMs: number = RATE_LIMIT_WINDOW_MS,
    maxEntries: number = DEFAULT_MAX_IP_ENTRIES
  ) {
    this.windowMs = windowMs;
    this.maxEntries = maxEntries;
  }

  /**
   * Checks whether a request from the given IP is permitted under maxRequests threshold.
   * Increments hit count if allowed.
   *
   * @param ip Client IP address.
   * @param maxRequests Maximum allowable requests within the rolling window.
   * @returns True if allowed, false if rate limit exceeded.
   */
  check(ip: string, maxRequests: number): boolean {
    const now = Date.now();
    const entry = this.map.get(ip);

    if (this.map.size > this.maxEntries) {
      const oldestKey = this.map.keys().next().value;
      if (oldestKey !== undefined) this.map.delete(oldestKey);
    }

    if (!entry || now > entry.resetAt) {
      this.map.set(ip, { count: 1, resetAt: now + this.windowMs });
      return true;
    }

    if (entry.count >= maxRequests) {
      return false;
    }

    entry.count += 1;
    return true;
  }

  reset(): void {
    this.map.clear();
  }
}
