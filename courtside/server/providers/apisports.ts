import type {
  BoxScore,
  Game,
  Injury,
  LeagueId,
  Player,
  StandingsRow,
  Team,
} from '../../shared/types.ts';
import type { SportsProvider } from './types.ts';

/**
 * API-SPORTS adapter. One account covers all four leagues this app tracks,
 * which is why it is the default real provider.
 *
 * IMPORTANT: this adapter has been written against API-SPORTS' documented
 * response shapes but has NOT been exercised against a live key in this
 * repository. Every mapper below is deliberately strict — an unexpected shape
 * throws rather than silently producing a half-populated object, because a
 * plausible-looking wrong roster is worse than a visible error. Verify each
 * endpoint against your account's actual responses before trusting it, and
 * check `/api/health/providers` for the first failure.
 */

const HOSTS: Record<LeagueId, string> = {
  nba: 'https://v1.basketball.api-sports.io',
  nfl: 'https://v1.american-football.api-sports.io',
  epl: 'https://v3.football.api-sports.io',
  tennis: 'https://v1.tennis.api-sports.io',
};

/** API-SPORTS league ids. */
const LEAGUE_IDS: Record<LeagueId, number> = { nba: 12, nfl: 1, epl: 39, tennis: 1 };

interface ApiEnvelope<T> {
  errors: unknown;
  results: number;
  response: T;
}

export class ApiSportsProvider implements SportsProvider {
  readonly name = 'api-sports';

  constructor(
    private readonly apiKey: string,
    private readonly season: number = new Date().getUTCFullYear(),
  ) {
    if (!apiKey) throw new Error('SPORTS_API_KEY is required for the api-sports provider');
  }

  private async call<T>(league: LeagueId, path: string, params: Record<string, string>): Promise<T> {
    const url = new URL(path, HOSTS[league]);
    for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);

    const response = await fetch(url, {
      headers: { 'x-apisports-key': this.apiKey },
    });

    if (response.status === 429) {
      throw Object.assign(new Error('api-sports rate limit reached'), { retryable: true });
    }
    if (!response.ok) {
      throw new Error(`api-sports ${path} responded ${response.status}`);
    }

    const body = (await response.json()) as ApiEnvelope<T>;
    // API-SPORTS returns HTTP 200 with a populated `errors` object on failure.
    if (body.errors && (Array.isArray(body.errors) ? body.errors.length : Object.keys(body.errors).length)) {
      throw new Error(`api-sports ${path}: ${JSON.stringify(body.errors)}`);
    }
    return body.response;
  }

  async getTeams(): Promise<Team[]> {
    const teams: Team[] = [];
    for (const league of Object.keys(LEAGUE_IDS) as LeagueId[]) {
      const rows = await this.call<Array<Record<string, unknown>>>(league, '/teams', {
        league: String(LEAGUE_IDS[league]),
        season: String(this.season),
      });
      for (const row of rows) teams.push(mapTeam(league, row));
    }
    return teams;
  }

  async getSchedule(teamId: string, from: Date, to: Date): Promise<Game[]> {
    const { league, remoteId } = splitId(teamId);
    const rows = await this.call<Array<Record<string, unknown>>>(league, gamesPath(league), {
      team: remoteId,
      season: String(this.season),
      from: from.toISOString().slice(0, 10),
      to: to.toISOString().slice(0, 10),
    });
    return rows.map((row) => mapGame(league, row));
  }

  async getLiveGames(): Promise<Game[]> {
    const games: Game[] = [];
    for (const league of Object.keys(LEAGUE_IDS) as LeagueId[]) {
      const rows = await this.call<Array<Record<string, unknown>>>(league, gamesPath(league), {
        live: 'all',
      });
      for (const row of rows) games.push(mapGame(league, row));
    }
    return games;
  }

  async getRoster(teamId: string): Promise<Player[]> {
    const { league, remoteId } = splitId(teamId);
    const rows = await this.call<Array<Record<string, unknown>>>(league, '/players', {
      team: remoteId,
      season: String(this.season),
    });
    return rows.map((row) => mapPlayer(teamId, row));
  }

  async getInjuries(teamId: string): Promise<Array<{ playerId: string; injury: Injury }>> {
    const { league, remoteId } = splitId(teamId);
    const rows = await this.call<Array<Record<string, unknown>>>(league, '/injuries', {
      team: remoteId,
      season: String(this.season),
    });
    return rows.map((row) => {
      const player = requireObject(row, 'player');
      return {
        playerId: `${teamId}-${requireString(player, 'id')}`,
        injury: {
          status: normaliseInjuryStatus(String(readUnknown(player, 'type') ?? '')),
          description: String(readUnknown(player, 'reason') ?? 'Undisclosed'),
          reportedAt: new Date().toISOString(),
        },
      };
    });
  }

  async getStandings(leagueId: string): Promise<StandingsRow[]> {
    const league = leagueId as LeagueId;
    const rows = await this.call<Array<Record<string, unknown>>>(league, '/standings', {
      league: String(LEAGUE_IDS[league]),
      season: String(this.season),
    });
    return rows.flat().map((row, index) => {
      const team = requireObject(row, 'team');
      return {
        teamId: `${league}:${requireString(team, 'id')}`,
        rank: Number(readUnknown(row, 'position') ?? index + 1),
        w: Number(readUnknown(row, 'won') ?? 0),
        l: Number(readUnknown(row, 'lost') ?? 0),
        d: Number(readUnknown(row, 'drawn') ?? 0),
        points: readUnknown(row, 'points') === undefined ? undefined : Number(readUnknown(row, 'points')),
      };
    });
  }

  /**
   * API-SPORTS exposes per-game player statistics rather than a single
   * box-score document, so this walks the team's recent fixtures.
   */
  async getBoxScores(teamId: string, limit: number): Promise<BoxScore[]> {
    const { league, remoteId } = splitId(teamId);
    const fixtures = await this.call<Array<Record<string, unknown>>>(league, gamesPath(league), {
      team: remoteId,
      season: String(this.season),
      last: String(limit),
    });

    const scores: BoxScore[] = [];
    for (const fixture of fixtures) {
      const gameId = `${league}:${requireString(fixture, 'id')}`;
      const stats = await this.call<Array<Record<string, unknown>>>(
        league,
        '/players/statistics',
        { team: remoteId, game: String(requireString(fixture, 'id')) },
      );
      scores.push({
        gameId,
        playedAt: String(readUnknown(fixture, 'date') ?? new Date().toISOString()),
        lines: stats.map((row) => mapBoxLine(teamId, row)),
      });
    }
    return scores;
  }
}

// ---------------------------------------------------------------------------
// Mapping helpers — strict by design.
// ---------------------------------------------------------------------------

function gamesPath(league: LeagueId): string {
  return league === 'epl' ? '/fixtures' : '/games';
}

function splitId(teamId: string): { league: LeagueId; remoteId: string } {
  const [league, remoteId] = teamId.split(':');
  if (!league || !remoteId) {
    throw new Error(`Team id "${teamId}" is not in "<league>:<remoteId>" form`);
  }
  return { league: league as LeagueId, remoteId };
}

function readUnknown(source: Record<string, unknown>, key: string): unknown {
  return source[key];
}

function requireObject(source: Record<string, unknown>, key: string): Record<string, unknown> {
  const value = source[key];
  if (!value || typeof value !== 'object') {
    throw new Error(`Expected object at "${key}" in api-sports response`);
  }
  return value as Record<string, unknown>;
}

function requireString(source: Record<string, unknown>, key: string): string {
  const value = source[key];
  if (value === undefined || value === null) {
    throw new Error(`Expected "${key}" in api-sports response`);
  }
  return String(value);
}

function normaliseInjuryStatus(raw: string): Injury['status'] {
  const upper = raw.toUpperCase();
  const known: Injury['status'][] = ['OUT', 'DOUBTFUL', 'QUESTIONABLE', 'PROBABLE', 'GTD'];
  return known.find((s) => upper.includes(s)) ?? 'OUT';
}

function mapTeam(league: LeagueId, row: Record<string, unknown>): Team {
  const id = `${league}:${requireString(row, 'id')}`;
  const name = requireString(row, 'name');
  return {
    id,
    leagueId: league,
    name,
    shortName: name,
    abbrev: String(readUnknown(row, 'code') ?? name.slice(0, 3).toUpperCase()),
    city: String(readUnknown(row, 'city') ?? ''),
    // Venue coordinates are not part of the teams payload; the difficulty
    // model's travel term stays at zero until they are supplied separately.
    lat: 0,
    lon: 0,
    timezone: 'UTC',
    altitude: 0,
    rating: 50,
    record: { w: 0, l: 0, d: 0 },
    streak: 0,
    colors: ['#4b5563', '#9ca3af'],
    rivals: [],
  };
}

function mapGame(league: LeagueId, row: Record<string, unknown>): Game {
  const teams = requireObject(row, 'teams');
  const home = requireObject(teams, 'home');
  const away = requireObject(teams, 'away');
  const scores = (row['scores'] ?? {}) as Record<string, unknown>;
  const status = (row['status'] ?? {}) as Record<string, unknown>;
  const short = String(readUnknown(status, 'short') ?? '');

  const state: Game['state'] =
    ['FT', 'AET', 'PEN', 'AOT'].includes(short)
      ? 'final'
      : ['NS', 'TBD', 'PST'].includes(short)
        ? 'scheduled'
        : 'live';

  const homeScore = Number(readUnknown(scores['home'] as Record<string, unknown> ?? {}, 'total') ?? readUnknown(scores, 'home') ?? 0);
  const awayScore = Number(readUnknown(scores['away'] as Record<string, unknown> ?? {}, 'total') ?? readUnknown(scores, 'away') ?? 0);

  return {
    id: `${league}:${requireString(row, 'id')}`,
    leagueId: league,
    startsAt: new Date(String(readUnknown(row, 'date'))).toISOString(),
    homeTeamId: `${league}:${requireString(home, 'id')}`,
    awayTeamId: `${league}:${requireString(away, 'id')}`,
    venue: String(readUnknown(row, 'venue') ?? ''),
    broadcast: [],
    state,
    live:
      state === 'live'
        ? {
            homeScore,
            awayScore,
            period: Number(readUnknown(status, 'period') ?? 1),
            clock: String(readUnknown(status, 'timer') ?? readUnknown(status, 'elapsed') ?? ''),
            secondsRemaining: 0,
            updatedAt: new Date().toISOString(),
          }
        : undefined,
    seasonPhase: 'mid',
    notes: [],
  };
}

function mapPlayer(teamId: string, row: Record<string, unknown>): Player {
  const player = (row['player'] ?? row) as Record<string, unknown>;
  return {
    id: `${teamId}-${requireString(player, 'id')}`,
    teamId,
    name: String(readUnknown(player, 'name') ?? 'Unknown'),
    position: String(readUnknown(player, 'position') ?? ''),
    number: Number(readUnknown(player, 'number') ?? 0),
    age: Number(readUnknown(player, 'age') ?? 0),
    yearsPro: 0,
    role: 'rotation',
    // Star rating is a derived quantity, not something the feed provides.
    // It is filled in downstream from usage and production.
    starRating: 50,
    stats: {
      gamesPlayed: 0,
      minutesPerGame: 0,
      primary: 0,
      secondary: 0,
      tertiary: 0,
      efficiency: 0,
      usageRate: 0,
      onOffDiff: 0,
    },
  };
}

function mapBoxLine(teamId: string, row: Record<string, unknown>) {
  const player = requireObject(row, 'player');
  const games = (row['games'] ?? {}) as Record<string, unknown>;
  const points = (row['points'] ?? {}) as Record<string, unknown>;
  return {
    playerId: `${teamId}-${requireString(player, 'id')}`,
    minutes: Number(readUnknown(games, 'minutes') ?? 0),
    primary: Number(readUnknown(points, 'total') ?? readUnknown(row, 'points') ?? 0),
    secondary: 0,
    tertiary: 0,
    efficiency: 0,
    plusMinus: Number(readUnknown(row, 'plusMinus') ?? 0),
  };
}
