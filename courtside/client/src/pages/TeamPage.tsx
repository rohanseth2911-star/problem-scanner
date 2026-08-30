import { useMemo } from 'react';
import { Link } from 'wouter';
import type {
  Player,
  Preferences,
  RankedGame,
  StandingsRow,
  Team,
  TeamSchedule,
} from '../../../shared/types.ts';
import { useResource, type Freshness } from '../lib/api.ts';
import DifficultyStrip from '../components/DifficultyStrip.tsx';
import Insights from '../components/Insights.tsx';
import Roster from '../components/Roster.tsx';
import { GameRow } from '../components/GameCard.tsx';
import { ErrorState, FreshnessNote, Section, Skeleton, TeamChip } from '../components/ui.tsx';

interface TeamResponse {
  team: Team;
  schedule: TeamSchedule;
  ranked: RankedGame[];
  roster: Player[];
  injuries: Player[];
  standings: StandingsRow[];
  freshness: Freshness;
}

const UNIT: Record<string, string> = {
  nba: 'pts',
  nfl: 'yds',
  epl: 'G+A',
  tennis: 'pts',
};

export default function TeamPage({ id, prefs }: { id: string; prefs: Preferences }) {
  const { data, error, loading, reload } = useResource<TeamResponse>(`/teams/${encodeURIComponent(id)}`);
  const teams = useResource<{ teams: Team[] }>('/teams');

  const teamsById = useMemo(
    () => new Map((teams.data?.teams ?? []).map((t) => [t.id, t])),
    [teams.data],
  );

  if (loading && !data) return <Skeleton count={3} height={120} />;
  if (error) return <ErrorState message={error} onRetry={reload} />;
  if (!data || teamsById.size === 0) return <Skeleton count={3} height={120} />;

  const { team } = data;
  const unit = UNIT[team.leagueId] ?? 'pts';
  // The provider returns league-wide standings, but "4th in the West" is the
  // number a fan actually holds in their head — so rank within the conference.
  const conferenceRows = data.standings.filter(
    (row) => !team.conference || teamsById.get(row.teamId)?.conference === team.conference,
  );
  const conferenceRank = conferenceRows.findIndex((row) => row.teamId === team.id) + 1;

  return (
    <>
      <div className="card" style={{ display: 'flex', gap: 13, alignItems: 'center' }}>
        <TeamChip abbrev={team.abbrev} colors={team.colors} />
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{ fontSize: 18, fontWeight: 650, letterSpacing: '-0.02em' }}>{team.name}</div>
          <div className="dim tabnum" style={{ fontSize: 12.5 }}>
            {team.record.w}–{team.record.l}
            {team.record.d > 0 && `–${team.record.d}`}
            {conferenceRank > 0 && ` · ${ordinal(conferenceRank)} in ${team.conference ?? 'the league'}`}
            {team.streak !== 0 && ` · ${team.streak > 0 ? 'W' : 'L'}${Math.abs(team.streak)}`}
          </div>
        </div>
        <div className="score-badge" style={{ ['--accent' as string]: 'var(--worth-it)' }} title="Team rating">
          <b>{team.rating}</b>
          <span>rating</span>
        </div>
      </div>

      <Section title="Schedule difficulty">
        <DifficultyStrip
          schedule={data.schedule}
          teamsById={teamsById}
          teamId={team.id}
          timezone={prefs.timezone}
        />
      </Section>

      {data.ranked.length > 0 && (
        <Section title="Next up">
          <div className="stack">
            {[...data.ranked]
              .sort(
                (a, b) =>
                  new Date(a.game.startsAt).getTime() - new Date(b.game.startsAt).getTime(),
              )
              .slice(0, 5)
              .map((ranked) => (
                <GameRow key={ranked.game.id} ranked={ranked} timezone={prefs.timezone} />
              ))}
          </div>
        </Section>
      )}

      <Section title={`Roster · ${data.injuries.length} on the report`}>
        <Roster players={data.roster} unit={unit} />
      </Section>

      <Section title="Coaching insights">
        <Insights teamId={team.id} unit={unit} />
      </Section>

      {conferenceRows.length > 0 && (
        <Section title={team.conference ? `Standings · ${team.conference}` : 'Standings'}>
          <div className="card">
            {conferenceRows.map((row, index) => {
              const rowTeam = teamsById.get(row.teamId);
              return (
                <Link
                  key={row.teamId}
                  href={`/team/${encodeURIComponent(row.teamId)}`}
                  className="kv"
                  style={{ color: row.teamId === team.id ? 'var(--text)' : 'var(--text-dim)' }}
                >
                  <span className="k" style={{ color: 'inherit' }}>
                    {index + 1}. {rowTeam?.shortName ?? row.teamId}
                  </span>
                  <span className="v">
                    {row.w}–{row.l}
                    {row.d > 0 && `–${row.d}`}
                    {row.points !== undefined && ` · ${row.points} pts`}
                  </span>
                </Link>
              );
            })}
          </div>
        </Section>
      )}

      <FreshnessNote freshness={data.freshness} />
    </>
  );
}

function ordinal(n: number): string {
  const suffix = ['th', 'st', 'nd', 'rd'][(n % 100 > 10 && n % 100 < 14) || n % 10 > 3 ? 0 : n % 10];
  return `${n}${suffix}`;
}
