import { describe, expect, it } from 'vitest';
import type { Game, Team } from '../../../shared/types.ts';
import { buildSchedule, findStretches, haversineKm, scoreDifficulty } from '../difficulty.ts';

const team = (over: Partial<Team> = {}): Team => ({
  id: 'nba-a',
  leagueId: 'nba',
  name: 'Team A',
  shortName: 'A',
  abbrev: 'AAA',
  city: 'New York',
  lat: 40.75,
  lon: -73.99,
  timezone: 'America/New_York',
  altitude: 10,
  rating: 55,
  record: { w: 10, l: 10, d: 0 },
  streak: 0,
  colors: ['#000', '#fff'],
  rivals: [],
  ...over,
});

const denver = team({
  id: 'nba-den',
  shortName: 'DEN',
  city: 'Denver',
  lat: 39.75,
  lon: -105.01,
  timezone: 'America/Denver',
  altitude: 1609,
});

const game = (id: string, homeTeamId: string, awayTeamId: string, startsAt: string): Game => ({
  id,
  leagueId: 'nba',
  startsAt,
  homeTeamId,
  awayTeamId,
  venue: '',
  broadcast: [],
  state: 'scheduled',
  seasonPhase: 'mid',
  notes: [],
});

describe('haversineKm', () => {
  it('is zero for the same point', () => {
    expect(haversineKm({ lat: 40, lon: -74 }, { lat: 40, lon: -74 })).toBe(0);
  });

  it('matches the known New York to Denver distance', () => {
    const km = haversineKm({ lat: 40.75, lon: -73.99 }, { lat: 39.75, lon: -105.01 });
    expect(km).toBeGreaterThan(2600);
    expect(km).toBeLessThan(2700);
  });
});

describe('scoreDifficulty', () => {
  const home = team();
  const strong = team({ id: 'nba-b', shortName: 'B', rating: 75 });
  const weak = team({ id: 'nba-c', shortName: 'C', rating: 30 });
  const teams = new Map([
    [home.id, home],
    [strong.id, strong],
    [weak.id, weak],
    [denver.id, denver],
  ]);

  it('rates a strong opponent harder than a weak one', () => {
    const vsStrong = scoreDifficulty({
      team: home,
      game: game('g1', home.id, strong.id, '2026-02-01T00:00:00Z'),
      opponent: strong,
      previousGames: [],
      teamsById: teams,
    });
    const vsWeak = scoreDifficulty({
      team: home,
      game: game('g2', home.id, weak.id, '2026-02-01T00:00:00Z'),
      opponent: weak,
      previousGames: [],
      teamsById: teams,
    });
    expect(vsStrong.score).toBeGreaterThan(vsWeak.score);
    expect(vsStrong.winProb).toBeLessThan(vsWeak.winProb);
  });

  it('penalises the road relative to home against the same opponent', () => {
    const atHome = scoreDifficulty({
      team: home,
      game: game('g1', home.id, strong.id, '2026-02-01T00:00:00Z'),
      opponent: strong,
      previousGames: [],
      teamsById: teams,
    });
    const away = scoreDifficulty({
      team: home,
      game: game('g2', strong.id, home.id, '2026-02-01T00:00:00Z'),
      opponent: strong,
      previousGames: [],
      teamsById: teams,
    });
    expect(away.score).toBeGreaterThan(atHome.score);
    expect(away.factors).toContain('On the road');
  });

  it('flags a back-to-back and counts rest correctly', () => {
    const previous = game('prev', home.id, weak.id, '2026-01-31T00:00:00Z');
    const result = scoreDifficulty({
      team: home,
      game: game('g1', home.id, strong.id, '2026-02-01T00:00:00Z'),
      opponent: strong,
      previousGames: [previous],
      teamsById: teams,
    });
    expect(result.isBackToBack).toBe(true);
    expect(result.restDays).toBe(1);
    expect(result.factors).toContain('Back-to-back');
  });

  it('adds an altitude penalty only for the visiting team', () => {
    const visiting = scoreDifficulty({
      team: home,
      game: game('g1', denver.id, home.id, '2026-02-05T00:00:00Z'),
      opponent: denver,
      previousGames: [],
      teamsById: teams,
    });
    const hosting = scoreDifficulty({
      team: denver,
      game: game('g2', denver.id, home.id, '2026-02-05T00:00:00Z'),
      opponent: home,
      previousGames: [],
      teamsById: teams,
    });
    expect(visiting.factors.some((f) => f.includes('Altitude'))).toBe(true);
    expect(hosting.factors.some((f) => f.includes('Altitude'))).toBe(false);
  });

  it('records travel distance from the previous venue', () => {
    const previous = game('prev', denver.id, home.id, '2026-02-03T00:00:00Z');
    const result = scoreDifficulty({
      team: home,
      game: game('g1', home.id, weak.id, '2026-02-06T00:00:00Z'),
      opponent: weak,
      previousGames: [previous],
      teamsById: teams,
    });
    expect(result.travelKm).toBeGreaterThan(2000);
  });

  it('stays inside 0-100 for an extreme case', () => {
    const brutal = scoreDifficulty({
      team: home,
      game: game('g1', denver.id, home.id, '2026-02-06T00:00:00Z'),
      opponent: team({ id: 'x', rating: 100 }),
      previousGames: [game('p', home.id, weak.id, '2026-02-05T00:00:00Z')],
      teamsById: teams,
    });
    expect(brutal.score).toBeLessThanOrEqual(100);
    expect(brutal.score).toBeGreaterThanOrEqual(0);
  });
});

describe('findStretches', () => {
  const home = team();
  const teams = new Map([[home.id, home]]);

  const entries = (scores: number[]) =>
    scores.map((score, i) => ({
      game: game(`g${i}`, home.id, 'opp', `2026-02-${String(i + 1).padStart(2, '0')}T00:00:00Z`),
      difficulty: {
        gameId: `g${i}`,
        score,
        tier: 'tough' as const,
        winProb: 0.5,
        factors: [],
        restDays: 2,
        isBackToBack: false,
        travelKm: 0,
      },
    }));

  it('finds a gauntlet whose average is top-quartile even when one game dips', () => {
    // Three brutal games and a winnable one is still a gauntlet.
    const found = findStretches(
      entries([20, 22, 25, 85, 88, 55, 90, 24, 21, 23, 26, 22]),
      teams,
      home.id,
    );
    expect(found.some((s) => s.kind === 'gauntlet')).toBe(true);
  });

  it('finds a soft stretch', () => {
    const found = findStretches(
      entries([90, 88, 85, 20, 22, 21, 24, 87, 89, 91, 86, 88]),
      teams,
      home.id,
    );
    expect(found.some((s) => s.kind === 'soft')).toBe(true);
  });

  it('returns nothing for a schedule too short to have a stretch', () => {
    expect(findStretches(entries([50, 60, 70]), teams, home.id)).toEqual([]);
  });
});

describe('buildSchedule', () => {
  it('projects a record that sums to the number of games', () => {
    const home = team();
    const opp = team({ id: 'nba-b', rating: 50 });
    const teams = new Map([
      [home.id, home],
      [opp.id, opp],
    ]);
    const games = Array.from({ length: 10 }, (_, i) =>
      game(`g${i}`, i % 2 === 0 ? home.id : opp.id, i % 2 === 0 ? opp.id : home.id,
        `2026-02-${String(i + 1).padStart(2, '0')}T00:00:00Z`),
    );

    const schedule = buildSchedule(home, games, teams);
    expect(schedule.games).toHaveLength(10);
    expect(schedule.projectedRecord.w + schedule.projectedRecord.l).toBe(10);
  });

  it('throws rather than guessing when an opponent is unknown', () => {
    const home = team();
    expect(() =>
      buildSchedule(home, [game('g', home.id, 'ghost', '2026-02-01T00:00:00Z')], new Map([[home.id, home]])),
    ).toThrow(/Unknown opponent/);
  });
});
