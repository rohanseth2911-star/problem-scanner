import type {
  Game,
  Player,
  RankedGame,
  Team,
} from '../shared/types.ts';
import { getProvider } from './providers/index.ts';
import { getPreferences } from './preferences.ts';
import { scoreWatchability } from './scoring/watchability.ts';

/**
 * Assembles the objects the scoring engines need. Rosters are memoised in
 * process because watchability needs them on every ranking pass and they change
 * on the order of once a day.
 */

let teamsCache: { at: number; teams: Team[] } | null = null;
const rosterCache = new Map<string, { at: number; players: Player[] }>();
const ROSTER_TTL = 15 * 60_000;
const TEAM_TTL = 60 * 60_000;

export async function allTeams(): Promise<Team[]> {
  if (teamsCache && Date.now() - teamsCache.at < TEAM_TTL) return teamsCache.teams;
  const teams = await getProvider().getTeams();
  teamsCache = { at: Date.now(), teams };
  return teams;
}

export async function teamsById(): Promise<Map<string, Team>> {
  return new Map((await allTeams()).map((t) => [t.id, t]));
}

export async function rosterFor(teamId: string): Promise<Player[]> {
  const cached = rosterCache.get(teamId);
  if (cached && Date.now() - cached.at < ROSTER_TTL) return cached.players;
  const players = await getProvider().getRoster(teamId);
  rosterCache.set(teamId, { at: Date.now(), players });
  return players;
}

export function invalidateRosters(): void {
  rosterCache.clear();
}

/** League-wide window, with a fallback for vendors that lack one. */
export async function gamesBetween(from: Date, to: Date): Promise<Game[]> {
  const provider = getProvider();
  try {
    return await provider.getGamesBetween(from, to);
  } catch {
    const prefs = getPreferences();
    const perTeam = await Promise.all(
      prefs.trackedTeamIds.map((id) => provider.getSchedule(id, from, to).catch(() => [])),
    );
    const seen = new Map<string, Game>();
    for (const game of perTeam.flat()) seen.set(game.id, game);
    return [...seen.values()];
  }
}

export async function rankGames(games: Game[], now = new Date()): Promise<RankedGame[]> {
  const prefs = getPreferences();
  const teams = await teamsById();

  const ranked = await Promise.all(
    games.map(async (game) => {
      const home = teams.get(game.homeTeamId);
      const away = teams.get(game.awayTeamId);
      if (!home || !away) return null;

      const [homePlayers, awayPlayers] = await Promise.all([
        rosterFor(home.id),
        rosterFor(away.id),
      ]);

      const watch = scoreWatchability({
        game,
        home,
        away,
        homePlayers,
        awayPlayers,
        prefs,
        now,
      });

      const { unavailableOn, ...score } = watch;
      return { game, home, away, watch: score, unavailableOn } satisfies RankedGame;
    }),
  );

  return ranked
    .filter((r): r is RankedGame => r !== null)
    .sort((a, b) => b.watch.score - a.watch.score);
}

/** The local day, in the user's timezone, expressed as a UTC instant range. */
export function localDayRange(prefs = getPreferences(), offsetDays = 0): { from: Date; to: Date } {
  const now = new Date();
  const local = new Date(now.toLocaleString('en-US', { timeZone: prefs.timezone }));
  local.setDate(local.getDate() + offsetDays);
  local.setHours(0, 0, 0, 0);

  // Convert the local midnight back to UTC by measuring the zone's offset.
  const offsetMs = now.getTime() - new Date(now.toLocaleString('en-US', { timeZone: prefs.timezone })).getTime();
  const from = new Date(local.getTime() + offsetMs);
  return { from, to: new Date(from.getTime() + 86_400_000) };
}
