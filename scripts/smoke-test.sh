#!/usr/bin/env bash
set -euo pipefail

if [ $# -lt 1 ]; then
  echo "Usage: npm run smoke -- <BASE_URL>"
  exit 1
fi

BASE_URL="${1%/}"
PASS=0
FAIL=0

run_check() {
  local name="$1"
  local method="$2"
  local path="$3"
  local payload="$4"
  local expected_status="$5"
  local validator_js="$6"

  local raw_response=""
  local http_code=""

  for attempt in 1 2; do
    if [ "$method" = "GET" ]; then
      raw_response=$(curl -sS --max-time 60 -w "\n%{http_code}" "${BASE_URL}${path}")
    else
      raw_response=$(curl -sS --max-time 60 -w "\n%{http_code}" -X "$method" -H "Content-Type: application/json" -d "$payload" "${BASE_URL}${path}")
    fi

    http_code=$(echo "$raw_response" | tail -n1)
    if [ "$http_code" = "429" ] && [ "$attempt" -lt 2 ]; then
      echo "Rate limited (429), waiting 2s before retry..."
      sleep 2
      continue
    fi
    break
  done

  local body
  body=$(echo "$raw_response" | sed '$d')

  if [ "$http_code" != "$expected_status" ]; then
    echo "[FAIL] ${name} — Expected HTTP ${expected_status}, got ${http_code}"
    FAIL=$((FAIL + 1))
    return
  fi

  local out
  if out=$(printf '%s' "$body" | node -e "$validator_js" 2>&1); then
    echo "[PASS] ${name} (HTTP ${http_code}) — ${out}"
    PASS=$((PASS + 1))
  else
    echo "[FAIL] ${name} — ${out}"
    FAIL=$((FAIL + 1))
  fi
}

ANALYZE_VALIDATOR="
  const d = JSON.parse(require('fs').readFileSync(0, 'utf8'));
  if (typeof d.metrics?.aqi !== 'number') throw new Error('Missing numeric AQI');
  if (!String(d.metrics?.timestamp || '').includes('IST')) throw new Error('Missing IST timestamp');
  if (!d.guidance?.routine_planner?.evening?.why) throw new Error('Missing why justification');
  console.log(\`NAQI \${d.metrics.aqi} (\${d.metrics.category}) | \${d.metrics.source} | \${d.metrics.timestamp}\`);
"

COMPARE_VALIDATOR="
  const d = JSON.parse(require('fs').readFileSync(0, 'utf8'));
  if (d.guidanceA.headline_summary.trim() === d.guidanceB.headline_summary.trim()) throw new Error('Identical persona outputs');
  console.log(\`Shared \${d.metrics.city} NAQI \${d.metrics.aqi} | Distinct persona plans verified\`);
"

run_check "Homepage renders VayuGuide" "GET" "/" "" "200" \
  "if (!require('fs').readFileSync(0,'utf8').includes('VayuGuide')) throw new Error('Missing title'); console.log('OK');"

run_check "/api/analyze — Delhi (Parent)" "POST" "/api/analyze" \
  '{"city":"Delhi","persona":"parent","hasAirPurifier":false,"plannedActivity":"Evening park play at 5 PM"}' "200" "$ANALYZE_VALIDATOR"

run_check "/api/analyze — Kolkata (Commuter)" "POST" "/api/analyze" \
  '{"city":"Kolkata","persona":"commuter","hasAirPurifier":false,"plannedActivity":"Morning office commute by two-wheeler"}' "200" "$ANALYZE_VALIDATOR"

run_check "/api/analyze — Malda (Pan-India Fallback)" "POST" "/api/analyze" \
  '{"city":"Malda","persona":"senior","hasAirPurifier":true,"plannedActivity":"Early morning walk at 6:30 AM"}' "200" "$ANALYZE_VALIDATOR"

run_check "/api/compare — Delhi (Parent vs Commuter)" "POST" "/api/compare" \
  '{"city":"Delhi","profileA":{"persona":"parent","hasAirPurifier":false,"plannedActivity":"Evening park play at 5 PM"},"profileB":{"persona":"commuter","hasAirPurifier":false,"plannedActivity":"Morning office commute by two-wheeler"}}' "200" "$COMPARE_VALIDATOR"

run_check "/api/analyze — Zod 400 Guard" "POST" "/api/analyze" \
  '{"city":"Delhi","persona":"invalid_role"}' "400" \
  "const d = JSON.parse(require('fs').readFileSync(0,'utf8')); if (!d.error) throw new Error('Missing error'); console.log(d.error);"

echo "Summary: ${PASS} passed, ${FAIL} failed"
[ "$FAIL" -eq 0 ]
