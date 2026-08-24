import type {
  BoxScore,
  Game,
  Injury,
  Player,
  StandingsRow,
  Team,
} from '../../shared/types.ts';

/**
 * Every data source implements this. Screens are built against MockProvider
 * first so the whole app is demoable with zero API keys, and the real vendor
 * drops in behind the same six methods.
 */
export interface SportsProvider {
  readonly name: string;
  getTeams(): Promise<Team[]>;
  getSchedule(teamId: string, from: Date, to: Date): Promise<Game[]>;
  getLiveGames(): Promise<Game[]>;
  getBoxScores(teamId: string, limit: number): Promise<BoxScore[]>;
  getRoster(teamId: string): Promise<Player[]>;
  getInjuries(teamId: string): Promise<Array<{ playerId: string; injury: Injury }>>;
  getStandings(leagueId: string): Promise<StandingsRow[]>;
  /**
   * League-wide window. Optional: vendors that only expose per-team schedules
   * fall back to unioning the tracked teams' schedules instead.
   */
  getGamesBetween?(from: Date, to: Date): Promise<Game[]>;
}
