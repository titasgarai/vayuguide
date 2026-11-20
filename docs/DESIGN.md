# Design System — VayuGuide (Inspired by pangram.com)

## Editorial Color System
Colors are defined as space-separated RGB channel values in `:root` (`src/app/globals.css`) and consumed in `tailwind.config.ts` via `rgb(var(--color) / <alpha-value>)` to ensure native support for Tailwind opacity modifiers (e.g., `text-ink/80`, `bg-canvas/50`, `bg-tint/70`):

- **Canvas:** `rgb(248 247 245)` (`--bg-canvas: 248 247 245`)
- **Surface:** `rgb(255 255 255)` (`--bg-surface: 255 255 255`)
- **Subtle:** `rgb(242 242 242)` (`--bg-subtle: 242 242 242`)
- **Tint:** `rgb(237 244 240)` (`--bg-tint: 237 244 240`)
- **Ink (Primary):** `rgb(20 32 30)` (`--ink-primary: 20 32 30`)
- **Forest (Primary Brand):** `rgb(21 80 46)` (`--brand-primary: 21 80 46`)
- **Pine (Secondary Brand):** `rgb(26 64 57)` (`--brand-secondary: 26 64 57`)
- **Hairline:** `rgb(228 230 227)` (`--border-hairline: 228 230 227`)
- **Border Tint:** `rgb(200 221 210)` (`--border-tint: 200 221 210`)

## Typography
- **Display / Headers:** `Instrument Serif` (editorial gravitas)
- **UI / Body:** `IBM Plex Sans` (clarity and high readability)
- **Telemetry / Timestamps:** `IBM Plex Mono` with `tabular-nums` for precise alignment of air quality readings and timestamps.

## Indian CPCB NAQI Severity Scale
- **Good (0–50):** Emerald
- **Satisfactory (51–100):** Lime
- **Moderate (101–200):** Amber
- **Poor (201–300):** Orange
- **Very Poor (301–400):** Red
- **Severe (401+):** Deep Rose / Maroon

Calculated using authentic Indian CPCB breakpoints from PM2.5 and PM10 sub-indices.
