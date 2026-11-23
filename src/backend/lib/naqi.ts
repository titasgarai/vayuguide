/**
 * CPCB (Central Pollution Control Board) NAQI breakpoint models and Indian Standard Time formatting.
 */

import { LiveAqiMetrics } from '@/shared/types/aqi';

export type BreakpointRow = [concLo: number, concHi: number, idxLo: number, idxHi: number];

/** Standard CPCB NAQI PM2.5 concentration breakpoints in µg/m³ */
export const PM25_BREAKPOINTS: BreakpointRow[] = [
  [0, 30, 0, 50],
  [30, 60, 51, 100],
  [60, 90, 101, 200],
  [90, 120, 201, 300],
  [120, 250, 301, 400],
  [250, 380, 401, 500],
];

/** Standard CPCB NAQI PM10 concentration breakpoints in µg/m³ */
export const PM10_BREAKPOINTS: BreakpointRow[] = [
  [0, 50, 0, 50],
  [50, 100, 51, 100],
  [100, 250, 101, 200],
  [250, 350, 201, 300],
  [350, 430, 301, 400],
  [430, 510, 401, 500],
];

/**
 * Calculates a single pollutant sub-index via linear interpolation across CPCB breakpoints.
 */
export function subIndex(c: number, bps: BreakpointRow[]): number {
  for (const [cLo, cHi, iLo, iHi] of bps) {
    if (c <= cHi) {
      return Math.round(iLo + ((Math.max(c, cLo) - cLo) * (iHi - iLo)) / (cHi - cLo));
    }
  }
  return 500;
}

/**
 * Maps an Indian NAQI value to its authentic CPCB qualitative category band.
 *
 * @param aqi Integer National Air Quality Index value.
 * @returns CPCB category band.
 */
export function getIndianAqiCategory(aqi: number): LiveAqiMetrics['category'] {
  if (aqi <= 50) return 'Good';
  if (aqi <= 100) return 'Satisfactory';
  if (aqi <= 200) return 'Moderate';
  if (aqi <= 300) return 'Poor';
  if (aqi <= 400) return 'Very Poor';
  return 'Severe';
}

/**
 * Computes the official Indian NAQI from PM2.5 and PM10 concentrations using CPCB breakpoints.
 * The composite index is the maximum of the calculated pollutant sub-indices.
 *
 * @param pm25 PM2.5 concentration in µg/m³.
 * @param pm10 PM10 concentration in µg/m³.
 * @returns Composite AQI value and primary pollutant.
 */
export function computeNaqi(
  pm25: number,
  pm10: number
): { aqi: number; primaryPollutant: string } {
  const s25 = pm25 > 0 ? subIndex(pm25, PM25_BREAKPOINTS) : 0;
  const s10 = pm10 > 0 ? subIndex(pm10, PM10_BREAKPOINTS) : 0;
  const aqi = Math.max(s25, s10, 0);
  const primaryPollutant = s25 >= s10 ? 'PM2.5' : 'PM10';
  return { aqi, primaryPollutant };
}

/**
 * Formats an ISO date string or timestamp into human-readable Indian Standard Time (IST).
 * Automatically compensates for offset-less date strings from Open-Meteo.
 *
 * @param rawIsoOrDate ISO-8601 string or date representation.
 * @returns Formatted timestamp string appended with 'IST'.
 */
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
