import { describe, expect, it } from 'vitest';
import type { Game, Player, Preferences, Team } from '../../../shared/types.ts';
import {
  availableStarRating,
  bucketFor,
  impliedWinProbability,
  scoreWatchability,
  WEIGHTS,
} from '../watchability.ts';

const team = (over: Partial<Team> = {}): Team => ({
  id: 'nba-a',
  leagueId: 'nba',
  name: 'Team A',
  shortName: 'A',
  abbrev: 'AAA',
  city: 'Alpha',
  lat: 40,
  lon: -74,
  timezone: 'America/New_York',
  altitude: 0,
  conference: 'East',
  rating: 55,
  record: { w: 10, l: 10, d: 0 },
  streak: 1,
  colors: ['#000', '#fff'],
  rivals: [],
  ...over,
});

const player = (over: Partial<Player> = {}): Player => ({
  id: 'p1',
  teamId: 'nba-a',
  name: 'Player One',
  position: 'PG',
  number: 1,
  age: 27,
  yearsPro: 6,
  role: 'starter',
  starRating: 90,
  stats: {
    gamesPlayed: 20,
    minutesPerGame: 32,
    primary: 24,
    secondary: 5,
    tertiary: 4,
    efficiency: 58,
    usageRate: 29,
    onOffDiff: 6,
  },
  ...over,
});

const game = (over: Partial<Game> = {}): Game => ({
  id: 'g1',
  leagueId: 'nba',
  // 20:00 Eastern, inside the default watch window.
  startsAt: '2026-01-14T01:00:00.000Z',
  homeTeamId: 'nba-a',
  awayTeamId: 'nba-b',
  venue: 'Alpha Arena',
  broadcast: ['TNT'],
  state: 'scheduled',
  seasonPhase: 'mid',
  notes: [],
  ...over,
});

const prefs = (over: Partial<Preferences> = {}): Preferences => ({
  timezone: 'America/New_York',
  trackedTeamIds: [],
  trackedPlayerIds: [],
  subscriptions: ['TNT'],
  watchWindows: [
    { day: 0, startHour: 9, endHour: 24 },
    { day: 1, startHour: 18, endHour: 24 },
    { day: 2, startHour: 18, endHour: 24 },
    { day: 3, startHour: 18, endHour: 24 },
    { day: 4, startHour: 18, endHour: 24 },
    { day: 5, startHour: 18, endHour: 24 },
    { day: 6, startHour: 9, endHour: 24 },
  ],
  alertTiers: {},
  defaultAlertTier: 'key',
  dropEverythingThreshold: 80,
  ...over,
});

const score = (over: {
  home?: Partial<Team>;
  away?: Partial<Team>;
  game?: Partial<Game>;
  prefs?: Partial<Preferences>;
  homePlayers?: Player[];
  awayPlayers?: Player[];
} = {}) =>
  scoreWatchability({
    game: game(over.game),
    home: team({ id: 'nba-a', ...over.home }),
    away: team({ id: 'nba-b', shortName: 'B', abbrev: 'BBB', ...over.away }),
    homePlayers: over.homePlayers ?? [player()],
    awayPlayers: over.awayPlayers ?? [player({ id: 'p2', teamId: 'nba-b' })],
    prefs: prefs(over.prefs),
    now: new Date('2026-01-13T18:00:00.000Z'),
  });

describe('weights', () => {
  it('sum to exactly 1', () => {
    const total = Object.values(WEIGHTS).reduce((a, b) => a + b, 0);
    expect(total).toBeCloseTo(1, 10);
  });
});

describe('impliedWinProbability', () => {
  it('gives the home side an edge when ratings are equal', () => {
    expect(impliedWinProbability(team(), team({ id: 'nba-b' }), 'nba')).toBeGreaterThan(0.5);
  });

  it('has no home edge in tennis', () => {
    const p = impliedWinProbability(
      team({ leagueId: 'tennis' }),
      team({ id: 'nba-b', leagueId: 'tennis' }),
      'tennis',
    );
    expect(p).toBeCloseTo(0.5, 10);
  });

  it('is monotonic in the rating gap', () => {
    const small = impliedWinProbability(team({ rating: 60 }), team({ id: 'b', rating: 55 }), 'nba');
    const large = impliedWinProbability(team({ rating: 75 }), team({ id: 'b', rating: 35 }), 'nba');
    expect(large).toBeGreaterThan(small);
    expect(large).toBeLessThan(1);
  });
});

describe('quality uses the weaker team', () => {
  it('scores a mismatch below an even matchup of the same average', () => {
    // Both pairs average 55, but one has a weak link.
    const even = score({ home: { rating: 55 }, away: { rating: 55 } });
    const mismatch = score({ home: { rating: 80 }, away: { rating: 30 } });
    expect(even.components.quality).toBeGreaterThan(mismatch.components.quality);
  });
});

describe('starPower', () => {
  it('discounts a ruled-out star to zero', () => {
    expect(
      availableStarRating(player({ injury: { status: 'OUT', description: 'x', reportedAt: '' } })),
    ).toBe(0);
  });

  it('drops when the headliner is out, and says so', () => {
    const healthy = score();
    const injured = score({
      homePlayers: [
        player({ injury: { status: 'OUT', description: 'Ankle', reportedAt: '2026-01-13T00:00:00Z' } }),
      ],
    });
    expect(injured.components.starPower).toBeLessThan(healthy.components.starPower);
    expect(injured.reasons.join(' ')).toContain('OUT');
  });
});

describe('competitiveness', () => {
  it('peaks for a coin-flip and bottoms out for a blowout', () => {
    const evenGame = score({ home: { rating: 52 }, away: { rating: 55 } });
    const blowout = score({ home: { rating: 78 }, away: { rating: 30 } });
    expect(evenGame.components.competitiveness).toBeGreaterThan(0.8);
    expect(blowout.components.competitiveness).toBeLessThan(0.2);
  });
});

describe('personalFit', () => {
  it('maxes out when both teams are tracked', () => {
    const result = score({ prefs: { trackedTeamIds: ['nba-a', 'nba-b'] } });
    expect(result.components.personalFit).toBe(1);
  });

  it('gives a rival of a tracked team more than a stranger', () => {
    const rival = score({
      home: { rivals: ['nba-z'] },
      prefs: { trackedTeamIds: ['nba-z'] },
    });
    const stranger = score({ prefs: { trackedTeamIds: ['nba-z'] } });
    expect(rival.components.personalFit).toBeGreaterThan(stranger.components.personalFit);
  });
});

describe('convenience', () => {
  it('penalises a game that is not on any subscribed service', () => {
    const carried = score({ prefs: { subscriptions: ['TNT'] } });
    const notCarried = score({ prefs: { subscriptions: ['ESPN+'] } });
    expect(notCarried.components.convenience).toBeLessThan(carried.components.convenience);
    expect(notCarried.unavailableOn).toEqual(['TNT']);
  });

  it('never zeroes out a game outside the watch window', () => {
    // 07:00 Eastern on a weekday — well outside the evening window.
    const early = score({ game: { startsAt: '2026-01-14T12:00:00.000Z' } });
    expect(early.components.convenience).toBeGreaterThan(0);
    expect(early.components.convenience).toBeLessThan(1);
  });
});

describe('scoreWatchability', () => {
  it('stays within 0-100 at both extremes', () => {
    const best = score({
      home: { rating: 78, rivals: ['nba-b'] },
      away: { rating: 78 },
      game: { seasonPhase: 'playoffs', notes: ['a', 'b', 'c'] },
      prefs: { trackedTeamIds: ['nba-a', 'nba-b'] },
    });
    const worst = score({
      home: { rating: 20, streak: 0 },
      away: { rating: 78, streak: 0 },
      game: { seasonPhase: 'preseason', startsAt: '2026-01-14T09:00:00.000Z' },
      prefs: { subscriptions: [] },
      homePlayers: [player({ starRating: 5 })],
      awayPlayers: [player({ id: 'p2', starRating: 5 })],
    });
    expect(best.score).toBeLessThanOrEqual(100);
    expect(worst.score).toBeGreaterThanOrEqual(0);
    expect(best.score).toBeGreaterThan(worst.score);
  });

  it('always explains itself', () => {
    expect(score().reasons.length).toBeGreaterThan(0);
  });

  it('is deterministic', () => {
    expect(score().score).toBe(score().score);
  });

  it('survives an empty roster', () => {
    const result = score({ homePlayers: [], awayPlayers: [] });
    expect(result.components.starPower).toBe(0);
    expect(Number.isFinite(result.score)).toBe(true);
  });

  it('buckets on the documented thresholds', () => {
    expect(bucketFor(90)).toBe('appointment');
    expect(bucketFor(89.9)).toBe('must-watch');
    expect(bucketFor(75)).toBe('must-watch');
    expect(bucketFor(74.9)).toBe('worth-it');
    expect(bucketFor(55)).toBe('worth-it');
    expect(bucketFor(34.9)).toBe('skip');
  });
});
