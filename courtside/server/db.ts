import { DatabaseSync } from 'node:sqlite';

/**
 * Persistence uses Node's built-in SQLite: real SQL, real durability, and no
 * native module to compile. The schema is deliberately Postgres-shaped — swap
 * DatabaseSync for a pg pool and the queries survive unchanged.
 */

const db = new DatabaseSync(process.env.DB_PATH ?? './courtside.db');

db.exec(`
  PRAGMA journal_mode = WAL;

  CREATE TABLE IF NOT EXISTS api_cache (
    key         TEXT PRIMARY KEY,
    endpoint    TEXT NOT NULL,
    payload     TEXT NOT NULL,
    fetched_at  INTEGER NOT NULL,
    expires_at  INTEGER NOT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_api_cache_expiry ON api_cache(expires_at);

  CREATE TABLE IF NOT EXISTS api_call_log (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    endpoint    TEXT NOT NULL,
    outcome     TEXT NOT NULL,          -- hit | miss | error
    detail      TEXT,
    created_at  INTEGER NOT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_call_log_time ON api_call_log(created_at);

  CREATE TABLE IF NOT EXISTS game_events (
    id          TEXT PRIMARY KEY,
    game_id     TEXT NOT NULL,
    type        TEXT NOT NULL,
    headline    TEXT NOT NULL,
    detail      TEXT NOT NULL,
    dedupe_key  TEXT NOT NULL UNIQUE,
    home_score  INTEGER NOT NULL,
    away_score  INTEGER NOT NULL,
    period      INTEGER NOT NULL,
    clock       TEXT NOT NULL,
    created_at  INTEGER NOT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_events_game ON game_events(game_id, created_at DESC);

  CREATE TABLE IF NOT EXISTS alert_log (
    dedupe_key  TEXT PRIMARY KEY,
    game_id     TEXT NOT NULL,
    channel     TEXT NOT NULL,
    delivered   INTEGER NOT NULL,
    error       TEXT,
    created_at  INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS insights_cache (
    cache_key   TEXT PRIMARY KEY,       -- teamId:gamesPlayed
    team_id     TEXT NOT NULL,
    payload     TEXT NOT NULL,
    created_at  INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS ai_usage (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    input_tokens INTEGER NOT NULL,
    output_tokens INTEGER NOT NULL,
    created_at   INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS preferences (
    id       INTEGER PRIMARY KEY CHECK (id = 1),
    payload  TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS live_state (
    game_id     TEXT PRIMARY KEY,
    payload     TEXT NOT NULL,
    updated_at  INTEGER NOT NULL
  );
`);

export default db;

// ---------------------------------------------------------------------------
// Cache
// ---------------------------------------------------------------------------

const selectCache = db.prepare(
  'SELECT payload, fetched_at, expires_at FROM api_cache WHERE key = ?',
);
const upsertCache = db.prepare(`
  INSERT INTO api_cache (key, endpoint, payload, fetched_at, expires_at)
  VALUES (?, ?, ?, ?, ?)
  ON CONFLICT(key) DO UPDATE SET
    payload = excluded.payload,
    fetched_at = excluded.fetched_at,
    expires_at = excluded.expires_at
`);
const insertCallLog = db.prepare(
  'INSERT INTO api_call_log (endpoint, outcome, detail, created_at) VALUES (?, ?, ?, ?)',
);

export interface CacheHit<T> {
  value: T;
  fetchedAt: number;
  fresh: boolean;
}

export function readCache<T>(key: string): CacheHit<T> | null {
  const row = selectCache.get(key) as
    | { payload: string; fetched_at: number; expires_at: number }
    | undefined;
  if (!row) return null;
  return {
    value: JSON.parse(row.payload) as T,
    fetchedAt: row.fetched_at,
    fresh: row.expires_at > Date.now(),
  };
}

export function writeCache(key: string, endpoint: string, value: unknown, ttlMs: number): void {
  const now = Date.now();
  upsertCache.run(key, endpoint, JSON.stringify(value), now, now + ttlMs);
}

export function logCall(endpoint: string, outcome: 'hit' | 'miss' | 'error', detail?: string): void {
  insertCallLog.run(endpoint, outcome, detail ?? null, Date.now());
}

// ---------------------------------------------------------------------------
// Events and alerts
// ---------------------------------------------------------------------------

const insertEvent = db.prepare(`
  INSERT OR IGNORE INTO game_events
    (id, game_id, type, headline, detail, dedupe_key, home_score, away_score, period, clock, created_at)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`);

/** Returns false when the event was already recorded — the dedupe guarantee. */
export function recordEvent(event: {
  id: string;
  gameId: string;
  type: string;
  headline: string;
  detail: string;
  dedupeKey: string;
  homeScore: number;
  awayScore: number;
  period: number;
  clock: string;
}): boolean {
  const result = insertEvent.run(
    event.id,
    event.gameId,
    event.type,
    event.headline,
    event.detail,
    event.dedupeKey,
    event.homeScore,
    event.awayScore,
    event.period,
    event.clock,
    Date.now(),
  );
  return result.changes > 0;
}

const selectEvents = db.prepare(
  'SELECT * FROM game_events WHERE game_id = ? ORDER BY created_at DESC LIMIT ?',
);
const selectRecentEvents = db.prepare(
  'SELECT * FROM game_events ORDER BY created_at DESC LIMIT ?',
);

interface EventRow {
  id: string;
  game_id: string;
  type: string;
  headline: string;
  detail: string;
  dedupe_key: string;
  home_score: number;
  away_score: number;
  period: number;
  clock: string;
  created_at: number;
}

const mapEvent = (row: EventRow) => ({
  id: row.id,
  gameId: row.game_id,
  type: row.type as never,
  headline: row.headline,
  detail: row.detail,
  dedupeKey: row.dedupe_key,
  homeScore: row.home_score,
  awayScore: row.away_score,
  period: row.period,
  clock: row.clock,
  createdAt: new Date(row.created_at).toISOString(),
});

export function eventsForGame(gameId: string, limit = 12) {
  return (selectEvents.all(gameId, limit) as unknown as EventRow[]).map(mapEvent);
}

export function recentEvents(limit = 30) {
  return (selectRecentEvents.all(limit) as unknown as EventRow[]).map(mapEvent);
}

const insertAlert = db.prepare(`
  INSERT OR IGNORE INTO alert_log (dedupe_key, game_id, channel, delivered, error, created_at)
  VALUES (?, ?, ?, ?, ?, ?)
`);

export function recordAlert(
  dedupeKey: string,
  gameId: string,
  channel: string,
  delivered: boolean,
  error?: string,
): boolean {
  return (
    insertAlert.run(dedupeKey, gameId, channel, delivered ? 1 : 0, error ?? null, Date.now())
      .changes > 0
  );
}

// ---------------------------------------------------------------------------
// Live state (for diffing across restarts)
// ---------------------------------------------------------------------------

const selectLive = db.prepare('SELECT payload FROM live_state WHERE game_id = ?');
const upsertLive = db.prepare(`
  INSERT INTO live_state (game_id, payload, updated_at) VALUES (?, ?, ?)
  ON CONFLICT(game_id) DO UPDATE SET payload = excluded.payload, updated_at = excluded.updated_at
`);

export function readLiveState<T>(gameId: string): T | null {
  const row = selectLive.get(gameId) as { payload: string } | undefined;
  return row ? (JSON.parse(row.payload) as T) : null;
}

export function writeLiveState(gameId: string, state: unknown): void {
  upsertLive.run(gameId, JSON.stringify(state), Date.now());
}

// ---------------------------------------------------------------------------
// Insights cache and AI budget
// ---------------------------------------------------------------------------

const selectInsight = db.prepare('SELECT payload FROM insights_cache WHERE cache_key = ?');
const upsertInsight = db.prepare(`
  INSERT INTO insights_cache (cache_key, team_id, payload, created_at) VALUES (?, ?, ?, ?)
  ON CONFLICT(cache_key) DO UPDATE SET payload = excluded.payload, created_at = excluded.created_at
`);
const deleteInsight = db.prepare('DELETE FROM insights_cache WHERE team_id = ?');

export function readInsights<T>(key: string): T | null {
  const row = selectInsight.get(key) as { payload: string } | undefined;
  return row ? (JSON.parse(row.payload) as T) : null;
}

export function writeInsights(key: string, teamId: string, payload: unknown): void {
  upsertInsight.run(key, teamId, JSON.stringify(payload), Date.now());
}

export function clearInsights(teamId: string): void {
  deleteInsight.run(teamId);
}

const insertUsage = db.prepare(
  'INSERT INTO ai_usage (input_tokens, output_tokens, created_at) VALUES (?, ?, ?)',
);
const sumUsage = db.prepare(
  'SELECT COALESCE(SUM(input_tokens + output_tokens), 0) AS total FROM ai_usage WHERE created_at > ?',
);

export function recordAiUsage(inputTokens: number, outputTokens: number): void {
  insertUsage.run(inputTokens, outputTokens, Date.now());
}

export function tokensUsedThisMonth(): number {
  const since = Date.now() - 30 * 86_400_000;
  const row = sumUsage.get(since) as { total: number };
  return row.total;
}

// ---------------------------------------------------------------------------
// Preferences
// ---------------------------------------------------------------------------

const selectPrefs = db.prepare('SELECT payload FROM preferences WHERE id = 1');
const upsertPrefs = db.prepare(`
  INSERT INTO preferences (id, payload) VALUES (1, ?)
  ON CONFLICT(id) DO UPDATE SET payload = excluded.payload
`);

export function readPreferences<T>(): T | null {
  const row = selectPrefs.get() as { payload: string } | undefined;
  return row ? (JSON.parse(row.payload) as T) : null;
}

export function writePreferences(prefs: unknown): void {
  upsertPrefs.run(JSON.stringify(prefs));
}

// ---------------------------------------------------------------------------
// Health
// ---------------------------------------------------------------------------

const callStats = db.prepare(`
  SELECT endpoint,
         SUM(CASE WHEN outcome = 'miss'  THEN 1 ELSE 0 END) AS misses,
         SUM(CASE WHEN outcome = 'hit'   THEN 1 ELSE 0 END) AS hits,
         SUM(CASE WHEN outcome = 'error' THEN 1 ELSE 0 END) AS errors
  FROM api_call_log WHERE created_at > ? GROUP BY endpoint
`);
const lastErrorStmt = db.prepare(
  "SELECT detail, created_at FROM api_call_log WHERE outcome = 'error' ORDER BY created_at DESC LIMIT 1",
);
const lastSuccessStmt = db.prepare(
  "SELECT created_at FROM api_call_log WHERE outcome = 'miss' ORDER BY created_at DESC LIMIT 1",
);

export function callStatsToday() {
  const since = Date.now() - 86_400_000;
  return {
    rows: callStats.all(since) as unknown as Array<{
      endpoint: string;
      misses: number;
      hits: number;
      errors: number;
    }>,
    lastError: lastErrorStmt.get() as { detail: string; created_at: number } | undefined,
    lastSuccess: lastSuccessStmt.get() as { created_at: number } | undefined,
  };
}
