/** Domain model shared by server and client. All timestamps are ISO-8601 UTC. */

export type LeagueId = 'nba' | 'nfl' | 'epl' | 'tennis';

export const LEAGUE_LABELS: Record<LeagueId, string> = {
  nba: 'NBA',
  nfl: 'NFL',
  epl: 'Premier League',
  tennis: 'Tennis',
};

/**
 * Tennis players are modelled as single-competitor "teams" so that schedules,
 * live state and the watchability engine have exactly one code path. A tennis
 * team always has a roster of one and `isIndividual: true`.
 */
export interface Team {
  id: string;
  leagueId: LeagueId;
  name: string;
  shortName: string;
  abbrev: string;
  city: string;
  /** Venue coordinates, used for travel distance in the difficulty model. */
  lat: number;
  lon: number;
  timezone: string;
  /** Metres above sea level; feeds the altitude penalty. */
  altitude: number;
  conference?: string;
  /** 0-100 normalised strength. Net rating, xG differential or Elo, scaled. */
  rating: number;
  record: { w: number; l: number; d: number };
  /** Positive = win streak, negative = losing streak. */
  streak: number;
  colors: [string, string];
  isIndividual?: boolean;
  /** Team ids this team has a genuine rivalry with. */
  rivals: string[];
}

export type InjuryStatus =
  | 'OUT'
  | 'DOUBTFUL'
  | 'QUESTIONABLE'
  | 'PROBABLE'
  | 'GTD'
  | 'ACTIVE';

export interface Injury {
  status: InjuryStatus;
  description: string;
  expectedReturn?: string;
  /** When the report was published — surfaced in the UI as staleness. */
  reportedAt: string;
}

export type RosterRole = 'starter' | 'rotation' | 'bench';

export interface PlayerSeasonStats {
  gamesPlayed: number;
  minutesPerGame: number;
  /** Points, or goals in EPL. */
  primary: number;
  secondary: number;
  tertiary: number;
  /** True shooting % for NBA, completion % for NFL, xG/90 for EPL. */
  efficiency: number;
  usageRate: number;
  /** Team point differential per 100 possessions with this player on court. */
  onOffDiff: number;
}

export interface Player {
  id: string;
  teamId: string;
  name: string;
  position: string;
  number: number;
  age: number;
  yearsPro: number;
  role: RosterRole;
  /** 0-100. Drives the starPower component of watchability. */
  starRating: number;
  stats: PlayerSeasonStats;
  injury?: Injury;
}

export type GameState = 'scheduled' | 'live' | 'final';
export type SeasonPhase = 'preseason' | 'early' | 'mid' | 'late' | 'playoffs';

export interface LiveState {
  homeScore: number;
  awayScore: number;
  /** Quarter, half, or set number. */
  period: number;
  /** Display clock, e.g. "3:41" or "40-30". */
  clock: string;
  /** Seconds remaining in the current period. */
  secondsRemaining: number;
  possession?: 'home' | 'away';
  /** Sport-specific context, e.g. "3rd & 4 at PHI 22". */
  situation?: string;
  updatedAt: string;
}

export interface Game {
  id: string;
  leagueId: LeagueId;
  startsAt: string;
  homeTeamId: string;
  awayTeamId: string;
  venue: string;
  /** Broadcasters, matched against the user's subscriptions. */
  broadcast: string[];
  state: GameState;
  live?: LiveState;
  seasonPhase: SeasonPhase;
  /** Free-text storyline seeds: "first meeting since the Finals". */
  notes: string[];
  /** Tennis only: round name within a draw. */
  round?: string;
  tournament?: string;
}

export interface BoxScoreLine {
  playerId: string;
  minutes: number;
  primary: number;
  secondary: number;
  tertiary: number;
  efficiency: number;
  plusMinus: number;
}

export interface BoxScore {
  gameId: string;
  playedAt: string;
  lines: BoxScoreLine[];
}

export interface StandingsRow {
  teamId: string;
  rank: number;
  w: number;
  l: number;
  d: number;
  points?: number;
  gamesBack?: number;
}

// ---------------------------------------------------------------------------
// Scoring
// ---------------------------------------------------------------------------

export type WatchBucket =
  | 'appointment'
  | 'must-watch'
  | 'worth-it'
  | 'check-score'
  | 'skip';

export const WATCH_BUCKET_LABELS: Record<WatchBucket, string> = {
  appointment: 'Appointment',
  'must-watch': 'Must-watch',
  'worth-it': 'Worth it',
  'check-score': 'Check the score',
  skip: 'Skip',
};

export type WatchComponent =
  | 'stakes'
  | 'quality'
  | 'competitiveness'
  | 'starPower'
  | 'personalFit'
  | 'storyline'
  | 'convenience';

export interface WatchScore {
  score: number;
  bucket: WatchBucket;
  /** Each component normalised 0-1, before weighting. */
  components: Record<WatchComponent, number>;
  /** Plain-English top contributors. Never render the number without these. */
  reasons: string[];
  impliedWinProb: number;
}

export interface DifficultyScore {
  gameId: string;
  /** 0-100, higher is harder. */
  score: number;
  tier: 'easy' | 'moderate' | 'tough' | 'brutal';
  winProb: number;
  factors: string[];
  restDays: number;
  isBackToBack: boolean;
  travelKm: number;
}

export interface ScheduleStretch {
  kind: 'gauntlet' | 'soft' | 'trap';
  gameIds: string[];
  label: string;
  detail: string;
}

export interface TeamSchedule {
  teamId: string;
  games: Array<{ game: Game; difficulty: DifficultyScore }>;
  stretches: ScheduleStretch[];
  projectedRecord: { w: number; l: number };
}

// ---------------------------------------------------------------------------
// Live events and alerts
// ---------------------------------------------------------------------------

export type GameEventType =
  | 'SCORE_CHANGE'
  | 'LEAD_CHANGE'
  | 'PERIOD_START'
  | 'PERIOD_END'
  | 'FINAL'
  | 'CLOSE_GAME'
  | 'INJURY'
  | 'RED_CARD'
  | 'EJECTION'
  | 'MILESTONE'
  | 'UPSET_BREWING'
  | 'TENNIS_SET_POINT'
  | 'TENNIS_MATCH_POINT'
  | 'PENALTY_SHOOTOUT'
  | 'RED_ZONE'
  | 'FOURTH_DOWN_GOING_FOR_IT'
  | 'DROP_EVERYTHING';

export type AlertTier = 'all' | 'key' | 'clutch' | 'final' | 'off';

/**
 * What a game's alerting actually resolves to. `discover` is the state of a
 * game you have expressed no opinion about: silent, except that it can still
 * raise a drop-everything alert. An explicit `off` is different — it means you
 * muted this team, and it is honoured absolutely.
 */
export type EffectiveAlertTier = AlertTier | 'discover';

export const ALERT_TIER_LABELS: Record<AlertTier, string> = {
  all: 'Every score change',
  key: 'Key moments',
  clutch: 'Clutch only',
  final: 'Final only',
  off: 'Off',
};

export interface GameEvent {
  id: string;
  gameId: string;
  type: GameEventType;
  headline: string;
  detail: string;
  /** Deduplication key: gameId + type + game clock. */
  dedupeKey: string;
  homeScore: number;
  awayScore: number;
  period: number;
  clock: string;
  createdAt: string;
}

// ---------------------------------------------------------------------------
// Preferences
// ---------------------------------------------------------------------------

export interface WatchWindow {
  /** 0 = Sunday. */
  day: number;
  startHour: number;
  endHour: number;
}

export interface Preferences {
  timezone: string;
  trackedTeamIds: string[];
  trackedPlayerIds: string[];
  subscriptions: string[];
  watchWindows: WatchWindow[];
  /** Per-team alert tier; falls back to defaultAlertTier. */
  alertTiers: Record<string, AlertTier>;
  defaultAlertTier: AlertTier;
  /** watchScore at or above which a clutch game triggers a drop-everything alert. */
  dropEverythingThreshold: number;
}

// ---------------------------------------------------------------------------
// Insights
// ---------------------------------------------------------------------------

export interface UtilizationMetric {
  playerId: string;
  playerName: string;
  minutesPerGame: number;
  /** Change in minutes per game across the window; positive = trending up. */
  minutesTrend: number;
  per36Primary: number;
  usageRate: number;
  onOffDiff: number;
  efficiency: number;
  flags: string[];
  /** Deterministic 0-100 verdict: >60 play more, <40 play less. */
  utilizationVerdict: number;
}

export interface Insight {
  playerId?: string;
  headline: string;
  recommendation: string;
  evidence: string[];
  confidence: 'high' | 'medium' | 'low';
}

export interface TeamInsights {
  teamId: string;
  gamesPlayed: number;
  generatedAt: string;
  /** "ai" when produced by the model, "heuristic" when produced from rules. */
  source: 'ai' | 'heuristic';
  model?: string;
  insights: Insight[];
  metrics: UtilizationMetric[];
}

// ---------------------------------------------------------------------------
// API envelopes
// ---------------------------------------------------------------------------

export interface RankedGame {
  game: Game;
  home: Team;
  away: Team;
  watch: WatchScore;
  /** Empty when every broadcaster is in the user's subscriptions. */
  unavailableOn: string[];
}

export interface ProviderHealth {
  provider: string;
  callsToday: number;
  dailyLimit: number;
  cacheHitRate: number;
  lastError: string | null;
  lastSuccessAt: string | null;
  byEndpoint: Array<{ endpoint: string; calls: number; hits: number; misses: number }>;
}

export interface DataFreshness {
  /** Null means the fetch has never succeeded — render an unavailable state. */
  lastSuccessAt: string | null;
  stale: boolean;
}
