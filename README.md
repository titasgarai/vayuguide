# VayuGuide — Urban Air Quality Assistant

> **PromptWars Virtual · Challenge 6**  
> Real-time pan-India air quality telemetry paired with Gemini 2.5 Flash to deliver calm, justified, low-emission daily routines for every household.

[![Verify VayuGuide](https://github.com/titasgarai/vayuguide/actions/workflows/verify.yml/badge.svg)](https://github.com/titasgarai/vayuguide/actions/workflows/verify.yml)
[![Live Demo](https://img.shields.io/badge/Live_Demo-Vercel_Production-15502E?style=for-the-badge)](https://vayuguide.vercel.app)
[![Demo Video](https://img.shields.io/badge/Video_Walkthrough-Watch_Now-1A4039?style=for-the-badge)](https://YOUR-PUBLIC-VIDEO-URL)
[![LinkedIn Post](https://img.shields.io/badge/Thought_Process-LinkedIn_Post-0a66c2?style=for-the-badge)](https://YOUR-LINKEDIN-POST-URL)

---

## Why VayuGuide?

Standard AQI apps stop at a red number. VayuGuide translates **verified, real-time Indian station telemetry** into actionable, persona-specific plans—explaining **why** each step matters for your household and offering zero-cost indoor hacks plus low-emission swaps.

* **Zero Hardcoded or LLM-Guessed Data:** Every AQI, PM2.5, and PM10 reading is fetched live at request time from `src/backend/services/aqi.service.ts` with station attribution and exact **IST timestamps**.
* **Pan-India Coverage:** Queries **WAQI / CPCB** live monitoring stations first and falls back automatically to **Open-Meteo Geocoding + Air Quality API** (prioritizing `country_code: IN`), ensuring tier-2 and tier-3 cities like Malda or Asansol never fail.
* **Side-by-Side Persona Compare Mode:** Fetches live city telemetry *once* and runs two **Gemini 2.5 Flash** calls concurrently (`Promise.all`) so evaluators can inspect how identical air quality produces tailored plans for two different households.
* **Hardened for Production:** Guarded by Zod input validation, GitHub Actions CI (`lint`, `typecheck`, `vitest`, `build`), and **Google Cloud Secret Manager** on Cloud Run (`asia-south1`).

---

## Evaluator Quick-Test Guide

### 1. Fast UI Walkthrough (Live App)
1. **Single Household Plan (1-Click Presets):** Click **Delhi · Parent (2 Kids)**, **Kolkata · Daily Commuter**, or **Mumbai · Senior Citizen** to verify live AQI badges, data sources, IST timestamps, and mandatory **"Why"** justifications.
2. **Side-by-Side Persona Compare:** Switch to the **Compare Two Personas** tab and click **Compare Side-by-Side** (defaults to Delhi: *Parent with Children* vs. *Daily Commuter*) to verify distinct plans grounded in identical station readings.
3. **Pan-India Non-Metro Fallback:** Return to **Single Household Plan**, enter **Malda** (or any Indian town), select **Senior Citizen**, toggle **HEPA air purifier**, and submit to verify Open-Meteo fallback and purifier-specific advice.

### 2. API Verification via `curl`
Replace `BASE_URL` with your deployed Cloud Run URL (or `http://localhost:3000`):

```bash
# Single Household Plan (Delhi — Parent, no air purifier)
curl -X POST https://vayuguide.vercel.app/api/analyze \
  -H "Content-Type: application/json" \
  -d '{"city":"Delhi","persona":"parent","hasAirPurifier":false,"plannedActivity":"Evening outdoor park play at 5 PM"}'

# Side-by-Side Persona Compare (Delhi — Parent vs. Daily Commuter)
curl -X POST https://vayuguide.vercel.app/api/compare \
  -H "Content-Type: application/json" \
  -d '{"city":"Delhi","profileA":{"persona":"parent","hasAirPurifier":false,"plannedActivity":"Evening park play at 5 PM"},"profileB":{"persona":"commuter","hasAirPurifier":false,"plannedActivity":"Morning office commute by two-wheeler"}}'
```

---

## Architecture & Directory Structure

```text
vayuguide/
├── .github/workflows/verify.yml          # CI: ESLint, TypeScript, Vitest, Production Build
├── docs/                                 # Engineering plan, agent rules, design tokens, asset guide
├── scripts/                              # Automated 6-point live endpoint smoke test
├── src/
│   ├── app/                              # Next.js 15 App Router pages & thin /api/analyze + /api/compare routes
│   ├── backend/
│   │   ├── services/aqi.service.ts       # Dual-source WAQI/Open-Meteo pipeline + 15-min cache + CPCB bands
│   │   ├── services/gemini.service.ts    # Gemini 2.5 Flash client with strict responseSchema JSON output
│   │   └── validators/schemas.ts         # Zod runtime payload schemas
│   ├── frontend/components/              # Editorial UI components (pangram.com-inspired design system)
│   └── shared/types/aqi.ts               # Shared TypeScript contracts
├── tests/                                # Vitest unit & route handler tests (aqi.test.ts, compare.test.ts)
└── Dockerfile                            # Multi-stage Node 20 standalone Cloud Run container
```

---

## Vibe Coding Split: GenAI vs. Custom Engineering

| Layer | Handled By | Scope |
| :--- | :--- | :--- |
| **AI Synthesis & Scaffolding** | **Gemini 2.5 Flash + Antigravity IDE** | Persona-tailored Morning/Afternoon/Evening routines, purifier-aware indoor hacks, sustainable swaps with direct impact, and modular UI scaffolding from `docs/DESIGN.md`. |
| **Deterministic Backend & Ops** | **Custom Engineering** | Dual-source WAQI-to-Open-Meteo fallback, 15-minute server cache, 6-tier Indian CPCB NAQI banding, Zod validation, parallel `/api/compare` orchestration, Vitest + live smoke tests, GitHub Actions CI, and Secret Manager IAM setup. |

---

## Local Setup & Automated Verification

### Prerequisites
* Node.js `20+`
* A Google Gemini API key from [Google AI Studio](https://aistudio.google.com/apikey)
* *(Optional)* A WAQI token from [aqicn.org](https://aqicn.org/data-platform/token/) — automatically falls back to Open-Meteo if omitted.

### Run Locally
```bash
npm install
cp .env.example .env.local
# Add GEMINI_API_KEY inside .env.local (never commit this file)

# Run full static + unit verification gate (ESLint, tsc --noEmit, Vitest, Next.js build)
npm run verify

# Start local dev server
npm run dev
```

### Live Smoke Test (6-Point E2E Check)
Validates homepage reachability, Delhi (*Parent*), Kolkata (*Commuter*), Malda (*Pan-India Fallback*), Delhi `/api/compare` persona differentiation, and Zod HTTP `400` rejection:

```bash
# Against local server
npm run smoke -- http://localhost:3000

# Against deployed Vercel Production service
npm run smoke -- https://vayuguide.vercel.app
```

---

## Production Deployment (Google Cloud Run + Secret Manager)

VayuGuide ships as a standalone Next.js 15 container listening on `PORT=8080` in `asia-south1` (Mumbai), with `GEMINI_API_KEY` mounted securely from **Google Cloud Secret Manager**—zero plain-text keys in environment variables or source control.

```bash
# 1. Enable required Google Cloud APIs
gcloud services enable run.googleapis.com cloudbuild.googleapis.com artifactregistry.googleapis.com secretmanager.googleapis.com

# 2. Store GEMINI_API_KEY in Secret Manager without a trailing newline
printf '%s' 'YOUR_GEMINI_API_KEY' | gcloud secrets create GEMINI_API_KEY \
  --replication-policy="automatic" \
  --data-file=-

# 3. Grant least-privilege read access to the Cloud Run runtime service account
PROJECT_ID=$(gcloud config get-value project)
PROJECT_NUMBER=$(gcloud projects describe "$PROJECT_ID" --format='value(projectNumber)')
gcloud secrets add-iam-policy-binding GEMINI_API_KEY \
  --member="serviceAccount:${PROJECT_NUMBER}-compute@developer.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"

# 4. Build and deploy directly from source
gcloud run deploy vayuguide \
  --source . \
  --region asia-south1 \
  --port 8080 \
  --memory 512Mi \
  --allow-unauthenticated \
  --set-secrets="GEMINI_API_KEY=GEMINI_API_KEY:latest"
```

---

## License

Built for **PromptWars Virtual · Challenge 6 (Hack2skill)**.
