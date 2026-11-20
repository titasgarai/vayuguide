#!/usr/bin/env node

const baseUrl = (process.argv[2] || 'http://localhost:3000').replace(/\/$/, '');

let pass = 0;
let fail = 0;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function runCheck(name, method, path, payload, expectedStatus, validator) {
  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      const options = {
        method,
        headers: {},
        signal: AbortSignal.timeout(90000),
      };

      if (method === 'POST') {
        options.headers['Content-Type'] = 'application/json';
        options.body = payload;
      }

      const res = await fetch(`${baseUrl}${path}`, options);
      const text = await res.text();

      if ((res.status === 429 || res.status === 500 || res.status === 504) && attempt === 1) {
        console.log(`[RETRY] ${name} — Server responded with HTTP ${res.status}, retrying in 3s...`);
        await sleep(3000);
        continue;
      }

      if (res.status !== expectedStatus) {
        console.log(`[FAIL] ${name} — Expected HTTP ${expectedStatus}, got ${res.status}`);
        fail++;
        return;
      }

      try {
        const out = validator(text);
        console.log(`[PASS] ${name} (HTTP ${res.status}) — ${out}`);
        pass++;
        return;
      } catch (err) {
        console.log(`[FAIL] ${name} — ${err.message}`);
        fail++;
        return;
      }
    } catch (error) {
      if (attempt === 1) {
        await sleep(1000);
        continue;
      }
      console.log(`[FAIL] ${name} — Connection error: ${error.message}`);
      fail++;
      return;
    }
  }
}

const analyzeValidator = (raw) => {
  const d = JSON.parse(raw);
  if (typeof d.metrics?.aqi !== 'number') throw new Error('Missing numeric AQI');
  if (!String(d.metrics?.timestamp || '').includes('IST')) throw new Error('Missing IST timestamp');
  if (!d.guidance?.routine_planner?.evening?.why) throw new Error('Missing why justification');
  return `NAQI ${d.metrics.aqi} (${d.metrics.category}) | ${d.metrics.source} | ${d.metrics.timestamp}`;
};

const compareValidator = (raw) => {
  const d = JSON.parse(raw);
  if (d.guidanceA.headline_summary.trim() === d.guidanceB.headline_summary.trim()) {
    throw new Error('Identical persona outputs');
  }
  return `Shared ${d.metrics.city} NAQI ${d.metrics.aqi} | Distinct persona plans verified`;
};

async function main() {
  await runCheck(
    'Homepage renders VayuGuide',
    'GET',
    '/',
    '',
    200,
    (text) => {
      if (!text.includes('VayuGuide')) throw new Error('Missing title');
      return 'OK';
    }
  );

  await sleep(3500);

  await runCheck(
    '/api/analyze — Delhi (Parent)',
    'POST',
    '/api/analyze',
    JSON.stringify({
      city: 'Delhi',
      persona: 'parent',
      hasAirPurifier: false,
      plannedActivity: 'Evening park play at 5 PM',
    }),
    200,
    analyzeValidator
  );

  await sleep(3500);

  await runCheck(
    '/api/analyze — Kolkata (Commuter)',
    'POST',
    '/api/analyze',
    JSON.stringify({
      city: 'Kolkata',
      persona: 'commuter',
      hasAirPurifier: false,
      plannedActivity: 'Morning office commute by two-wheeler',
    }),
    200,
    analyzeValidator
  );

  await sleep(3500);

  await runCheck(
    '/api/analyze — Malda (Pan-India Fallback)',
    'POST',
    '/api/analyze',
    JSON.stringify({
      city: 'Malda',
      persona: 'senior',
      hasAirPurifier: true,
      plannedActivity: 'Early morning walk at 6:30 AM',
    }),
    200,
    analyzeValidator
  );

  await sleep(3500);

  await runCheck(
    '/api/compare — Delhi (Parent vs Commuter)',
    'POST',
    '/api/compare',
    JSON.stringify({
      city: 'Delhi',
      profileA: {
        persona: 'parent',
        hasAirPurifier: false,
        plannedActivity: 'Evening park play at 5 PM',
      },
      profileB: {
        persona: 'commuter',
        hasAirPurifier: false,
        plannedActivity: 'Morning office commute by two-wheeler',
      },
    }),
    200,
    compareValidator
  );

  await sleep(1000);

  await runCheck(
    '/api/analyze — Zod 400 Guard',
    'POST',
    '/api/analyze',
    JSON.stringify({
      city: 'Delhi',
      persona: 'invalid_role',
    }),
    400,
    (text) => {
      const d = JSON.parse(text);
      if (!d.error) throw new Error('Missing error');
      return d.error;
    }
  );

  console.log(`Summary: ${pass} passed, ${fail} failed`);
  if (fail > 0) {
    process.exit(1);
  }
}

main();
