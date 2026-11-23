# Security Architecture & Policies — VayuGuide

VayuGuide processes live public environmental telemetry and user routine preferences. This document specifies the multi-layered security controls implemented across the codebase.

---

### 1. Sliding-Window IP Rate Limiting
* **Mechanism:** In `src/backend/lib/rate-limit.ts`, `RateLimiter` manages in-memory token buckets mapped to client IP addresses extracted via `getClientIp` (`x-forwarded-for`).
* **Thresholds:**
  * Single analysis endpoint (`/api/analyze`): Max 30 requests per minute per IP.
  * Comparison endpoint (`/api/compare`): Max 20 requests per minute per IP.
* **Memory Protection:** Internal map size is bounded to 500 active IP entries with automatic pruning of expired records to prevent memory exhaustion attacks.

---

### 2. Prompt Injection Isolation via XML Boundaries
* **Threat:** User-supplied `plannedActivity` strings could attempt to override system instructions or alter AQI severity reporting.
* **Countermeasures (`src/backend/services/gemini.service.ts`):**
  1. Characters `<` and `>` are stripped (`replace(/[<>]/g, '')`).
  2. Input is trimmed and hard-capped to `MAX_ACTIVITY_LENGTH = 200` characters.
  3. The sanitized value is explicitly isolated inside `<user_planned_activity>` tags with strict system instructions directing the model to treat the content solely as inert routine context.

---

### 3. Input Validation & SSRF Prevention
* **Zod Schemas (`src/backend/validators/schemas.ts`):** All incoming HTTP requests validate against strict schemas (`AnalyzeRequestSchema`, `CompareRequestSchema`). Extra properties are stripped, and latitude/longitude ranges are bounded.
* **Geocoding Isolation:** User-supplied city queries in `resolveIndianLocation` filter strictly on `country_code === 'IN'`, rejecting non-Indian or arbitrary hostname payloads.

---

### 4. Secret Isolation & Zero-Leakage Architecture
* **Server-Only Secrets:** `GEMINI_API_KEY` and optional `WAQI_API_TOKEN` are accessed strictly within backend server code (`process.env.*`). No secrets use the `NEXT_PUBLIC_` prefix.
* **Automated Auditing:** Pre-commit and CI scripts run `node scripts/secret-audit.js`, which scans the entire workspace and staged git diffs against known Google and WAQI credential entropy patterns.

---

### 5. Sanitized Error Propagation
* **Error Sanitization (`src/backend/lib/api-error.ts`):** `handleApiError` catches all unhandled exceptions, logs full stack traces server-side, and returns sanitized, generic 500 error messages to clients to prevent internal implementation leaks.
