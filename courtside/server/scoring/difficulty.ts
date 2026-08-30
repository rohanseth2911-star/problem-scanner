import type {
  DifficultyScore,
  Game,
  ScheduleStretch,
  Team,
  TeamSchedule,
} from '../../shared/types.ts';
import { impliedWinProbability } from './watchability.ts';

/**
 * Deterministic schedule-difficulty scoring. Difficulty is *not* just opponent
 * strength: rest, travel and altitude routinely swing a game more than a few
 * points of rating do, and they are the part a standings table never shows.
 */

const EARTH_RADIUS_KM = 6371;

export function haversineKm(
  a: { lat: number; lon: number },
  b: { lat: number; lon: number },
): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLon = toRad(b.lon - a.lon);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(h));
}

const DAY_MS = 86_400_000;

function daysBetween(a: string, b: string): number {
  return Math.max(0, Math.round((new Date(b).getTime() - new Date(a).getTime()) / DAY_MS));
}

export interface DifficultyInput {
  team: Team;
  game: Game;
  opponent: Team;
  /** Chronologically previous games for this team, most recent last. */
  previousGames: Game[];
  teamsById: Map<string, Team>;
}

export function scoreDifficulty(input: DifficultyInput): DifficultyScore {
  const { team, game, opponent, previousGames, teamsById } = input;
  const factors: string[] = [];

  const isHome = game.homeTeamId === team.id;
  const home = isHome ? team : opponent;
  const away = isHome ? opponent : team;
  const homeWinProb = impliedWinProbability(home, away, game.leagueId);
  let winProb = isHome ? homeWinProb : 1 - homeWinProb;

  // Opponent strength is the spine of the score; everything else adjusts it.
  let score = opponent.rating * 0.75;
  if (opponent.rating >= 65) factors.push(`${opponent.shortName} are elite (${opponent.rating} rating)`);

  if (!isHome) {
    score += 6;
    factors.push('On the road');
  }

  const prev = previousGames.at(-1);
  const restDays = prev ? daysBetween(prev.startsAt, game.startsAt) : 3;
  const isBackToBack = restDays <= 1;

  if (isBackToBack) {
    score += 9;
    factors.push('Back-to-back');
  } else if (restDays >= 3) {
    score -= 4;
    factors.push(`${restDays} days rest`);
  }

  // Density matters beyond the single previous game: 3-in-4 and 4-in-6 are the
  // stretches where rotations get short and legs go.
  const windowCount = (days: number) =>
    previousGames.filter(
      (g) => daysBetween(g.startsAt, game.startsAt) < days,
    ).length + 1;

  if (windowCount(4) >= 3) {
    score += 5;
    factors.push('Third game in four nights');
  } else if (windowCount(6) >= 4) {
    score += 3;
    factors.push('Fourth game in six nights');
  }

  let travelKm = 0;
  if (prev) {
    const prevVenueTeam = teamsById.get(prev.homeTeamId);
    const thisVenueTeam = teamsById.get(game.homeTeamId);
    if (prevVenueTeam && thisVenueTeam) {
      travelKm = haversineKm(prevVenueTeam, thisVenueTeam);
      if (travelKm > 2500) {
        score += 5;
        factors.push(`${Math.round(travelKm)} km trip`);
      } else if (travelKm > 1200) {
        score += 2.5;
      }
      if (prevVenueTeam.timezone !== thisVenueTeam.timezone && travelKm > 800) {
        score += 2;
        factors.push('Timezone change');
      }
    }
  }

  const venueTeam = teamsById.get(game.homeTeamId);
  if (!isHome && venueTeam && venueTeam.altitude >= 1500) {
    score += 4;
    factors.push(`Altitude in ${venueTeam.city}`);
  }

  // A rested opponent against tired legs is the classic schedule loss.
  if (isBackToBack) {
    score += 2;
  }

  // Injuries on either side move the true difficulty, and they move it now —
  // this is recomputed on every view rather than frozen at schedule release.
  score = Math.max(0, Math.min(100, score));

  const tier: DifficultyScore['tier'] =
    score >= 72 ? 'brutal' : score >= 56 ? 'tough' : score >= 40 ? 'moderate' : 'easy';

  return {
    gameId: game.id,
    score: Math.round(score * 10) / 10,
    tier,
    winProb,
    factors,
    restDays,
    isBackToBack,
    travelKm: Math.round(travelKm),
  };
}

/**
 * Finds the runs that actually change how a season feels: gauntlets to survive,
 * soft patches to bank wins in, and trap games between marquee matchups.
 */
export function findStretches(
  entries: Array<{ game: Game; difficulty: DifficultyScore }>,
  teamsById: Map<string, Team>,
  teamId: string,
): ScheduleStretch[] {
  const stretches: ScheduleStretch[] = [];
  if (entries.length < 4) return stretches;

  const scores = entries.map((e) => e.difficulty.score);

  // Thresholds come from the distribution of rolling four-game *averages*, not
  // of individual games. The question a stretch answers is "is this run hard
  // compared with the rest of this schedule's runs", and on a lumpy schedule
  // the per-game quartile sits so high that no run of four can ever clear it.
  const windowAverages: number[] = [];
  for (let i = 0; i + 4 <= scores.length; i++) {
    windowAverages.push(scores.slice(i, i + 4).reduce((a, b) => a + b, 0) / 4);
  }
  const sortedWindows = [...windowAverages].sort((a, b) => a - b);
  const q3 = sortedWindows[Math.floor(sortedWindows.length * 0.75)] ?? 0;
  const q1 = sortedWindows[Math.floor(sortedWindows.length * 0.25)] ?? 0;

  // Individual-game quartiles still define what counts as a trap game.
  const sortedGames = [...scores].sort((a, b) => a - b);
  const gameQ3 = sortedGames[Math.floor(sortedGames.length * 0.75)] ?? 0;
  const gameQ1 = sortedGames[Math.floor(sortedGames.length * 0.25)] ?? 0;

  const fmt = (iso: string) =>
    new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' });

  /**
   * A stretch is defined by the *average* difficulty of the run, not by every
   * game individually clearing the bar. Requiring each game to be top-quartile
   * would mean a gauntlet could never be longer than the quartile itself — the
   * three-brutal-games-and-a-winnable-one week is exactly the run that decides
   * seasons, and it has to be detectable.
   */
  const scanRuns = (kind: 'gauntlet' | 'soft') => {
    const threshold = kind === 'gauntlet' ? q3 : q1;
    const best: Array<{ start: number; end: number; avg: number }> = [];

    for (let start = 0; start < entries.length; start++) {
      for (let length = Math.min(8, entries.length - start); length >= 4; length--) {
        const window = entries.slice(start, start + length);
        const avg = window.reduce((sum, e) => sum + e.difficulty.score, 0) / window.length;
        const qualifies = kind === 'gauntlet' ? avg >= threshold : avg <= threshold;
        if (!qualifies) continue;
        // Longest window wins; overlapping shorter ones add nothing.
        if (best.some((b) => start <= b.end && start + length - 1 >= b.start)) break;
        best.push({ start, end: start + length - 1, avg });
        break;
      }
    }

    for (const { start, end, avg } of best) {
      const run = entries.slice(start, end + 1);
      const first = run[0]!;
      const last = run.at(-1)!;
      const roadGames = run.filter((e) => e.game.homeTeamId !== teamId).length;
      const eliteOpponents = run.filter((e) => {
        const oppId = e.game.homeTeamId === teamId ? e.game.awayTeamId : e.game.homeTeamId;
        return (teamsById.get(oppId)?.rating ?? 0) >= 60;
      }).length;

      stretches.push({
        kind,
        gameIds: run.map((e) => e.game.id),
        label: `${fmt(first.game.startsAt)}–${fmt(last.game.startsAt)}`,
        detail:
          kind === 'gauntlet'
            ? `${run.length} games, ${roadGames} on the road, ${eliteOpponents} against top-tier teams (avg difficulty ${avg.toFixed(0)})`
            : `${run.length} games, ${run.length - roadGames} at home, ${run.length - eliteOpponents} against beatable opponents — this is where they bank wins`,
      });
    }
  };

  scanRuns('gauntlet');
  scanRuns('soft');

  // A soft opponent wedged between two hard ones is where good teams slip.
  for (let i = 1; i < entries.length - 1; i++) {
    const before = entries[i - 1]!;
    const here = entries[i]!;
    const after = entries[i + 1]!;
    if (
      here.difficulty.score <= gameQ1 &&
      before.difficulty.score >= gameQ3 &&
      after.difficulty.score >= gameQ3
    ) {
      const oppId =
        here.game.homeTeamId === teamId ? here.game.awayTeamId : here.game.homeTeamId;
      stretches.push({
        kind: 'trap',
        gameIds: [here.game.id],
        label: fmt(here.game.startsAt),
        detail: `${teamsById.get(oppId)?.shortName ?? 'Opponent'} sandwiched between two of the hardest games on the schedule`,
      });
    }
  }

  return stretches;
}

export function buildSchedule(
  team: Team,
  games: Game[],
  teamsById: Map<string, Team>,
  history: Game[] = [],
): TeamSchedule {
  const ordered = [...games].sort(
    (a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime(),
  );

  const entries = ordered.map((game, index) => {
    const oppId = game.homeTeamId === team.id ? game.awayTeamId : game.homeTeamId;
    const opponent = teamsById.get(oppId);
    if (!opponent) throw new Error(`Unknown opponent ${oppId} for game ${game.id}`);
    return {
      game,
      difficulty: scoreDifficulty({
        team,
        game,
        opponent,
        previousGames: [...history, ...ordered.slice(0, index)].slice(-6),
        teamsById,
      }),
    };
  });

  const expectedWins = entries.reduce((sum, e) => sum + e.difficulty.winProb, 0);

  return {
    teamId: team.id,
    games: entries,
    stretches: findStretches(entries, teamsById, team.id),
    projectedRecord: {
      w: Math.round(expectedWins),
      l: entries.length - Math.round(expectedWins),
    },
  };
}
