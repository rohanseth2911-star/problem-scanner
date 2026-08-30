import { describe, expect, it } from 'vitest';
import type { BoxScore, Player } from '../../../shared/types.ts';
import { computeUtilization, heuristicInsights, trendAcrossWindow } from '../utilization.ts';

const player = (id: string, over: Partial<Player> = {}): Player => ({
  id,
  teamId: 't',
  name: `Player ${id}`,
  position: 'SF',
  number: 1,
  age: 27,
  yearsPro: 5,
  role: 'rotation',
  starRating: 60,
  stats: {
    gamesPlayed: 10,
    minutesPerGame: 20,
    primary: 10,
    secondary: 3,
    tertiary: 2,
    efficiency: 55,
    usageRate: 20,
    onOffDiff: 0,
  },
  ...over,
});

/** Builds a synthetic ten-game window with fixed per-game lines. */
const boxes = (lines: Record<string, Array<[number, number, number, number]>>): BoxScore[] => {
  const count = Object.values(lines)[0]?.length ?? 0;
  return Array.from({ length: count }, (_, i) => ({
    gameId: `g${i}`,
    playedAt: `2026-02-${String(i + 1).padStart(2, '0')}T00:00:00Z`,
    lines: Object.entries(lines).map(([playerId, rows]) => {
      const [minutes, primary, efficiency, plusMinus] = rows[i]!;
      return { playerId, minutes, primary, secondary: 0, tertiary: 0, efficiency, plusMinus };
    }),
  }));
};

describe('trendAcrossWindow', () => {
  it('is zero for a flat series', () => {
    expect(trendAcrossWindow([20, 20, 20, 20])).toBe(0);
  });

  it('reports the total change for a linear rise', () => {
    expect(trendAcrossWindow([10, 12, 14, 16])).toBeCloseTo(6, 6);
  });

  it('is negative for a decline', () => {
    expect(trendAcrossWindow([30, 28, 26, 24])).toBeCloseTo(-6, 6);
  });

  it('handles fewer than two points', () => {
    expect(trendAcrossWindow([])).toBe(0);
    expect(trendAcrossWindow([5])).toBe(0);
  });
});

describe('computeUtilization', () => {
  it('ranks an efficient low-minute player above an inefficient starter', () => {
    // Bench player: 15 minutes, 12 points (28.8 per 36), team +8 with him on.
    // Starter: 34 minutes, 12 points (12.7 per 36), team -6 with him on.
    const metrics = computeUtilization(
      [player('bench', { role: 'bench' }), player('starter', { role: 'starter' })],
      boxes({
        bench: Array.from({ length: 10 }, () => [15, 12, 62, 8] as [number, number, number, number]),
        starter: Array.from({ length: 10 }, () => [34, 12, 48, -6] as [number, number, number, number]),
      }),
    );

    const bench = metrics.find((m) => m.playerId === 'bench')!;
    const starter = metrics.find((m) => m.playerId === 'starter')!;

    expect(bench.per36Primary).toBeCloseTo(28.8, 1);
    expect(starter.per36Primary).toBeCloseTo(12.7, 1);
    expect(bench.utilizationVerdict).toBeGreaterThan(starter.utilizationVerdict);
    expect(bench.flags).toContain('produces in limited minutes');
    expect(starter.flags).toContain('team is worse with them on');
  });

  it('detects a rising minutes trend', () => {
    const metrics = computeUtilization(
      [player('rookie', { age: 21, yearsPro: 1 })],
      boxes({
        rookie: [8, 10, 12, 14, 16, 18, 20, 22, 24, 26].map(
          (m) => [m, m * 0.5, 58, 2] as [number, number, number, number],
        ),
      }),
    );
    expect(metrics[0]!.minutesTrend).toBeGreaterThan(4);
    expect(metrics[0]!.flags).toContain('minutes trending up');
    expect(metrics[0]!.flags).toContain('young player');
  });

  it('excludes players with no appearances', () => {
    const metrics = computeUtilization(
      [player('a'), player('ghost')],
      boxes({ a: Array.from({ length: 5 }, () => [20, 10, 55, 0] as [number, number, number, number]) }),
    );
    expect(metrics.map((m) => m.playerId)).toEqual(['a']);
  });

  it('keeps the verdict inside 0-100', () => {
    const metrics = computeUtilization(
      [player('star'), player('scrub')],
      boxes({
        star: Array.from({ length: 6 }, () => [5, 30, 99, 40] as [number, number, number, number]),
        scrub: Array.from({ length: 6 }, () => [40, 0, 5, -40] as [number, number, number, number]),
      }),
    );
    for (const m of metrics) {
      expect(m.utilizationVerdict).toBeGreaterThanOrEqual(0);
      expect(m.utilizationVerdict).toBeLessThanOrEqual(100);
    }
  });

  it('returns nothing when there are no box scores', () => {
    expect(computeUtilization([player('a')], [])).toEqual([]);
  });
});

describe('heuristicInsights', () => {
  it('cites only numbers present in the metrics', () => {
    const metrics = computeUtilization(
      [player('bench', { role: 'bench' }), player('starter', { role: 'starter' })],
      boxes({
        bench: Array.from({ length: 10 }, () => [14, 12, 62, 7] as [number, number, number, number]),
        starter: Array.from({ length: 10 }, () => [33, 11, 47, -5] as [number, number, number, number]),
      }),
    );
    const insights = heuristicInsights(metrics, 'points');
    expect(insights.length).toBeGreaterThan(0);

    const evidence = insights.flatMap((i) => i.evidence).join(' ');
    const bench = metrics.find((m) => m.playerId === 'bench')!;
    expect(evidence).toContain(String(bench.per36Primary));
  });

  it('never tells an above-median producer to play less', () => {
    // The composite verdict can dip on heavy minutes alone. The recommendation
    // must still agree with the evidence it cites.
    const metrics = computeUtilization(
      [player('workhorse', { role: 'starter' }), player('filler', { role: 'rotation' })],
      boxes({
        // 34 minutes, 24 points — a high per-36 on heavy usage.
        workhorse: Array.from({ length: 10 }, () => [34, 24, 60, 1] as [number, number, number, number]),
        filler: Array.from({ length: 10 }, () => [22, 6, 46, -1] as [number, number, number, number]),
      }),
    );
    const insights = heuristicInsights(metrics, 'points');
    const trimmed = insights.filter((i) => i.recommendation.startsWith('Trim'));
    expect(trimmed.map((i) => i.playerId)).not.toContain('workhorse');
  });

  it('does not extrapolate a recommendation from a six-minute cameo', () => {
    const metrics = computeUtilization(
      [player('cameo', { role: 'bench' }), player('regular', { role: 'starter' })],
      boxes({
        cameo: Array.from({ length: 10 }, () => [6, 8, 70, 6] as [number, number, number, number]),
        regular: Array.from({ length: 10 }, () => [30, 12, 50, 0] as [number, number, number, number]),
      }),
    );
    const insights = heuristicInsights(metrics, 'points');
    expect(insights.filter((i) => i.playerId === 'cameo')).toHaveLength(0);
  });

  it('says so plainly when no reallocation is indicated', () => {
    const metrics = computeUtilization(
      [player('a'), player('b')],
      boxes({
        a: Array.from({ length: 6 }, () => [24, 12, 55, 0] as [number, number, number, number]),
        b: Array.from({ length: 6 }, () => [24, 12, 55, 0] as [number, number, number, number]),
      }),
    );
    const insights = heuristicInsights(metrics, 'points');
    expect(insights).toHaveLength(1);
    expect(insights[0]!.recommendation).toMatch(/No minute reallocation/);
  });
});
