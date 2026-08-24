import type { Game, ProviderHealth } from '../../shared/types.ts';
import { callStatsToday, logCall, readCache, writeCache } from '../db.ts';
import { ApiSportsProvider } from './apisports.ts';
import { MockProvider } from './mock.ts';
import type { SportsProvider } from './types.ts';

/** Cache lifetimes, tuned to how fast each kind of data actually changes. */
const TTL = {
  teams: 24 * 3_600_000,
  roster: 24 * 3_600_000,
  schedule: 6 * 3_600_000,
  standings: 3_600_000,
  injuries: 15 * 60_000,
  boxScores: 6 * 3_600_000,
  live: 20_000,
} as const;

/**
 * Token bucket. Refills continuously across the day so a burst at boot cannot
 * eat the whole quota, and the poller degrades instead of getting 429'd.
 */
class TokenBucket {
  private tokens: number;
  private lastRefill = Date.now();

  constructor(
    private readonly capacity: number,
    private readonly refillPerMs: number,
  ) {
    this.tokens = capacity;
  }

  tryTake(): boolean {
    const now = Date.now();
    this.tokens = Math.min(this.capacity, this.tokens + (now - this.lastRefill) * this.refillPerMs);
    this.lastRefill = now;
    if (this.tokens < 1) return false;
    this.tokens -= 1;
    return true;
  }

  get remaining(): number {
    return Math.floor(this.tokens);
  }
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Wraps any provider with caching, quota limiting, retry and call logging.
 *
 * The cache is also the failure mode: when the upstream errors or the bucket is
 * empty, a stale cached value is served with its original timestamp rather than
 * an empty screen — and the UI shows how old it is.
 */
export class CachedProvider implements SportsProvider {
  readonly name: string;
  private readonly bucket: TokenBucket;

  constructor(
    private readonly inner: SportsProvider,
    dailyLimit: number,
  ) {
    this.name = inner.name;
    this.bucket = new TokenBucket(Math.max(10, dailyLimit), dailyLimit / 86_400_000);
  }

  private async cached<T>(endpoint: string, key: string, ttl: number, fetcher: () => Promise<T>): Promise<T> {
    const hit = readCache<T>(key);
    if (hit?.fresh) {
      logCall(endpoint, 'hit');
      return hit.value;
    }

    if (!this.bucket.tryTake()) {
      logCall(endpoint, 'error', 'daily quota exhausted');
      if (hit) return hit.value;
      throw new Error(`Quota exhausted and nothing cached for ${endpoint}`);
    }

    try {
      const value = await withRetry(fetcher);
      writeCache(key, endpoint, value, ttl);
      logCall(endpoint, 'miss');
      return value;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      logCall(endpoint, 'error', message);
      // Stale data with a visible timestamp beats a blank screen.
      if (hit) return hit.value;
      throw error;
    }
  }

  getTeams() {
    return this.cached('teams', 'teams:all', TTL.teams, () => this.inner.getTeams());
  }

  getSchedule(teamId: string, from: Date, to: Date) {
    const key = `schedule:${teamId}:${from.toISOString().slice(0, 10)}:${to.toISOString().slice(0, 10)}`;
    return this.cached('schedule', key, TTL.schedule, () => this.inner.getSchedule(teamId, from, to));
  }

  getLiveGames() {
    return this.cached('live', 'live:all', TTL.live, () => this.inner.getLiveGames());
  }

  getBoxScores(teamId: string, limit: number) {
    return this.cached('boxScores', `box:${teamId}:${limit}`, TTL.boxScores, () =>
      this.inner.getBoxScores(teamId, limit),
    );
  }

  getRoster(teamId: string) {
    return this.cached('roster', `roster:${teamId}`, TTL.roster, () => this.inner.getRoster(teamId));
  }

  getInjuries(teamId: string) {
    return this.cached('injuries', `injuries:${teamId}`, TTL.injuries, () =>
      this.inner.getInjuries(teamId),
    );
  }

  async getGamesBetween(from: Date, to: Date): Promise<Game[]> {
    if (!this.inner.getGamesBetween) throw new Error('provider has no league-wide window');
    const key = `window:${from.toISOString()}:${to.toISOString()}`;
    // Short TTL: this window contains live games whose scores must stay current.
    return this.cached('window', key, TTL.live, () => this.inner.getGamesBetween!(from, to));
  }

  getStandings(leagueId: string) {
    return this.cached('standings', `standings:${leagueId}`, TTL.standings, () =>
      this.inner.getStandings(leagueId),
    );
  }

  get quotaRemaining(): number {
    return this.bucket.remaining;
  }
}

/** Exponential backoff with jitter. 4xx other than 429 is never retried. */
async function withRetry<T>(fn: () => Promise<T>, attempts = 3): Promise<T> {
  let lastError: unknown;
  for (let attempt = 0; attempt < attempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      const retryable =
        (error as { retryable?: boolean }).retryable === true ||
        /\b(429|5\d\d)\b/.test(error instanceof Error ? error.message : '');
      if (!retryable || attempt === attempts - 1) throw error;
      const backoff = 2 ** attempt * 1000 + Math.random() * 500;
      await sleep(backoff);
    }
  }
  throw lastError;
}

let instance: CachedProvider | null = null;
let rawInstance: SportsProvider | null = null;

export function getProvider(): CachedProvider {
  if (instance) return instance;
  const choice = (process.env.SPORTS_PROVIDER ?? 'mock').toLowerCase();
  const dailyLimit = Number(process.env.API_DAILY_LIMIT ?? 1000);

  rawInstance =
    choice === 'api-sports' || choice === 'apisports'
      ? new ApiSportsProvider(process.env.SPORTS_API_KEY ?? '')
      : new MockProvider();

  instance = new CachedProvider(rawInstance, dailyLimit);
  return instance;
}

/** The unwrapped provider, for mock-only helpers such as league-wide listings. */
export function getRawProvider(): SportsProvider {
  getProvider();
  return rawInstance!;
}

export function providerHealth(): ProviderHealth {
  const provider = getProvider();
  const { rows, lastError, lastSuccess } = callStatsToday();
  const hits = rows.reduce((s, r) => s + r.hits, 0);
  const misses = rows.reduce((s, r) => s + r.misses, 0);

  return {
    provider: provider.name,
    callsToday: misses,
    dailyLimit: Number(process.env.API_DAILY_LIMIT ?? 1000),
    cacheHitRate: hits + misses === 0 ? 0 : hits / (hits + misses),
    lastError: lastError?.detail ?? null,
    lastSuccessAt: lastSuccess ? new Date(lastSuccess.created_at).toISOString() : null,
    byEndpoint: rows.map((r) => ({
      endpoint: r.endpoint,
      calls: r.misses,
      hits: r.hits,
      misses: r.misses,
    })),
  };
}
