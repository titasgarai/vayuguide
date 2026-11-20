# Implementation & Verification Plan — VayuGuide

## Milestone 1: Clean Modular Scaffolding
- [x] Separate `src/frontend/`, `src/backend/`, `src/shared/`, `src/app/`, `docs/`, `tests/`, `scripts/`.
- [x] Configure Next.js 15 standalone build, Tailwind CSS (`pangram.com` tokens), Vitest, ESLint, GitHub Actions CI, and Cloud Run Dockerfile.

## Milestone 2: Environment & Verification Gate
- [x] Capture `GEMINI_API_KEY` (and optional `WAQI_API_TOKEN`) into `.env.local`.
- [x] Run `npm install && npm run verify` with zero errors.

## Milestone 3: Live Integration & Smoke Verification
- [x] Start local server and run `npm run smoke -- http://localhost:3000`.
- [x] Confirm live telemetry, IST timestamps, pan-India fallback (Malda), and side-by-side persona differentiation (Delhi Parent vs. Commuter).

