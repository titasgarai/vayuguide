# Architecture Decision Records (ADRs) — VayuGuide

This document records the foundational architectural decisions governing VayuGuide's live air quality telemetry, model fallback, caching, and evaluation pipeline.

---

### ADR-001: Coordinate-First Telemetry with 50 km Haversine Fallback Guard
* **Context:** WAQI station names can be ambiguous across Indian states (e.g., stations named after political figures rather than districts). Additionally, rural towns like Malda lack immediate WAQI physical monitors.
* **Decision:** Geocode Indian queries first to exact latitude/longitude coordinates via Open-Meteo, then query WAQI by `geo:lat;lon`. Calculate the Haversine distance (`EARTH_RADIUS_KM = 6371`) between user coordinates and the returned station. If `distanceKm > MAX_WAQI_DISTANCE_KM` (50 km) or WAQI fails, fall back automatically to Open-Meteo CAMS atmospheric model grid.
* **Consequence:** Guarantees zero out-of-state station contamination (e.g., Malda never receives Delhi telemetry).

---

### ADR-002: Deterministic In-App CPCB NAQI Sub-Index Calculation
* **Context:** Open-Meteo provides raw PM2.5 and PM10 concentrations (µg/m³) rather than Indian CPCB NAQI values.
* **Decision:** Implement authentic Indian Central Pollution Control Board (CPCB) breakpoint tables (`PM25_BREAKPOINTS`, `PM10_BREAKPOINTS`) and linear interpolation (`subIndex`) directly in `src/backend/lib/naqi.ts`.
* **Consequence:** Guarantees deterministic, reproducible NAQI numbers across all 6 qualitative severity tiers (Good through Severe).

---

### ADR-003: Bounded In-Memory TtlCache & Sliding-Window RateLimiter
* **Context:** Free-tier external weather APIs and serverless cold starts require lightweight, zero-dependency caching and rate limiting without requiring external Redis instances.
* **Decision:** Implement `TtlCache<T>` with a 15-minute TTL (`AQI_CACHE_TTL_MS = 15 * 60 * 1000`) and a strict 200-item entry cap with FIFO pruning. Implement `RateLimiter` with rolling 60-second windows (30 req/min for analyze, 20 req/min for compare) and 500-IP capacity capping.
* **Consequence:** Minimizes upstream API consumption while protecting serverless compute from abusive loops.

---

### ADR-004: Parallel Dual-Persona Analysis via Promise.all
* **Context:** The side-by-side persona comparison requires two personalized AI recommendations for the exact same environmental telemetry.
* **Decision:** Fetch environmental telemetry exactly once via `getLiveAqiForCity`, then invoke `generatePersonalizedGuidance` concurrently using `Promise.all([guidanceA, guidanceB])`.
* **Consequence:** Cuts comparison latency in half, ensuring peak concurrency of 2 calls to Gemini without redundant telemetry network roundtrips.

---

### ADR-005: Extended Serverless Function Timeout (maxDuration = 60)
* **Context:** Under peak upstream load, AI generation and fallback atmospheric telemetry can occasionally exceed default 15-second serverless execution limits.
* **Decision:** Set `export const maxDuration = 60` in Next.js App Router route handlers.
* **Consequence:** Prevents 504 Gateway Timeouts during cold starts or transient Gemini demand spikes.
