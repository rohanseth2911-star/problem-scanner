import type { Game, GameEvent } from '../../shared/types.ts';
import { readLiveState, recordEvent, writeLiveState } from '../db.ts';
import { alertTierFor, getPreferences } from '../preferences.ts';
import { getProvider } from '../providers/index.ts';
import { rankGames, teamsById } from '../world.ts';
import { diffGame, passesTier } from './events.ts';
import { buildNotifier, type Notifier } from './notify.ts';
import { hub } from './sse.ts';

/**
 * Tiered polling worker.
 *
 * Cadence is driven by what the user actually cares about rather than a single
 * global interval: quota spent on a blowout in a league you do not follow is
 * quota not available for the one-possession game in the fourth.
 */

const TIERS: Record<'trackedLive' | 'highWatchLive' | 'otherLive' | 'idle', number> = {
  trackedLive: 15_000,
  highWatchLive: 30_000,
  otherLive: 60_000,
  idle: 300_000,
};

/** Quiet hours: nothing live and the middle of the night means stop entirely. */
const QUIET_START_HOUR = 2;
const QUIET_END_HOUR = 8;

export class Poller {
  private timer: NodeJS.Timeout | null = null;
  private running = false;
  private notifier: Notifier;
  private lastTickAt: number | null = null;
  private lastInterval = TIERS.idle;

  constructor(notifier: Notifier = buildNotifier()) {
    this.notifier = notifier;
  }

  start(): void {
    if (this.running) return;
    this.running = true;
    void this.tick();
  }

  stop(): void {
    this.running = false;
    if (this.timer) clearTimeout(this.timer);
    this.timer = null;
  }

  get status() {
    return {
      running: this.running,
      lastTickAt: this.lastTickAt ? new Date(this.lastTickAt).toISOString() : null,
      intervalMs: this.lastInterval,
      channel: this.notifier.channelName,
      sseClients: hub.size,
    };
  }

  private inQuietHours(): boolean {
    const prefs = getPreferences();
    const hour = Number(
      new Intl.DateTimeFormat('en-US', {
        timeZone: prefs.timezone,
        hour: 'numeric',
        hour12: false,
      }).format(new Date()),
    );
    return hour >= QUIET_START_HOUR && hour < QUIET_END_HOUR;
  }

  private async tick(): Promise<void> {
    if (!this.running) return;
    let interval: number = TIERS.idle;

    try {
      interval = await this.pollOnce();
    } catch (error) {
      console.error('[poller] tick failed:', error instanceof Error ? error.message : error);
    } finally {
      this.lastTickAt = Date.now();
      this.lastInterval = interval;
      if (this.running) {
        this.timer = setTimeout(() => void this.tick(), interval);
      }
    }
  }

  /** Returns the interval to wait before the next tick. */
  private async pollOnce(): Promise<number> {
    const prefs = getPreferences();
    const provider = getProvider();
    const live = await provider.getLiveGames();

    if (live.length === 0) {
      return this.inQuietHours() ? TIERS.idle * 4 : TIERS.idle;
    }

    const ranked = await rankGames(live);
    const teams = await teamsById();
    const watchById = new Map(ranked.map((r) => [r.game.id, r.watch.score]));

    let fastest: number = TIERS.otherLive;
    const emitted: GameEvent[] = [];

    for (const game of live) {
      const home = teams.get(game.homeTeamId);
      const away = teams.get(game.awayTeamId);
      if (!home || !away) continue;

      const watchScore = watchById.get(game.id) ?? 0;
      const tracked =
        prefs.trackedTeamIds.includes(game.homeTeamId) ||
        prefs.trackedTeamIds.includes(game.awayTeamId);

      if (tracked) fastest = Math.min(fastest, TIERS.trackedLive);
      else if (watchScore >= 75) fastest = Math.min(fastest, TIERS.highWatchLive);

      const previous = readLiveState<Game>(game.id);
      const events = diffGame(previous, game, {
        home,
        away,
        watchScore,
        dropEverythingThreshold: prefs.dropEverythingThreshold,
      });
      writeLiveState(game.id, game);

      const tier = alertTierFor(prefs, [game.homeTeamId, game.awayTeamId]);

      for (const event of events) {
        // Persist first: recordEvent is the dedupe gate for both the feed and
        // the alert, so a duplicate never reaches either.
        if (!recordEvent(event)) continue;
        emitted.push(event);
        hub.broadcast('game-event', event);

        if (passesTier(event, tier)) {
          void this.notifier.deliver(event);
        }
      }
    }

    // Push refreshed scores to every open tab regardless of whether an alert
    // fired — the live view should never lag behind the poller.
    hub.broadcast('scores', {
      games: ranked.map((r) => ({
        gameId: r.game.id,
        live: r.game.live,
        state: r.game.state,
        watchScore: r.watch.score,
      })),
      at: new Date().toISOString(),
    });

    if (emitted.length > 0) {
      console.log(`[poller] ${emitted.length} event(s) across ${live.length} live game(s)`);
    }

    return fastest;
  }
}

let poller: Poller | null = null;

export function getPoller(): Poller {
  poller ??= new Poller();
  return poller;
}
