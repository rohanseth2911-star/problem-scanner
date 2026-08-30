import { useMemo, useState } from 'react';
import type { LeagueId, Preferences, RankedGame } from '../../../shared/types.ts';
import { LEAGUE_LABELS } from '../../../shared/types.ts';
import { useResource, type Freshness } from '../lib/api.ts';
import { dayIn } from '../lib/format.ts';
import { GameRow } from '../components/GameCard.tsx';
import { Empty, ErrorState, FreshnessNote, Skeleton } from '../components/ui.tsx';

interface ScheduleResponse {
  games: RankedGame[];
  freshness: Freshness;
}

const MIN_SCORES = [0, 55, 75] as const;
const MIN_LABELS = ['All games', 'Worth it and up', 'Must-watch only'] as const;

export default function Schedule({ prefs }: { prefs: Preferences }) {
  const { data, error, loading, reload } = useResource<ScheduleResponse>('/schedule');
  const [league, setLeague] = useState<LeagueId | 'all'>('all');
  const [minIndex, setMinIndex] = useState(0);

  const grouped = useMemo(() => {
    const games = (data?.games ?? [])
      .filter((r) => league === 'all' || r.game.leagueId === league)
      .filter((r) => r.watch.score >= MIN_SCORES[minIndex]!)
      .sort((a, b) => new Date(a.game.startsAt).getTime() - new Date(b.game.startsAt).getTime());

    const byDay = new Map<string, RankedGame[]>();
    for (const ranked of games) {
      const day = dayIn(ranked.game.startsAt, prefs.timezone);
      byDay.set(day, [...(byDay.get(day) ?? []), ranked]);
    }
    return [...byDay.entries()];
  }, [data, league, minIndex, prefs.timezone]);

  const leagues = useMemo(
    () => [...new Set((data?.games ?? []).map((r) => r.game.leagueId))],
    [data],
  );

  if (loading && !data) return <Skeleton count={5} height={74} />;
  if (error) return <ErrorState message={error} onRetry={reload} />;

  return (
    <>
      <div className="checks" style={{ marginBottom: 10 }}>
        <button className="check" data-on={league === 'all'} onClick={() => setLeague('all')}>
          All leagues
        </button>
        {leagues.map((id) => (
          <button key={id} className="check" data-on={league === id} onClick={() => setLeague(id)}>
            {LEAGUE_LABELS[id]}
          </button>
        ))}
      </div>

      <div className="checks" style={{ marginBottom: 16 }}>
        {MIN_LABELS.map((label, i) => (
          <button key={label} className="check" data-on={minIndex === i} onClick={() => setMinIndex(i)}>
            {label}
          </button>
        ))}
      </div>

      {grouped.length === 0 ? (
        <Empty>No games match that filter in the next 30 days.</Empty>
      ) : (
        grouped.map(([day, games]) => (
          <div key={day}>
            <div className="section-title">{day}</div>
            <div className="stack">
              {games.map((ranked) => (
                <GameRow key={ranked.game.id} ranked={ranked} timezone={prefs.timezone} />
              ))}
            </div>
          </div>
        ))
      )}

      <FreshnessNote freshness={data?.freshness} />
    </>
  );
}
