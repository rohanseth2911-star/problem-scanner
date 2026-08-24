import type { LeagueId, Team } from '../../shared/types.ts';

/**
 * Fixture teams for the mock provider.
 *
 * Club identities, cities and venue coordinates are real — the travel and
 * altitude terms in the difficulty model are meaningless otherwise. Every
 * *person* in mock mode is fictional by design: attaching invented statistics
 * to a real athlete's name is exactly the failure this app refuses to ship.
 * Real rosters arrive only from a real provider.
 */

interface TeamSeed {
  id: string;
  leagueId: LeagueId;
  name: string;
  shortName: string;
  abbrev: string;
  city: string;
  lat: number;
  lon: number;
  timezone: string;
  altitude: number;
  conference?: string;
  rating: number;
  colors: [string, string];
  rivals: string[];
  isIndividual?: boolean;
}

const SEEDS: TeamSeed[] = [
  // NBA
  { id: 'nba-gsw', leagueId: 'nba', name: 'Golden State Warriors', shortName: 'Warriors', abbrev: 'GSW', city: 'San Francisco', lat: 37.768, lon: -122.3877, timezone: 'America/Los_Angeles', altitude: 16, conference: 'West', rating: 66, colors: ['#1D428A', '#FFC72C'], rivals: ['nba-lal', 'nba-bos'] },
  { id: 'nba-okc', leagueId: 'nba', name: 'Oklahoma City Thunder', shortName: 'Thunder', abbrev: 'OKC', city: 'Oklahoma City', lat: 35.4634, lon: -97.5151, timezone: 'America/Chicago', altitude: 366, conference: 'West', rating: 74, colors: ['#007AC1', '#EF3B24'], rivals: ['nba-den', 'nba-min'] },
  { id: 'nba-lal', leagueId: 'nba', name: 'Los Angeles Lakers', shortName: 'Lakers', abbrev: 'LAL', city: 'Los Angeles', lat: 34.043, lon: -118.2673, timezone: 'America/Los_Angeles', altitude: 89, conference: 'West', rating: 58, colors: ['#552583', '#FDB927'], rivals: ['nba-gsw', 'nba-bos'] },
  { id: 'nba-bos', leagueId: 'nba', name: 'Boston Celtics', shortName: 'Celtics', abbrev: 'BOS', city: 'Boston', lat: 42.3662, lon: -71.0621, timezone: 'America/New_York', altitude: 6, conference: 'East', rating: 71, colors: ['#007A33', '#BA9653'], rivals: ['nba-lal', 'nba-nyk'] },
  { id: 'nba-den', leagueId: 'nba', name: 'Denver Nuggets', shortName: 'Nuggets', abbrev: 'DEN', city: 'Denver', lat: 39.7487, lon: -105.0077, timezone: 'America/Denver', altitude: 1609, conference: 'West', rating: 68, colors: ['#0E2240', '#FEC524'], rivals: ['nba-okc', 'nba-min'] },
  { id: 'nba-mia', leagueId: 'nba', name: 'Miami Heat', shortName: 'Heat', abbrev: 'MIA', city: 'Miami', lat: 25.7814, lon: -80.187, timezone: 'America/New_York', altitude: 2, conference: 'East', rating: 52, colors: ['#98002E', '#F9A01B'], rivals: ['nba-bos'] },
  { id: 'nba-nyk', leagueId: 'nba', name: 'New York Knicks', shortName: 'Knicks', abbrev: 'NYK', city: 'New York', lat: 40.7505, lon: -73.9934, timezone: 'America/New_York', altitude: 10, conference: 'East', rating: 63, colors: ['#006BB6', '#F58426'], rivals: ['nba-bos'] },
  { id: 'nba-phx', leagueId: 'nba', name: 'Phoenix Suns', shortName: 'Suns', abbrev: 'PHX', city: 'Phoenix', lat: 33.4457, lon: -112.0712, timezone: 'America/Phoenix', altitude: 331, conference: 'West', rating: 47, colors: ['#1D1160', '#E56020'], rivals: [] },
  { id: 'nba-min', leagueId: 'nba', name: 'Minnesota Timberwolves', shortName: 'Wolves', abbrev: 'MIN', city: 'Minneapolis', lat: 44.9795, lon: -93.276, timezone: 'America/Chicago', altitude: 253, conference: 'West', rating: 64, colors: ['#0C2340', '#78BE20'], rivals: ['nba-okc', 'nba-den'] },
  { id: 'nba-dal', leagueId: 'nba', name: 'Dallas Mavericks', shortName: 'Mavericks', abbrev: 'DAL', city: 'Dallas', lat: 32.7905, lon: -96.8104, timezone: 'America/Chicago', altitude: 131, conference: 'West', rating: 44, colors: ['#00538C', '#B8C4CA'], rivals: [] },

  // NFL
  { id: 'nfl-phi', leagueId: 'nfl', name: 'Philadelphia Eagles', shortName: 'Eagles', abbrev: 'PHI', city: 'Philadelphia', lat: 39.9008, lon: -75.1675, timezone: 'America/New_York', altitude: 12, conference: 'NFC East', rating: 72, colors: ['#004C54', '#A5ACAF'], rivals: ['nfl-dal', 'nfl-nyg', 'nfl-was'] },
  { id: 'nfl-dal', leagueId: 'nfl', name: 'Dallas Cowboys', shortName: 'Cowboys', abbrev: 'DAL', city: 'Arlington', lat: 32.7473, lon: -97.0945, timezone: 'America/Chicago', altitude: 168, conference: 'NFC East', rating: 55, colors: ['#003594', '#869397'], rivals: ['nfl-phi', 'nfl-nyg'] },
  { id: 'nfl-sf', leagueId: 'nfl', name: 'San Francisco 49ers', shortName: '49ers', abbrev: 'SF', city: 'Santa Clara', lat: 37.403, lon: -121.9698, timezone: 'America/Los_Angeles', altitude: 6, conference: 'NFC West', rating: 69, colors: ['#AA0000', '#B3995D'], rivals: [] },
  { id: 'nfl-kc', leagueId: 'nfl', name: 'Kansas City Chiefs', shortName: 'Chiefs', abbrev: 'KC', city: 'Kansas City', lat: 39.0489, lon: -94.4839, timezone: 'America/Chicago', altitude: 271, conference: 'AFC West', rating: 76, colors: ['#E31837', '#FFB81C'], rivals: [] },
  { id: 'nfl-nyg', leagueId: 'nfl', name: 'New York Giants', shortName: 'Giants', abbrev: 'NYG', city: 'East Rutherford', lat: 40.8135, lon: -74.0745, timezone: 'America/New_York', altitude: 3, conference: 'NFC East', rating: 38, colors: ['#0B2265', '#A71930'], rivals: ['nfl-phi', 'nfl-dal'] },
  { id: 'nfl-was', leagueId: 'nfl', name: 'Washington Commanders', shortName: 'Commanders', abbrev: 'WAS', city: 'Landover', lat: 38.9076, lon: -76.8645, timezone: 'America/New_York', altitude: 43, conference: 'NFC East', rating: 58, colors: ['#5A1414', '#FFB612'], rivals: ['nfl-phi'] },
  { id: 'nfl-buf', leagueId: 'nfl', name: 'Buffalo Bills', shortName: 'Bills', abbrev: 'BUF', city: 'Orchard Park', lat: 42.7738, lon: -78.787, timezone: 'America/New_York', altitude: 183, conference: 'AFC East', rating: 71, colors: ['#00338D', '#C60C30'], rivals: [] },
  { id: 'nfl-det', leagueId: 'nfl', name: 'Detroit Lions', shortName: 'Lions', abbrev: 'DET', city: 'Detroit', lat: 42.34, lon: -83.0456, timezone: 'America/New_York', altitude: 180, conference: 'NFC North', rating: 67, colors: ['#0076B6', '#B0B7BC'], rivals: [] },

  // Premier League
  { id: 'epl-mci', leagueId: 'epl', name: 'Manchester City', shortName: 'Man City', abbrev: 'MCI', city: 'Manchester', lat: 53.4831, lon: -2.2004, timezone: 'Europe/London', altitude: 38, conference: 'Premier League', rating: 78, colors: ['#6CABDD', '#1C2C5B'], rivals: ['epl-mun', 'epl-liv', 'epl-ars'] },
  { id: 'epl-ars', leagueId: 'epl', name: 'Arsenal', shortName: 'Arsenal', abbrev: 'ARS', city: 'London', lat: 51.5549, lon: -0.1084, timezone: 'Europe/London', altitude: 30, conference: 'Premier League', rating: 75, colors: ['#EF0107', '#063672'], rivals: ['epl-tot', 'epl-mci'] },
  { id: 'epl-liv', leagueId: 'epl', name: 'Liverpool', shortName: 'Liverpool', abbrev: 'LIV', city: 'Liverpool', lat: 53.4308, lon: -2.9608, timezone: 'Europe/London', altitude: 20, conference: 'Premier League', rating: 74, colors: ['#C8102E', '#00B2A9'], rivals: ['epl-mun', 'epl-mci'] },
  { id: 'epl-mun', leagueId: 'epl', name: 'Manchester United', shortName: 'Man United', abbrev: 'MUN', city: 'Manchester', lat: 53.4631, lon: -2.2913, timezone: 'Europe/London', altitude: 45, conference: 'Premier League', rating: 59, colors: ['#DA291C', '#FBE122'], rivals: ['epl-mci', 'epl-liv'] },
  { id: 'epl-che', leagueId: 'epl', name: 'Chelsea', shortName: 'Chelsea', abbrev: 'CHE', city: 'London', lat: 51.4817, lon: -0.191, timezone: 'Europe/London', altitude: 10, conference: 'Premier League', rating: 63, colors: ['#034694', '#DBA111'], rivals: ['epl-tot', 'epl-ars'] },
  { id: 'epl-tot', leagueId: 'epl', name: 'Tottenham Hotspur', shortName: 'Spurs', abbrev: 'TOT', city: 'London', lat: 51.6043, lon: -0.0665, timezone: 'Europe/London', altitude: 30, conference: 'Premier League', rating: 60, colors: ['#132257', '#FFFFFF'], rivals: ['epl-ars', 'epl-che'] },
  { id: 'epl-new', leagueId: 'epl', name: 'Newcastle United', shortName: 'Newcastle', abbrev: 'NEW', city: 'Newcastle', lat: 54.9756, lon: -1.6216, timezone: 'Europe/London', altitude: 40, conference: 'Premier League', rating: 62, colors: ['#241F20', '#FFFFFF'], rivals: [] },
  { id: 'epl-avl', leagueId: 'epl', name: 'Aston Villa', shortName: 'Villa', abbrev: 'AVL', city: 'Birmingham', lat: 52.5092, lon: -1.8848, timezone: 'Europe/London', altitude: 100, conference: 'Premier League', rating: 61, colors: ['#95BFE5', '#670E36'], rivals: [] },

  // Tennis — individual competitors modelled as single-person teams.
  { id: 'atp-vasquez', leagueId: 'tennis', name: 'M. Vasquez', shortName: 'Vasquez', abbrev: 'VAS', city: 'Valencia', lat: 39.4699, lon: -0.3763, timezone: 'Europe/Madrid', altitude: 15, conference: 'ATP', rating: 79, colors: ['#C8102E', '#FFC72C'], rivals: ['atp-berger'], isIndividual: true },
  { id: 'atp-berger', leagueId: 'tennis', name: 'L. Berger', shortName: 'Berger', abbrev: 'BER', city: 'Innsbruck', lat: 47.2692, lon: 11.4041, timezone: 'Europe/Vienna', altitude: 574, conference: 'ATP', rating: 77, colors: ['#0E2240', '#EF3B24'], rivals: ['atp-vasquez'], isIndividual: true },
  { id: 'atp-okonkwo', leagueId: 'tennis', name: 'D. Okonkwo', shortName: 'Okonkwo', abbrev: 'OKO', city: 'Melbourne', lat: -37.8136, lon: 144.9631, timezone: 'Australia/Melbourne', altitude: 31, conference: 'ATP', rating: 68, colors: ['#007A33', '#FFFFFF'], rivals: [], isIndividual: true },
  { id: 'wta-lindqvist', leagueId: 'tennis', name: 'S. Lindqvist', shortName: 'Lindqvist', abbrev: 'LIN', city: 'Gothenburg', lat: 57.7089, lon: 11.9746, timezone: 'Europe/Stockholm', altitude: 12, conference: 'WTA', rating: 76, colors: ['#006AA7', '#FECC02'], rivals: ['wta-moreau'], isIndividual: true },
  { id: 'wta-moreau', leagueId: 'tennis', name: 'C. Moreau', shortName: 'Moreau', abbrev: 'MOR', city: 'Lyon', lat: 45.764, lon: 4.8357, timezone: 'Europe/Paris', altitude: 173, conference: 'WTA', rating: 72, colors: ['#0055A4', '#EF4135'], rivals: ['wta-lindqvist'], isIndividual: true },
  { id: 'wta-ferrante', leagueId: 'tennis', name: 'G. Ferrante', shortName: 'Ferrante', abbrev: 'FER', city: 'Bologna', lat: 44.4949, lon: 11.3426, timezone: 'Europe/Rome', altitude: 54, conference: 'WTA', rating: 65, colors: ['#008C45', '#CD212A'], rivals: [], isIndividual: true },
];

export const TEAM_SEEDS = SEEDS;

export function buildTeams(): Team[] {
  return SEEDS.map((seed) => ({
    ...seed,
    isIndividual: seed.isIndividual ?? false,
    // Records and streaks are derived from rating so the fixture set stays
    // internally consistent with the ratings the scoring engines read.
    record: recordFor(seed),
    streak: streakFor(seed),
  }));
}

function recordFor(seed: TeamSeed): { w: number; l: number; d: number } {
  const played = seed.leagueId === 'nfl' ? 11 : seed.leagueId === 'epl' ? 14 : 28;
  const winRate = 0.15 + (seed.rating / 100) * 0.72;
  const w = Math.round(played * winRate);
  const d = seed.leagueId === 'epl' ? Math.max(0, Math.round(played * 0.18)) : 0;
  return { w, l: Math.max(0, played - w - d), d };
}

function streakFor(seed: TeamSeed): number {
  // Deterministic pseudo-streak: strong teams trend positive, weak negative.
  const magnitude = ((seed.rating * 7919) % 6) + 1;
  return seed.rating >= 62 ? magnitude : -magnitude;
}

export const BROADCASTERS: Record<LeagueId, string[]> = {
  nba: ['NBA League Pass', 'ESPN', 'TNT', 'ABC', 'NBC'],
  nfl: ['CBS', 'FOX', 'NBC', 'ESPN', 'Peacock', 'Netflix'],
  epl: ['Peacock', 'USA Network', 'NBC'],
  tennis: ['ESPN+', 'Tennis Channel', 'ESPN'],
};

export const TOURNAMENTS = ['Cincinnati Masters', 'US Open Series', 'Shanghai Masters'];
export const TENNIS_ROUNDS = ['Round of 32', 'Round of 16', 'Quarter-final', 'Semi-final', 'Final'];
