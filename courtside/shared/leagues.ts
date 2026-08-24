import type { LeagueId } from './types.ts';

/**
 * Per-league structure of a game. This is domain knowledge, not simulation
 * detail — the client needs it to label a clock, the diff engine needs it to
 * decide what "late and close" means, and the mock provider needs it to
 * generate a plausible game. One definition, three consumers.
 */
export interface LeagueShape {
  /** Regulation periods. */
  periods: number;
  periodSeconds: number;
  periodLabel: (period: number) => string;
  /** Margin at or under which the closing minutes count as clutch. */
  clutchMargin: number;
  clutchSeconds: number;
  /** Whether a regulation draw is a legitimate result. */
  allowsDraw: boolean;
  /** What the score counts, for labelling. */
  scoreUnit: string;
}

export const LEAGUE_SHAPE: Record<LeagueId, LeagueShape> = {
  nba: {
    periods: 4,
    periodSeconds: 720,
    periodLabel: (p) => (p > 4 ? `OT${p - 4}` : `Q${p}`),
    clutchMargin: 5,
    clutchSeconds: 300,
    allowsDraw: false,
    scoreUnit: 'points',
  },
  nfl: {
    periods: 4,
    periodSeconds: 900,
    periodLabel: (p) => (p > 4 ? 'OT' : `Q${p}`),
    clutchMargin: 8,
    clutchSeconds: 300,
    allowsDraw: false,
    scoreUnit: 'points',
  },
  epl: {
    periods: 2,
    periodSeconds: 2700,
    periodLabel: (p) => (p === 1 ? '1st half' : '2nd half'),
    clutchMargin: 1,
    clutchSeconds: 600,
    allowsDraw: true,
    scoreUnit: 'goals',
  },
  tennis: {
    // Sets, not timed periods. The clock stands in for match progress.
    periods: 5,
    periodSeconds: 2400,
    periodLabel: (p) => `Set ${p}`,
    clutchMargin: 1,
    clutchSeconds: 900,
    allowsDraw: false,
    scoreUnit: 'sets',
  },
};

/** "3:41 Q4", "68' 2nd half", "Set 3" — whatever that league actually says. */
export function describeClock(leagueId: LeagueId, period: number, clock: string): string {
  const shape = LEAGUE_SHAPE[leagueId];
  if (leagueId === 'tennis') return shape.periodLabel(period);
  return `${clock} ${shape.periodLabel(period)}`;
}
