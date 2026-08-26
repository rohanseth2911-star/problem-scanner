/**
 * Checks a real API-SPORTS key against every endpoint the app uses, one call
 * each, and prints what came back next to what the adapter expects.
 *
 * The adapter's mappers have never been run against a live key, so the first
 * real contact will find mismatches. This turns that into a single command and
 * a single block of output to paste back, instead of a guessing game.
 *
 *   npm run probe
 *
 * Prints ONLY field names and shapes — never the key, and never full payloads.
 */

const KEY = process.env.SPORTS_API_KEY;

if (!KEY) {
  console.error('\nSPORTS_API_KEY is not set.');
  console.error('Put it in courtside/.env as:  SPORTS_API_KEY=your_key_here\n');
  process.exit(1);
}

const CHECKS = [
  { league: 'nba', host: 'https://v1.basketball.api-sports.io', path: '/teams', params: { league: '12', season: '2024-2025' }, expects: ['id', 'name', 'code'] },
  { league: 'nba', host: 'https://v1.basketball.api-sports.io', path: '/games', params: { live: 'all' }, expects: ['id', 'date', 'teams', 'scores', 'status'] },
  { league: 'epl', host: 'https://v3.football.api-sports.io', path: '/teams', params: { league: '39', season: '2024' }, expects: ['team', 'venue'] },
  { league: 'epl', host: 'https://v3.football.api-sports.io', path: '/fixtures', params: { live: 'all' }, expects: ['fixture', 'teams', 'goals'] },
  { league: 'nfl', host: 'https://v1.american-football.api-sports.io', path: '/teams', params: { league: '1', season: '2024' }, expects: ['id', 'name'] },
  { league: 'nfl', host: 'https://v1.american-football.api-sports.io', path: '/injuries', params: { team: '1' }, expects: ['player', 'status'] },
];

const shapeOf = (value: unknown, depth = 0): string => {
  if (value === null) return 'null';
  if (Array.isArray(value)) return value.length ? `[${shapeOf(value[0], depth + 1)}]` : '[]';
  if (typeof value === 'object') {
    if (depth >= 2) return '{…}';
    const keys = Object.keys(value as object);
    return `{ ${keys.slice(0, 10).join(', ')}${keys.length > 10 ? ', …' : ''} }`;
  }
  return typeof value;
};

console.log('\nProbing API-SPORTS with your key. One call per endpoint.\n');

let failures = 0;

for (const check of CHECKS) {
  const url = new URL(check.path, check.host);
  for (const [k, v] of Object.entries(check.params)) url.searchParams.set(k, v);
  const label = `${check.league.toUpperCase().padEnd(5)} ${check.path.padEnd(11)}`;

  try {
    const response = await fetch(url, { headers: { 'x-apisports-key': KEY } });

    if (response.status === 401 || response.status === 403) {
      console.log(`${label} AUTH FAILED (${response.status})`);
      console.log('        → key rejected. If you signed up through RapidAPI rather than');
      console.log('          api-sports.io directly, the header must be x-rapidapi-key.\n');
      failures++;
      continue;
    }

    const body = (await response.json()) as { errors?: unknown; results?: number; response?: unknown };

    // API-SPORTS returns HTTP 200 with a populated `errors` object on failure.
    const errors = body.errors;
    const hasErrors = errors && (Array.isArray(errors) ? errors.length > 0 : Object.keys(errors).length > 0);
    if (hasErrors) {
      console.log(`${label} REJECTED — ${JSON.stringify(errors)}`);
      failures++;
      continue;
    }

    const rows = body.response;
    const first = Array.isArray(rows) ? rows[0] : rows;

    if (first === undefined) {
      console.log(`${label} OK but empty (results=${body.results ?? 0})`);
      console.log('        → not necessarily a problem: "live" endpoints are empty when');
      console.log('          nothing is being played, and seasons roll over.\n');
      continue;
    }

    const keys = typeof first === 'object' && first !== null ? Object.keys(first) : [];
    const missing = check.expects.filter((k) => !keys.includes(k));

    console.log(`${label} OK (${body.results ?? 0} rows)`);
    console.log(`        got      ${shapeOf(first)}`);
    if (missing.length > 0) {
      console.log(`        MISSING  ${missing.join(', ')}  ← adapter expects these`);
      failures++;
    }
    console.log('');
  } catch (error) {
    console.log(`${label} NETWORK ERROR — ${error instanceof Error ? error.message : String(error)}\n`);
    failures++;
  }
}

console.log(
  failures === 0
    ? 'Everything matched. The adapter should work as written.\n'
    : `${failures} mismatch(es) above. Paste this whole output back and they can be fixed.\n`,
);
