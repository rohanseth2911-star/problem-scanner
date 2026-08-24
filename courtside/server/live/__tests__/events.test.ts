import { describe, expect, it } from 'vitest';
import type { Game, GameEvent, Team } from '../../../shared/types.ts';
import { diffGame, isClutch, passesTier } from '../events.ts';

const team = (id: string, over: Partial<Team> = {}): Team => ({
  id,
  leagueId: 'nba',
  name: id,
  shortName: id.toUpperCase(),
  abbrev: id.slice(0, 3).toUpperCase(),
  city: '',
  lat: 0,
  lon: 0,
  timezone: 'UTC',
  altitude: 0,
  rating: 55,
  record: { w: 0, l: 0, d: 0 },
  streak: 0,
  colors: ['#000', '#fff'],
  rivals: [],
  ...over,
});

const home = team('gsw');
const away = team('okc');

const live = (
  homeScore: number,
  awayScore: number,
  period = 4,
  secondsRemaining = 200,
): Game => ({
  id: 'g1',
  leagueId: 'nba',
  startsAt: '2026-02-01T00:00:00Z',
  homeTeamId: home.id,
  awayTeamId: away.id,
  venue: '',
  broadcast: [],
  state: 'live',
  seasonPhase: 'late',
  notes: [],
  live: {
    homeScore,
    awayScore,
    period,
    clock: '3:20',
    secondsRemaining,
    updatedAt: '2026-02-01T02:00:00Z',
  },
});

const ctx = { home, away, watchScore: 90, dropEverythingThreshold: 80 };
const types = (events: GameEvent[]) => events.map((e) => e.type);

describe('isClutch', () => {
  it('is true for a close game late in the final period', () => {
    expect(isClutch(live(100, 98, 4, 200))).toBe(true);
  });

  it('is false when the margin is too wide', () => {
    expect(isClutch(live(120, 98, 4, 200))).toBe(false);
  });

  it('is false early in the game', () => {
    expect(isClutch(live(50, 48, 2, 200))).toBe(false);
  });

  it('is false with plenty of time left', () => {
    expect(isClutch(live(100, 98, 4, 600))).toBe(false);
  });

  it('is false for a game that is not live', () => {
    expect(isClutch({ ...live(100, 98), state: 'final' })).toBe(false);
  });
});

describe('diffGame', () => {
  it('emits a start event on tip-off', () => {
    const events = diffGame(null, live(0, 0, 1, 700), ctx);
    expect(types(events)).toContain('PERIOD_START');
  });

  it('emits a score change with the margin', () => {
    const events = diffGame(live(100, 98), live(103, 98), ctx);
    expect(types(events)).toContain('SCORE_CHANGE');
    expect(events[0]!.detail).toContain('+3');
  });

  it('emits a lead change only when the lead actually flips', () => {
    const flipped = diffGame(live(100, 98), live(100, 101), ctx);
    expect(types(flipped)).toContain('LEAD_CHANGE');

    const extended = diffGame(live(100, 98), live(103, 98), ctx);
    expect(types(extended)).not.toContain('LEAD_CHANGE');
  });

  it('does not treat a tie as a lead change', () => {
    const events = diffGame(live(100, 98), live(100, 100), ctx);
    expect(types(events)).not.toContain('LEAD_CHANGE');
  });

  it('stays silent when the score goes backwards', () => {
    // An upstream correction, or a demo game that looped. Never "+-5".
    const events = diffGame(live(110, 108), live(4, 2, 1, 700), ctx);
    expect(types(events)).not.toContain('SCORE_CHANGE');
    expect(types(events)).not.toContain('LEAD_CHANGE');
  });

  it('does not emit a period end when the period goes backwards', () => {
    const events = diffGame(live(110, 108, 4, 100), live(4, 2, 1, 700), ctx);
    expect(types(events)).not.toContain('PERIOD_END');
  });

  it('emits nothing on an unchanged poll', () => {
    expect(diffGame(live(100, 98), live(100, 98, 4, 900), ctx)).toEqual([]);
  });

  it('emits a period end when the period advances', () => {
    const events = diffGame(live(50, 48, 2, 10), live(50, 48, 3, 700), ctx);
    expect(types(events)).toContain('PERIOD_END');
  });

  it('emits a final, and an upset when the weaker side wins', () => {
    const strongHome = { ...ctx, home: team('gsw', { rating: 75 }) };
    const finished: Game = { ...live(98, 101), state: 'final' };
    const events = diffGame(live(98, 99), finished, strongHome);
    expect(types(events)).toContain('FINAL');
    expect(types(events)).toContain('UPSET_BREWING');
  });

  it('raises drop-everything only above the threshold', () => {
    const above = diffGame(live(100, 98), live(100, 100), ctx);
    expect(types(above)).toContain('DROP_EVERYTHING');

    const below = diffGame(live(100, 98), live(100, 100), { ...ctx, watchScore: 40 });
    expect(types(below)).toContain('CLOSE_GAME');
    expect(types(below)).not.toContain('DROP_EVERYTHING');
  });

  it('produces stable dedupe keys for the same state', () => {
    const a = diffGame(live(100, 98), live(103, 98), ctx);
    const b = diffGame(live(100, 98), live(103, 98), ctx);
    expect(a.map((e) => e.dedupeKey)).toEqual(b.map((e) => e.dedupeKey));
  });

  it('ignores a game with no live state', () => {
    const scheduled: Game = { ...live(0, 0), state: 'scheduled', live: undefined };
    expect(diffGame(null, scheduled, ctx)).toEqual([]);
  });
});

describe('passesTier', () => {
  const event = (type: GameEvent['type']): GameEvent => ({
    id: 'e',
    gameId: 'g',
    type,
    headline: '',
    detail: '',
    dedupeKey: 'k',
    homeScore: 0,
    awayScore: 0,
    period: 4,
    clock: '',
    createdAt: '',
  });

  it('honours an explicit mute absolutely, drop-everything included', () => {
    expect(passesTier(event('SCORE_CHANGE'), 'off')).toBe(false);
    expect(passesTier(event('FINAL'), 'off')).toBe(false);
    expect(passesTier(event('DROP_EVERYTHING'), 'off')).toBe(false);
  });

  it('stays silent on an untracked game but still lets drop-everything through', () => {
    expect(passesTier(event('SCORE_CHANGE'), 'discover')).toBe(false);
    expect(passesTier(event('FINAL'), 'discover')).toBe(false);
    expect(passesTier(event('LEAD_CHANGE'), 'discover')).toBe(false);
    expect(passesTier(event('DROP_EVERYTHING'), 'discover')).toBe(true);
  });

  it('lets every score change through on "all"', () => {
    expect(passesTier(event('SCORE_CHANGE'), 'all')).toBe(true);
  });

  it('drops routine score changes on "key" but keeps lead changes', () => {
    expect(passesTier(event('SCORE_CHANGE'), 'key')).toBe(false);
    expect(passesTier(event('LEAD_CHANGE'), 'key')).toBe(true);
    expect(passesTier(event('FINAL'), 'key')).toBe(true);
  });

  it('keeps only late drama on "clutch"', () => {
    expect(passesTier(event('CLOSE_GAME'), 'clutch')).toBe(true);
    expect(passesTier(event('LEAD_CHANGE'), 'clutch')).toBe(false);
  });

  it('keeps only the final on "final"', () => {
    expect(passesTier(event('FINAL'), 'final')).toBe(true);
    expect(passesTier(event('CLOSE_GAME'), 'final')).toBe(false);
  });
});
