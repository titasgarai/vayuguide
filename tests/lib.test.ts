import { describe, expect, it, vi } from 'vitest';
import { TtlCache } from '@/backend/lib/cache';
import { RateLimiter, getClientIp } from '@/backend/lib/rate-limit';
import { handleApiError } from '@/backend/lib/api-error';
import { LocationNotFoundError } from '@/backend/lib/geo';
import { z } from 'zod';

describe('TtlCache Unit Tests', () => {
  it('stores and retrieves cached items before expiration', () => {
    const cache = new TtlCache<string>(5000, 10);
    cache.set('city:delhi', 'aqi-data');
    expect(cache.get('city:delhi')).toBe('aqi-data');
    expect(cache.has('city:delhi')).toBe(true);
    expect(cache.size).toBe(1);
  });

  it('expires items after TTL has elapsed', () => {
    const cache = new TtlCache<string>(100, 10);
    cache.set('city:temp', 'expired-val', -50);
    expect(cache.get('city:temp')).toBeUndefined();
    expect(cache.has('city:temp')).toBe(false);
  });

  it('evicts oldest entries when reaching maxEntries capacity', () => {
    const cache = new TtlCache<number>(10000, 3);
    cache.set('k1', 1);
    cache.set('k2', 2);
    cache.set('k3', 3);
    expect(cache.size).toBe(3);

    // Adding 4th item should evict k1
    cache.set('k4', 4);
    expect(cache.get('k1')).toBeUndefined();
    expect(cache.get('k2')).toBe(2);
    expect(cache.get('k4')).toBe(4);
    expect(cache.size).toBe(3);
  });

  it('supports delete and clear methods', () => {
    const cache = new TtlCache<string>(5000, 10);
    cache.set('k1', 'v1');
    cache.set('k2', 'v2');
    cache.delete('k1');
    expect(cache.has('k1')).toBe(false);
    cache.clear();
    expect(cache.size).toBe(0);
  });
});

describe('RateLimiter Unit Tests', () => {
  it('allows requests within limit and blocks requests exceeding limit', () => {
    const limiter = new RateLimiter(60000, 100);
    const ip = '192.168.1.1';

    expect(limiter.check(ip, 2)).toBe(true);
    expect(limiter.check(ip, 2)).toBe(true);
    expect(limiter.check(ip, 2)).toBe(false);
  });

  it('resets correctly on demand', () => {
    const limiter = new RateLimiter(60000, 100);
    const ip = '10.0.0.1';

    limiter.check(ip, 1);
    expect(limiter.check(ip, 1)).toBe(false);

    limiter.reset();
    expect(limiter.check(ip, 1)).toBe(true);
  });

  it('extracts client IP from x-forwarded-for header', () => {
    const reqWithHeader = new Request('http://localhost:3000/api/analyze', {
      headers: { 'x-forwarded-for': '203.0.113.195, 70.41.3.18' },
    });
    expect(getClientIp(reqWithHeader)).toBe('203.0.113.195');

    const reqWithoutHeader = new Request('http://localhost:3000/api/analyze');
    expect(getClientIp(reqWithoutHeader)).toBe('unknown-client');
  });
});

describe('handleApiError Unit Tests', () => {
  it('maps ZodError to HTTP 400 with first issue message', async () => {
    const TestSchema = z.object({ city: z.string().min(3, 'City name too short') });
    const result = TestSchema.safeParse({ city: 'a' });
    if (!result.success) {
      const response = handleApiError(result.error, 'TestContext');
      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toBe('City name too short');
    }
  });

  it('maps LocationNotFoundError to HTTP 404', async () => {
    const err = new LocationNotFoundError('Atlantis');
    const response = handleApiError(err, 'TestContext');
    expect(response.status).toBe(404);
    const data = await response.json();
    expect(data.error).toContain('Could not find location "Atlantis"');
  });

  it('maps invalid Indian city errors to HTTP 404', async () => {
    const err = new Error('Could not find location "Tokyo". Please enter a valid Indian city.');
    const response = handleApiError(err, 'TestContext');
    expect(response.status).toBe(404);
    const data = await response.json();
    expect(data.error).toContain('Tokyo');
  });

  it('maps unexpected errors to sanitized HTTP 500 response', async () => {
    const err = new Error('DB connection string leaking password');
    const response = handleApiError(err, 'TestContext', 'Safe fallback message');
    expect(response.status).toBe(500);
    const data = await response.json();
    expect(data.error).toBe('Safe fallback message');
  });
});
