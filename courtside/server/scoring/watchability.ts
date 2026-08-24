import type {
  Game,
  InjuryStatus,
  Player,
  Preferences,
  Team,
  WatchBucket,
  WatchComponent,
  WatchScore,
} from '../../shared/types.ts';

/**
 * Deterministic watchability scoring.
 *
 * This is intentionally a pure function with no I/O and no model call: the
 * number has to be reproducible and testable. The language model is only ever
 * asked to phrase the reasons this function has already computed.
 */

export const WEIGHTS: Record<WatchComponent, number> = {
  stakes: 0.22,
  quality: 0.18,
  competitiveness: 0.18,
  starPower: 0.15,
  personalFit: 0.15,
  storyline: 0.07,
  convenience: 0.05,
};

const PHASE_WEIGHT = {
  preseason: 0.05,
  early: 0.3,
  mid: 0.5,
  late: 0.8,
  playoffs: 1,
} as const;

/** Rating points of home advantage, on the same 0-100 scale as Team.rating. */
const HOME_ADVANTAGE: Record<string, number> = {
  nba: 2.5,
  nfl: 2.2,
  epl: 3.5,
  tennis: 0,
};

const AVAILABILITY: Record<InjuryStatus, number> = {
  OUT: 0,
  DOUBTFUL: 0.25,
  QUESTIONABLE: 0.5,
  GTD: 0.6,
  PROBABLE: 0.9,
  ACTIVE: 1,
};

export interface WatchInput {
  game: Game;
  home: Team;
  away: Team;
  homePlayers: Player[];
  awayPlayers: Player[];
  prefs: Preferences;
  now: Date;
}

const clamp01 = (n: number) => Math.max(0, Math.min(1, n));

/** Availability-weighted star rating, so a ruled-out superstar stops counting. */
export function availableStarRating(player: Player): number {
  const multiplier = player.injury ? AVAILABILITY[player.injury.status] : 1;
  return player.starRating * multiplier;
}

/**
 * Logistic win probability from the rating gap. A 25-point rating edge is
 * roughly a 10:1 favourite, which matches how these leagues actually behave.
 */
export function impliedWinProbability(home: Team, away: Team, leagueId: string): number {
  const diff = home.rating - away.rating + (HOME_ADVANTAGE[leagueId] ?? 0);
  return 1 / (1 + Math.pow(10, -diff / 25));
}

function inWatchWindow(startsAt: Date, prefs: Preferences): 'inside' | 'edge' | 'outside' {
  // Intl gives us the user's local wall-clock without pulling in a date library.
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: prefs.timezone,
    weekday: 'short',
    hour: 'numeric',
    minute: 'numeric',
    hour12: false,
  }).formatToParts(startsAt);

  const weekdayName = parts.find((p) => p.type === 'weekday')?.value ?? 'Sun';
  const hour = Number(parts.find((p) => p.type === 'hour')?.value ?? '0');
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const day = days.indexOf(weekdayName);

  const windows = prefs.watchWindows.filter((w) => w.day === day);
  if (windows.length === 0) return 'outside';
  for (const w of windows) {
    if (hour >= w.startHour && hour < w.endHour) return 'inside';
    if (hour >= w.startHour - 1 && hour < w.endHour + 1) return 'edge';
  }
  return 'outside';
}

function computeStakes(input: WatchInput): { value: number; reason?: string } {
  const { game, home, away } = input;
  let value: number = PHASE_WEIGHT[game.seasonPhase];
  let reason: string | undefined;

  if (game.seasonPhase === 'playoffs') {
    reason = 'Playoff game — season on the line';
  } else if (game.seasonPhase === 'late') {
    reason = 'Late-season game with seeding on the line';
  }

  const rivals = home.rivals.includes(away.id) || away.rivals.includes(home.id);
  if (rivals) {
    value += 0.2;
    reason = `${home.shortName}–${away.shortName} rivalry`;
  }

  // Two genuine contenders meeting matters more than the calendar suggests.
  if (home.rating >= 60 && away.rating >= 60) {
    value += 0.15;
    reason ??= `Both sides are top-tier in ${home.conference ?? 'the league'}`;
  }

  return { value: clamp01(value), reason };
}

/**
 * Ratings cluster in a much narrower band than 0-100 — a 78 is a title
 * favourite and a 38 is bottom of the table. Normalising against the raw scale
 * would cap every component at ~0.78 and quietly compress the whole score, so
 * quality is mapped across the range these leagues actually occupy.
 */
const QUALITY_FLOOR = 32;
const QUALITY_CEILING = 78;

function computeQuality(input: WatchInput): { value: number; reason?: string } {
  const { home, away } = input;
  // min(), not average: a 70-rated team beating a 20-rated team is not a game.
  const worse = Math.min(home.rating, away.rating);
  const value = clamp01((worse - QUALITY_FLOOR) / (QUALITY_CEILING - QUALITY_FLOOR));
  const reason =
    worse >= 60
      ? 'Two strong teams — no weak link in this matchup'
      : worse < QUALITY_FLOOR + 6
        ? `${home.rating < away.rating ? home.shortName : away.shortName} is well off the pace`
        : undefined;
  return { value, reason };
}

function computeCompetitiveness(
  input: WatchInput,
  winProb: number,
): { value: number; reason?: string } {
  const value = clamp01(1 - 2 * Math.abs(0.5 - winProb));
  const pct = Math.round(Math.max(winProb, 1 - winProb) * 100);
  const favourite = winProb >= 0.5 ? input.home.shortName : input.away.shortName;
  const reason =
    value >= 0.85
      ? 'Coin-flip matchup on paper'
      : value <= 0.35
        ? `${favourite} favoured at roughly ${pct}%`
        : undefined;
  return { value, reason };
}

function computeStarPower(input: WatchInput): { value: number; reason?: string } {
  const all = [...input.homePlayers, ...input.awayPlayers];
  const ranked = [...all].sort((a, b) => b.starRating - a.starRating);
  const topThree = ranked.slice(0, 3);
  if (topThree.length === 0) return { value: 0 };

  const available = topThree.reduce((sum, p) => sum + availableStarRating(p), 0);
  const value = clamp01(available / (topThree.length * 100));

  // Call out a headliner who is ruled out — that is the whole reason the
  // component moved, and the user needs to know before they commit an evening.
  const sidelined = topThree.find((p) => p.injury && AVAILABILITY[p.injury.status] <= 0.5);
  if (sidelined && sidelined.injury) {
    return { value, reason: `${sidelined.name} is ${sidelined.injury.status}` };
  }
  const headliner = topThree[0];
  if (headliner && value >= 0.75) {
    return { value, reason: `${headliner.name} headlines a healthy marquee lineup` };
  }
  return { value };
}

function computePersonalFit(input: WatchInput): { value: number; reason?: string } {
  const { game, home, away, prefs, homePlayers, awayPlayers } = input;
  const tracked = new Set(prefs.trackedTeamIds);
  const homeTracked = tracked.has(game.homeTeamId);
  const awayTracked = tracked.has(game.awayTeamId);

  let value = 0.1;
  let reason: string | undefined;

  if (homeTracked && awayTracked) {
    value = 1;
    reason = 'Both of your teams are playing';
  } else if (homeTracked || awayTracked) {
    value = 0.75;
    const tracked_ = homeTracked ? home : away;
    reason = `${tracked_.shortName} ${tracked_.isIndividual ? 'is' : 'are'} one of your teams`;
  } else if (
    prefs.trackedTeamIds.some(
      (id) => home.rivals.includes(id) || away.rivals.includes(id),
    )
  ) {
    value = 0.5;
    reason = 'Direct rival of one of your teams';
  }

  const trackedPlayers = new Set(prefs.trackedPlayerIds);
  const player = [...homePlayers, ...awayPlayers].find((p) => trackedPlayers.has(p.id));
  if (player) {
    value = Math.max(value, 0.8);
    reason ??= `${player.name} is on your watchlist`;
  }

  return { value: clamp01(value), reason };
}

function computeStoryline(input: WatchInput): { value: number; reason?: string } {
  const { game, home, away } = input;
  let value = Math.min(game.notes.length * 0.3, 0.9);
  let reason = game.notes[0];

  const hottest = Math.abs(home.streak) >= Math.abs(away.streak) ? home : away;
  if (Math.abs(hottest.streak) >= 5) {
    value += 0.3;
    const verb = hottest.streak > 0 ? 'won' : 'lost';
    reason ??= `${hottest.shortName} have ${verb} ${Math.abs(hottest.streak)} straight`;
  }

  return { value: clamp01(value), reason };
}

function computeConvenience(input: WatchInput): {
  value: number;
  reason?: string;
  unavailableOn: string[];
} {
  const { game, prefs } = input;
  const placement = inWatchWindow(new Date(game.startsAt), prefs);
  let value = placement === 'inside' ? 1 : placement === 'edge' ? 0.6 : 0.25;

  const subs = prefs.subscriptions.map((s) => s.toLowerCase());
  const carried = game.broadcast.filter((b) => subs.includes(b.toLowerCase()));
  const unavailableOn = carried.length > 0 ? [] : game.broadcast;
  // A penalty, never a veto — a great game you have to go find is still great.
  if (carried.length === 0 && game.broadcast.length > 0) value *= 0.5;

  const reason =
    placement === 'outside'
      ? 'Starts outside the hours you usually watch'
      : carried.length === 0 && game.broadcast.length > 0
        ? `Not on your services (${game.broadcast.join(', ')})`
        : undefined;

  return { value: clamp01(value), reason, unavailableOn };
}

export function bucketFor(score: number): WatchBucket {
  if (score >= 90) return 'appointment';
  if (score >= 75) return 'must-watch';
  if (score >= 55) return 'worth-it';
  if (score >= 35) return 'check-score';
  return 'skip';
}

export interface WatchScoreResult extends WatchScore {
  unavailableOn: string[];
}

export function scoreWatchability(input: WatchInput): WatchScoreResult {
  const winProb = impliedWinProbability(input.home, input.away, input.game.leagueId);

  const stakes = computeStakes(input);
  const quality = computeQuality(input);
  const competitiveness = computeCompetitiveness(input, winProb);
  const starPower = computeStarPower(input);
  const personalFit = computePersonalFit(input);
  const storyline = computeStoryline(input);
  const convenience = computeConvenience(input);

  const components: Record<WatchComponent, number> = {
    stakes: stakes.value,
    quality: quality.value,
    competitiveness: competitiveness.value,
    starPower: starPower.value,
    personalFit: personalFit.value,
    storyline: storyline.value,
    convenience: convenience.value,
  };

  const score =
    Object.entries(components).reduce(
      (sum, [key, value]) => sum + value * WEIGHTS[key as WatchComponent],
      0,
    ) * 100;

  // Rank reasons by how much each component actually contributed, so the
  // explanation always matches the number rather than restating the matchup.
  const candidates: Array<{ component: WatchComponent; reason?: string }> = [
    { component: 'stakes', reason: stakes.reason },
    { component: 'personalFit', reason: personalFit.reason },
    { component: 'competitiveness', reason: competitiveness.reason },
    { component: 'starPower', reason: starPower.reason },
    { component: 'quality', reason: quality.reason },
    { component: 'storyline', reason: storyline.reason },
    { component: 'convenience', reason: convenience.reason },
  ];

  const reasons = candidates
    .filter((c): c is { component: WatchComponent; reason: string } => Boolean(c.reason))
    .sort(
      (a, b) =>
        components[b.component] * WEIGHTS[b.component] -
        components[a.component] * WEIGHTS[a.component],
    )
    .slice(0, 3)
    .map((c) => c.reason);

  const rounded = Math.round(score * 10) / 10;
  return {
    score: rounded,
    bucket: bucketFor(rounded),
    components,
    reasons,
    impliedWinProb: winProb,
    unavailableOn: convenience.unavailableOn,
  };
}
