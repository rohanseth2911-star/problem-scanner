import type {
  BoxScore,
  BoxScoreLine,
  Game,
  Injury,
  LeagueId,
  Player,
  RosterRole,
  StandingsRow,
  Team,
} from '../../shared/types.ts';
import type { SportsProvider } from './types.ts';
import { hashSeed, mulberry32, pick, randInt } from './rng.ts';
import { LEAGUE_SHAPE, type LeagueShape } from '../../shared/leagues.ts';
import { BROADCASTERS, TENNIS_ROUNDS, TOURNAMENTS, buildTeams } from './fixtures.ts';

/**
 * Fixture-backed provider. It exists so every screen, the scoring engines, the
 * diffing poller and the alert pipeline can be built and demonstrated without a
 * single API key — including a live game whose score genuinely advances.
 *
 * Everything it returns is clearly labelled as mock data in the UI. It is a
 * development harness, not a stand-in for a real feed.
 */

const DAY_MS = 86_400_000;
const MIN_MS = 60_000;

/** Simulated seconds of game clock per real second. */
const SIM_SPEED = Number(process.env.MOCK_SIM_SPEED ?? 2);

interface LeagueSim extends LeagueShape {
  /** Average game-clock seconds between scoring plays. */
  playInterval: number;
  scoreValues: number[];
}

/**
 * Simulation parameters layered on the shared league shape. The intervals are
 * tuned so a simulated final lands in the range the sport actually produces —
 * a 69-point NFL game or a 22-set tennis match makes every downstream screen
 * look broken, and makes the scoring engines look wrong when they are not.
 */
const SIMS: Record<LeagueId, LeagueSim> = {
  nba: { ...LEAGUE_SHAPE.nba, playInterval: 26, scoreValues: [2, 2, 2, 3, 3, 1] },
  nfl: { ...LEAGUE_SHAPE.nfl, playInterval: 380, scoreValues: [7, 7, 3, 3, 6] },
  epl: { ...LEAGUE_SHAPE.epl, playInterval: 1300, scoreValues: [1] },
  tennis: { ...LEAGUE_SHAPE.tennis, playInterval: 2000, scoreValues: [1] },
};

const GAME_DAYS: Record<LeagueId, number[]> = {
  nba: [0, 1, 2, 3, 4, 5, 6],
  nfl: [0, 1, 4],
  epl: [0, 2, 6],
  tennis: [0, 1, 2, 3, 4, 5, 6],
};

/** Local tip-off hours, chosen so the watch-window logic has something to say. */
const START_HOURS: Record<LeagueId, number[]> = {
  nba: [19, 19, 20, 22],
  nfl: [13, 16, 20],
  epl: [7, 10, 12, 15],
  tennis: [6, 9, 13],
};

const FIRST_NAMES = ['Andre', 'Marcus', 'Devin', 'Kai', 'Tobias', 'Elias', 'Jamal', 'Rowan', 'Cassius', 'Nico', 'Bruno', 'Malik', 'Theo', 'Dario', 'Isaiah', 'Emeka', 'Luca', 'Ravi', 'Soren', 'Quentin', 'Mateo', 'Jonas', 'Amir', 'Felix'];
const LAST_NAMES = ['Whitfield', 'Bagley', 'Okafor', 'Nyberg', 'Castellanos', 'Rutledge', 'Halloran', 'Deveraux', 'Mensah', 'Voss', 'Ibarra', 'Kowalski', 'Baptiste', 'Ferreira', 'Lindgren', 'Adeyemi', 'Marchetti', 'Sandoval', 'Kirby', 'Petrov', 'Abara', 'Delacroix', 'Nakamura', 'Ellington'];

const POSITIONS: Record<LeagueId, string[]> = {
  nba: ['PG', 'SG', 'SF', 'PF', 'C'],
  nfl: ['QB', 'RB', 'WR', 'TE', 'OL', 'EDGE', 'DL', 'LB', 'CB', 'S'],
  epl: ['GK', 'RB', 'CB', 'LB', 'CDM', 'CM', 'RW', 'LW', 'ST'],
  tennis: ['Singles'],
};

const ROSTER_SIZE: Record<LeagueId, number> = { nba: 14, nfl: 24, epl: 20, tennis: 1 };
const STARTERS: Record<LeagueId, number> = { nba: 5, nfl: 11, epl: 11, tennis: 1 };
const ROTATION: Record<LeagueId, number> = { nba: 4, nfl: 6, epl: 5, tennis: 0 };

const INJURY_KINDS = [
  ['Left ankle sprain', 12],
  ['Right knee soreness', 9],
  ['Hamstring strain', 18],
  ['Lower back tightness', 6],
  ['Shoulder contusion', 8],
  ['Illness', 3],
  ['Concussion protocol', 10],
] as const;

export class MockProvider implements SportsProvider {
  readonly name = 'mock';

  private readonly teams: Team[];
  private readonly teamsById: Map<string, Team>;
  private readonly rosters = new Map<string, Player[]>();
  private games: Game[] | null = null;
  /** Anchor so the demo always has games mid-flight the moment the server boots. */
  private readonly bootAt = Date.now();

  constructor() {
    this.teams = buildTeams();
    this.teamsById = new Map(this.teams.map((t) => [t.id, t]));
  }

  async getTeams(): Promise<Team[]> {
    return this.teams;
  }

  async getSchedule(teamId: string, from: Date, to: Date): Promise<Game[]> {
    const all = this.allGames();
    return all
      .filter(
        (g) =>
          (g.homeTeamId === teamId || g.awayTeamId === teamId) &&
          new Date(g.startsAt) >= from &&
          new Date(g.startsAt) <= to,
      )
      .map((g) => this.withLiveState(g));
  }

  async getGamesBetween(from: Date, to: Date): Promise<Game[]> {
    return this.allGames()
      .filter((g) => new Date(g.startsAt) >= from && new Date(g.startsAt) <= to)
      .map((g) => this.withLiveState(g));
  }

  async getLiveGames(): Promise<Game[]> {
    return this.allGames()
      .map((g) => this.withLiveState(g))
      .filter((g) => g.state === 'live');
  }

  async getRoster(teamId: string): Promise<Player[]> {
    const cached = this.rosters.get(teamId);
    if (cached) return cached;
    const team = this.teamsById.get(teamId);
    if (!team) return [];
    const roster = this.buildRoster(team);
    this.rosters.set(teamId, roster);
    return roster;
  }

  async getInjuries(teamId: string): Promise<Array<{ playerId: string; injury: Injury }>> {
    const roster = await this.getRoster(teamId);
    return roster
      .filter((p): p is Player & { injury: Injury } => Boolean(p.injury))
      .map((p) => ({ playerId: p.id, injury: p.injury }));
  }

  async getStandings(leagueId: string): Promise<StandingsRow[]> {
    const inLeague = this.teams
      .filter((t) => t.leagueId === leagueId)
      .sort((a, b) => b.rating - a.rating);
    const leader = inLeague[0];
    return inLeague.map((t, i) => ({
      teamId: t.id,
      rank: i + 1,
      w: t.record.w,
      l: t.record.l,
      d: t.record.d,
      points: leagueId === 'epl' ? t.record.w * 3 + t.record.d : undefined,
      gamesBack: leader ? (leader.record.w - t.record.w + (t.record.l - leader.record.l)) / 2 : 0,
    }));
  }

  async getBoxScores(teamId: string, limit: number): Promise<BoxScore[]> {
    const roster = await this.getRoster(teamId);
    const now = Date.now();
    const past = this.allGames()
      .filter(
        (g) =>
          (g.homeTeamId === teamId || g.awayTeamId === teamId) &&
          new Date(g.startsAt).getTime() < now,
      )
      .sort((a, b) => new Date(b.startsAt).getTime() - new Date(a.startsAt).getTime())
      .slice(0, limit);

    // Ordered oldest-first so a minutes trend line reads left to right.
    return past.reverse().map((game, index) => ({
      gameId: game.id,
      playedAt: game.startsAt,
      lines: roster.map((player) => this.boxLine(player, game, index, past.length)),
    }));
  }

  // -------------------------------------------------------------------------
  // Schedule generation
  // -------------------------------------------------------------------------

  private allGames(): Game[] {
    if (this.games) return this.games;

    const games: Game[] = [];
    const startDay = new Date(this.bootAt - 24 * DAY_MS);
    startDay.setUTCHours(0, 0, 0, 0);

    for (let dayOffset = 0; dayOffset < 60; dayOffset++) {
      const day = new Date(startDay.getTime() + dayOffset * DAY_MS);
      const weekday = day.getUTCDay();

      for (const leagueId of ['nba', 'nfl', 'epl', 'tennis'] as LeagueId[]) {
        if (!GAME_DAYS[leagueId].includes(weekday)) continue;
        const rng = mulberry32(hashSeed(`${leagueId}-${dayOffset}`));
        const pool = this.teams.filter((t) => t.leagueId === leagueId);

        // Bias tracked-team fixtures upward so the demo schedule is dense
        // where the user actually looks.
        const shuffled = [...pool].sort(() => rng() - 0.5);
        // Two fixtures a day across a ten-team pool puts each side at roughly
        // three games a week — the density that makes rest and travel mean
        // something. More than that and every game reads as a back-to-back.
        const perDay = 2;

        for (let i = 0; i < perDay * 2 && i + 1 < shuffled.length; i += 2) {
          const home = shuffled[i]!;
          const away = shuffled[i + 1]!;
          const hour = pick(rng, START_HOURS[leagueId]);
          const startsAt = new Date(day);
          startsAt.setUTCHours(hour + 5, randInt(rng, 0, 1) * 30, 0, 0);

          games.push(
            this.makeGame(leagueId, home, away, startsAt, rng, dayOffset),
          );
        }
      }
    }

    // Guarantee the live view has content the instant the server starts:
    // one marquee NBA game deep in the fourth, one EPL match at half time.
    games.push(...this.demoLiveGames());

    this.games = games.sort(
      (a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime(),
    );
    return this.games;
  }

  private makeGame(
    leagueId: LeagueId,
    home: Team,
    away: Team,
    startsAt: Date,
    rng: () => number,
    dayOffset: number,
  ): Game {
    const id = `${leagueId}-${home.abbrev}-${away.abbrev}-${startsAt.toISOString().slice(0, 10)}`;
    const notes: string[] = [];
    if (home.rivals.includes(away.id)) notes.push(`${home.shortName} host their oldest rival`);
    if (Math.abs(home.rating - away.rating) < 4 && home.rating > 62) {
      notes.push('Two of the top seeds separated by almost nothing');
    }
    if (rng() > 0.85) notes.push('First meeting since last season’s playoff series');

    const isTennis = leagueId === 'tennis';
    return {
      id,
      leagueId,
      startsAt: startsAt.toISOString(),
      homeTeamId: home.id,
      awayTeamId: away.id,
      venue: isTennis ? pick(rng, TOURNAMENTS) : `${home.city} — home`,
      broadcast: [pick(rng, BROADCASTERS[leagueId])],
      state: 'scheduled',
      seasonPhase: dayOffset > 45 ? 'late' : 'mid',
      notes,
      round: isTennis ? pick(rng, TENNIS_ROUNDS) : undefined,
      tournament: isTennis ? pick(rng, TOURNAMENTS) : undefined,
    };
  }

  /**
   * Games pinned relative to boot time. The NBA game is engineered to be inside
   * clutch time with a one-possession margin, because that is the exact state
   * the drop-everything alert exists to catch.
   */
  private demoLiveGames(): Game[] {
    const gsw = this.teamsById.get('nba-gsw')!;
    const okc = this.teamsById.get('nba-okc')!;
    const mci = this.teamsById.get('epl-mci')!;
    const liv = this.teamsById.get('epl-liv')!;

    // NBA: 48 minutes of clock at SIM_SPEED, started far enough back to be in Q4.
    const nbaElapsedClock = 41 * 60;
    const nbaStart = this.bootAt - (nbaElapsedClock / SIM_SPEED) * 1000;
    const eplElapsedClock = 52 * 60;
    const eplStart = this.bootAt - (eplElapsedClock / SIM_SPEED) * 1000;

    return [
      {
        id: 'nba-live-marquee',
        leagueId: 'nba',
        startsAt: new Date(nbaStart).toISOString(),
        homeTeamId: gsw.id,
        awayTeamId: okc.id,
        venue: 'San Francisco — home',
        broadcast: ['NBA League Pass', 'TNT'],
        state: 'scheduled',
        seasonPhase: 'late',
        notes: [
          'Winner takes the top seed in the West',
          'First meeting since last season’s conference finals',
        ],
      },
      {
        id: 'epl-live-marquee',
        leagueId: 'epl',
        startsAt: new Date(eplStart).toISOString(),
        homeTeamId: mci.id,
        awayTeamId: liv.id,
        venue: 'Manchester — home',
        broadcast: ['Peacock'],
        state: 'scheduled',
        seasonPhase: 'late',
        notes: ['Title race six-pointer'],
      },
      {
        id: 'nfl-tonight',
        leagueId: 'nfl',
        startsAt: new Date(this.bootAt + 90 * MIN_MS).toISOString(),
        homeTeamId: 'nfl-phi',
        awayTeamId: 'nfl-dal',
        venue: 'Philadelphia — home',
        broadcast: ['NBC', 'Peacock'],
        state: 'scheduled',
        seasonPhase: 'late',
        notes: ['Division lead on the line', 'Eagles have won four straight'],
      },
    ];
  }

  // -------------------------------------------------------------------------
  // Live simulation
  // -------------------------------------------------------------------------

  /**
   * Derives live state from wall-clock elapsed time. Because the play timeline
   * is generated deterministically from the game id, two calls a second apart
   * differ only by the plays that fell between them — which is precisely what
   * the poller's diff engine needs in order to emit real events.
   */
  private withLiveState(game: Game): Game {
    const sim = SIMS[game.leagueId];
    const now = Date.now();
    const startMs = game.id.includes('live-marquee')
      ? this.cycledStart(game, sim)
      : new Date(game.startsAt).getTime();
    if (now < startMs) return { ...game, state: 'scheduled' };

    const totalSeconds = sim.periods * sim.periodSeconds;
    const elapsedClock = ((now - startMs) / 1000) * SIM_SPEED;
    const timeline = this.timeline(game, sim, totalSeconds);

    const capped = Math.min(elapsedClock, totalSeconds);
    let homeScore = 0;
    let awayScore = 0;
    for (const play of timeline) {
      if (play.t > capped) break;
      if (play.side === 'home') homeScore += play.points;
      else awayScore += play.points;
    }

    if (elapsedClock >= totalSeconds) {
      return {
        ...game,
        state: 'final',
        live: {
          homeScore,
          awayScore,
          period: sim.periods,
          clock: 'Final',
          secondsRemaining: 0,
          updatedAt: new Date(now).toISOString(),
        },
      };
    }

    const period = Math.floor(capped / sim.periodSeconds) + 1;
    const intoPeriod = capped % sim.periodSeconds;
    const remaining = Math.max(0, Math.round(sim.periodSeconds - intoPeriod));

    return {
      ...game,
      state: 'live',
      live: {
        homeScore,
        awayScore,
        period,
        clock: formatClock(remaining, game.leagueId),
        secondsRemaining: remaining,
        possession: Math.floor(capped / 24) % 2 === 0 ? 'home' : 'away',
        situation: this.situation(game, capped),
        updatedAt: new Date(now).toISOString(),
      },
    };
  }

  /**
   * The pinned demo games loop. Without this the harness is only live for the
   * few minutes after boot, which makes the live view, the diff engine and the
   * alert pipeline impossible to work on for any length of time.
   */
  private cycledStart(game: Game, sim: LeagueSim): number {
    const anchor = new Date(game.startsAt).getTime();
    const realDuration = ((sim.periods * sim.periodSeconds) / SIM_SPEED) * 1000;
    const gap = 60_000;
    const cycle = realDuration + gap;
    const elapsed = Date.now() - anchor;
    if (elapsed < cycle) return anchor;
    return anchor + Math.floor(elapsed / cycle) * cycle;
  }

  private timelineCache = new Map<string, Array<{ t: number; side: 'home' | 'away'; points: number }>>();

  private timeline(game: Game, sim: LeagueSim, totalSeconds: number) {
    const cached = this.timelineCache.get(game.id);
    if (cached) return cached;

    const home = this.teamsById.get(game.homeTeamId);
    const away = this.teamsById.get(game.awayTeamId);
    const rng = mulberry32(hashSeed(game.id));

    // Steer the game toward a target final margin. Marquee demo games are
    // steered to a one-possession finish; everything else follows the ratings.
    const ratingGap = (home?.rating ?? 50) - (away?.rating ?? 50);
    const engineeredClose = game.id.includes('live-marquee');
    const targetMargin = engineeredClose
      ? (rng() > 0.5 ? 1 : -1) * (game.leagueId === 'epl' ? 0 : 2)
      : Math.round(ratingGap / (game.leagueId === 'epl' ? 18 : 4));

    const plays: Array<{ t: number; side: 'home' | 'away'; points: number }> = [];
    let homeScore = 0;
    let awayScore = 0;

    for (let t = sim.playInterval; t < totalSeconds; t += sim.playInterval * (0.5 + rng())) {
      const progress = t / totalSeconds;
      const desiredMargin = targetMargin * progress;
      const actualMargin = homeScore - awayScore;
      // Nudge whichever side is ahead of schedule back toward the target curve.
      const homeBias = actualMargin > desiredMargin ? 0.34 : 0.66;
      const side: 'home' | 'away' = rng() < homeBias ? 'home' : 'away';
      const points = pick(rng, sim.scoreValues);
      if (side === 'home') homeScore += points;
      else awayScore += points;
      plays.push({ t: Math.round(t), side, points });
    }

    // Leagues without draws must not end level. One extra play settles it, the
    // way overtime would.
    if (!sim.allowsDraw && homeScore === awayScore && plays.length > 0) {
      const side: 'home' | 'away' = ratingGap >= 0 ? 'home' : 'away';
      plays.push({ t: totalSeconds - 1, side, points: sim.scoreValues[0] ?? 1 });
    }

    this.timelineCache.set(game.id, plays);
    return plays;
  }

  private situation(game: Game, elapsed: number): string | undefined {
    const rng = mulberry32(hashSeed(`${game.id}-${Math.floor(elapsed / 40)}`));
    if (game.leagueId === 'nfl') {
      const down = randInt(rng, 1, 4);
      const distance = randInt(rng, 1, 15);
      const yardLine = randInt(rng, 5, 49);
      const side = rng() > 0.5 ? 'own' : 'opp';
      return `${down}${['st', 'nd', 'rd', 'th'][down - 1]} & ${distance} at ${side} ${yardLine}`;
    }
    if (game.leagueId === 'tennis') {
      const games = `${randInt(rng, 0, 6)}-${randInt(rng, 0, 6)}`;
      const points = pick(rng, ['0-0', '15-0', '30-15', '40-30', 'Deuce', 'Ad in']);
      return `${games}, ${points}`;
    }
    return undefined;
  }

  // -------------------------------------------------------------------------
  // Rosters and box scores
  // -------------------------------------------------------------------------

  private buildRoster(team: Team): Player[] {
    const rng = mulberry32(hashSeed(`roster-${team.id}`));
    const size = ROSTER_SIZE[team.leagueId];
    const players: Player[] = [];
    // Two players with the same name on one roster reads as a bug, so names are
    // drawn without replacement.
    const usedNames = new Set<string>();

    for (let i = 0; i < size; i++) {
      const role: RosterRole =
        i < STARTERS[team.leagueId]
          ? 'starter'
          : i < STARTERS[team.leagueId] + ROTATION[team.leagueId]
            ? 'rotation'
            : 'bench';

      let name = team.isIndividual ? team.name : '';
      if (!name) {
        for (let attempt = 0; attempt < 40; attempt++) {
          const candidate = `${pick(rng, FIRST_NAMES)} ${pick(rng, LAST_NAMES)}`;
          if (!usedNames.has(candidate)) {
            name = candidate;
            break;
          }
        }
        name ||= `${pick(rng, FIRST_NAMES)} ${pick(rng, LAST_NAMES)} ${i}`;
        usedNames.add(name);
      }

      // Star rating tapers down the depth chart, anchored on team strength.
      const depthPenalty = i * (60 / size);
      const starRating = Math.max(
        8,
        Math.min(99, Math.round(team.rating + 22 - depthPenalty + (rng() - 0.5) * 12)),
      );

      const yearsPro = randInt(rng, 0, 15);
      const minutes =
        role === 'starter'
          ? 28 + rng() * 10
          : role === 'rotation'
            ? 16 + rng() * 10
            : 4 + rng() * 9;

      const per36 = 8 + (starRating / 100) * 22 + rng() * 4;

      players.push({
        id: `${team.id}-p${i}`,
        teamId: team.id,
        name,
        position: pick(rng, POSITIONS[team.leagueId]),
        number: randInt(rng, 0, 55),
        age: 19 + yearsPro + randInt(rng, 0, 3),
        yearsPro,
        role,
        starRating,
        stats: {
          gamesPlayed: randInt(rng, 18, 28),
          minutesPerGame: Math.round(minutes * 10) / 10,
          primary: Math.round(((per36 * minutes) / 36) * 10) / 10,
          secondary: Math.round(rng() * 9 * 10) / 10,
          tertiary: Math.round(rng() * 7 * 10) / 10,
          efficiency: Math.round((48 + rng() * 20) * 10) / 10,
          usageRate: Math.round((12 + (starRating / 100) * 20 + rng() * 4) * 10) / 10,
          onOffDiff: Math.round(((starRating - 55) / 6 + (rng() - 0.5) * 5) * 10) / 10,
        },
        injury: this.maybeInjury(rng, i),
      });
    }

    return players;
  }

  private maybeInjury(rng: () => number, index: number): Injury | undefined {
    // Roughly two or three names on a report, which is what a real team carries.
    if (rng() > 0.12) return undefined;
    const kind = pick(rng, INJURY_KINDS);
    const status = pick(rng, ['OUT', 'DOUBTFUL', 'QUESTIONABLE', 'PROBABLE', 'GTD'] as const);
    const reportedHoursAgo = randInt(rng, 1, 96);
    return {
      status,
      description: kind[0],
      expectedReturn: status === 'OUT' ? `${randInt(rng, 1, kind[1])} days` : undefined,
      reportedAt: new Date(Date.now() - reportedHoursAgo * 3_600_000).toISOString(),
    };
  }

  /**
   * Per-game lines with a deliberate trend: some players climb, some fade.
   * Utilization analysis is only interesting if the underlying data moves.
   */
  private boxLine(player: Player, game: Game, index: number, total: number): BoxScoreLine {
    const rng = mulberry32(hashSeed(`${game.id}-${player.id}`));
    const progress = total > 1 ? index / (total - 1) : 1;

    // Young, efficient bench players trend up; older high-minute players fade.
    const trendDirection =
      player.yearsPro <= 2 && player.role !== 'starter'
        ? 1
        : player.age >= 33 && player.role === 'starter'
          ? -1
          : 0;
    const trendSwing = trendDirection * 7 * (progress - 0.5) * 2;

    const minutes = Math.max(
      0,
      player.stats.minutesPerGame + trendSwing + (rng() - 0.5) * 5,
    );
    const per36 = (player.stats.primary / Math.max(1, player.stats.minutesPerGame)) * 36;
    const efficiencySwing = trendDirection > 0 ? 4 * progress : 0;

    return {
      playerId: player.id,
      minutes: Math.round(minutes * 10) / 10,
      primary: Math.round(((per36 * minutes) / 36 + (rng() - 0.5) * 6) * 10) / 10,
      secondary: Math.round((player.stats.secondary + (rng() - 0.5) * 4) * 10) / 10,
      tertiary: Math.round((player.stats.tertiary + (rng() - 0.5) * 3) * 10) / 10,
      efficiency: Math.round((player.stats.efficiency + efficiencySwing + (rng() - 0.5) * 8) * 10) / 10,
      plusMinus: Math.round((player.stats.onOffDiff + (rng() - 0.5) * 14) * 10) / 10,
    };
  }
}

export function formatClock(secondsRemaining: number, leagueId: LeagueId): string {
  if (leagueId === 'epl') {
    // Football counts up, so express the clock as minutes played in the half.
    const played = 45 - Math.floor(secondsRemaining / 60);
    return `${Math.max(1, played)}'`;
  }
  const m = Math.floor(secondsRemaining / 60);
  const s = Math.floor(secondsRemaining % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
}

export { SIMS };
