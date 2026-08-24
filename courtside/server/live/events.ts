import type {
  EffectiveAlertTier,
  Game,
  GameEvent,
  GameEventType,
  LeagueId,
  Team,
} from '../../shared/types.ts';
import { LEAGUE_SHAPE } from '../../shared/leagues.ts';

/**
 * The diff engine. Given the previous and current state of a game it derives
 * what actually happened. This is where "live scores" becomes "things worth
 * telling you about" — polling alone only ever produces numbers.
 */

export interface DiffContext {
  home: Team;
  away: Team;
  watchScore: number;
  dropEverythingThreshold: number;
}

const clutchConfig = (leagueId: LeagueId) => ({
  margin: LEAGUE_SHAPE[leagueId].clutchMargin,
  seconds: LEAGUE_SHAPE[leagueId].clutchSeconds,
});

export function isClutch(game: Game): boolean {
  if (game.state !== 'live' || !game.live) return false;
  const { margin, seconds } = clutchConfig(game.leagueId);
  const isFinalPeriod = game.live.period >= LEAGUE_SHAPE[game.leagueId].periods;
  const close = Math.abs(game.live.homeScore - game.live.awayScore) <= margin;
  return isFinalPeriod && close && game.live.secondsRemaining <= seconds;
}

function makeEvent(
  game: Game,
  type: GameEventType,
  headline: string,
  detail: string,
  dedupeSuffix: string,
): GameEvent {
  const live = game.live!;
  const dedupeKey = `${game.id}:${type}:${dedupeSuffix}`;
  return {
    id: `${dedupeKey}:${Date.now()}`,
    gameId: game.id,
    type,
    headline,
    detail,
    dedupeKey,
    homeScore: live.homeScore,
    awayScore: live.awayScore,
    period: live.period,
    clock: live.clock,
    createdAt: new Date().toISOString(),
  };
}

export function diffGame(
  previous: Game | null,
  current: Game,
  ctx: DiffContext,
): GameEvent[] {
  const events: GameEvent[] = [];
  const live = current.live;
  if (!live) return events;

  const prevLive = previous?.live;
  const { home, away } = ctx;
  const score = `${away.abbrev} ${live.awayScore}-${live.homeScore} ${home.abbrev}`;

  // Tip-off — but only a real one. On a restart, or the first poll after the
  // app starts, we often meet a game already in its second half; announcing
  // that as "underway" is simply false. Record the state and diff from here.
  if ((!previous || previous.state === 'scheduled') && current.state === 'live') {
    const atTheStart = live.period === 1;
    if (atTheStart) {
      events.push(
        makeEvent(current, 'PERIOD_START', `${away.shortName} at ${home.shortName} is underway`, score, 'start'),
      );
    }
  }

  if (prevLive) {
    // A score that goes backwards is a correction upstream, or a game that
    // restarted underneath us. Either way it is not a scoring play — resync
    // silently rather than announcing "+-7".
    const wentBackwards =
      live.homeScore < prevLive.homeScore || live.awayScore < prevLive.awayScore;

    const scored =
      !wentBackwards &&
      (live.homeScore !== prevLive.homeScore || live.awayScore !== prevLive.awayScore);

    if (scored) {
      const homeDelta = live.homeScore - prevLive.homeScore;
      const scorer = homeDelta > 0 ? home : away;
      const delta = Math.abs(homeDelta > 0 ? homeDelta : live.awayScore - prevLive.awayScore);
      events.push(
        makeEvent(
          current,
          'SCORE_CHANGE',
          `${scorer.shortName} score`,
          `${score} · ${live.clock} ${LEAGUE_SHAPE[current.leagueId].periodLabel(live.period)}${delta > 1 ? ` (+${delta})` : ''}`,
          `${live.homeScore}-${live.awayScore}`,
        ),
      );

      // A lead change is the moment the story of the game turns over.
      const prevLeader = Math.sign(prevLive.homeScore - prevLive.awayScore);
      const nextLeader = Math.sign(live.homeScore - live.awayScore);
      if (prevLeader !== nextLeader && nextLeader !== 0) {
        const leader = nextLeader > 0 ? home : away;
        events.push(
          makeEvent(
            current,
            'LEAD_CHANGE',
            `${leader.shortName} take the lead`,
            `${score} · ${live.clock} ${LEAGUE_SHAPE[current.leagueId].periodLabel(live.period)}`,
            `${live.homeScore}-${live.awayScore}`,
          ),
        );
      }
    }

    if (live.period !== prevLive.period && live.period > prevLive.period) {
      events.push(
        makeEvent(
          current,
          'PERIOD_END',
          `End of ${LEAGUE_SHAPE[current.leagueId].periodLabel(prevLive.period)}`,
          score,
          `p${prevLive.period}`,
        ),
      );
    }
  }

  if (current.state === 'final' && previous?.state !== 'final') {
    const winner =
      live.homeScore === live.awayScore
        ? null
        : live.homeScore > live.awayScore
          ? home
          : away;
    events.push(
      makeEvent(
        current,
        'FINAL',
        winner ? `Final: ${winner.shortName} win` : 'Final: draw',
        score,
        'final',
      ),
    );

    // An upset only becomes interesting once it has actually happened.
    if (winner) {
      const loser = winner.id === home.id ? away : home;
      if (loser.rating - winner.rating >= 12) {
        events.push(
          makeEvent(current, 'UPSET_BREWING', `Upset: ${winner.shortName} beat ${loser.shortName}`, score, 'upset'),
        );
      }
    }
  }

  if (isClutch(current)) {
    const margin = Math.abs(live.homeScore - live.awayScore);
    events.push(
      makeEvent(
        current,
        'CLOSE_GAME',
        margin === 0 ? 'Tied late' : `${margin}-point game late`,
        `${score} · ${live.clock} left`,
        `clutch-${live.period}`,
      ),
    );

    // The whole reason this app exists: a great game, right now, about to end.
    if (ctx.watchScore >= ctx.dropEverythingThreshold) {
      events.push(
        makeEvent(
          current,
          'DROP_EVERYTHING',
          `Turn on ${home.shortName}–${away.shortName}`,
          margin === 0
            ? `Tied with ${live.clock} left.`
            : `${margin}-point game with ${live.clock} left.`,
          `drop-${live.period}`,
        ),
      );
    }
  }

  // Sport-specific situational alerts.
  if (current.leagueId === 'nfl' && live.situation?.startsWith('4th')) {
    events.push(
      makeEvent(current, 'FOURTH_DOWN_GOING_FOR_IT', 'Fourth down', live.situation, `4d-${live.clock}`),
    );
  }
  if (current.leagueId === 'tennis' && live.situation?.includes('40-30')) {
    events.push(
      makeEvent(current, 'TENNIS_SET_POINT', 'Set point', live.situation, `sp-${live.situation}`),
    );
  }

  return events;
}

/**
 * Which events survive a given alert tier.
 *
 * Drop-everything outranks every tier except an explicit mute: if you have gone
 * to Settings and turned a team off, that decision is final. A game you have
 * simply never had an opinion about (`discover`) can still reach you when it
 * turns into something worth abandoning your evening for.
 */
export function passesTier(event: GameEvent, tier: EffectiveAlertTier): boolean {
  if (event.type === 'DROP_EVERYTHING') return tier !== 'off';
  if (tier === 'off' || tier === 'discover') return false;
  switch (tier) {
    case 'all':
      return true;
    case 'key':
      return event.type !== 'SCORE_CHANGE';
    case 'clutch':
      return ['CLOSE_GAME', 'TENNIS_SET_POINT', 'TENNIS_MATCH_POINT', 'FINAL'].includes(event.type);
    case 'final':
      return event.type === 'FINAL';
    default:
      return false;
  }
}
