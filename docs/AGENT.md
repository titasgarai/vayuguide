# Antigravity Agent Operating Rules — VayuGuide

1. **ZERO Hardcoded AQI Data:** All environmental metrics must originate from live API calls in `src/backend/services/aqi.service.ts`.
2. **Strict Layer Separation:** Keep server-only API calls and Zod validators inside `src/backend/`, UI components inside `src/frontend/`, and shared contracts inside `src/shared/`.
3. **Secret Isolation:** Never expose `GEMINI_API_KEY` or `WAQI_API_TOKEN` via `NEXT_PUBLIC_`.
4. **Mandatory Justification:** Every recommendation rendered in UI must show its `why` or `direct_impact` field.
5. **Verification Gate:** Always validate changes with `npm run verify`.

