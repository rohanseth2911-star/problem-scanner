import type { Preferences, RankedGame } from '../../../shared/types.ts';
import { useLiveStream, useResource, type Freshness } from '../lib/api.ts';
import { dayIn } from '../lib/format.ts';
import { GameRow, HeroPick } from '../components/GameCard.tsx';
import { Empty, ErrorState, FreshnessNote, Section, Skeleton } from '../components/ui.tsx';

interface TonightResponse {
  date: string;
  timezone: string;
  live: RankedGame[];
  upcoming: RankedGame[];
  finished: RankedGame[];
  freshness: Freshness;
}

export default function Tonight({ prefs }: { prefs: Preferences }) {
  const { data, error, loading, reload } = useResource<TonightResponse>('/tonight');
  const { patches } = useLiveStream();

  if (loading && !data) return <Skeleton count={4} height={78} />;
  if (error) return <ErrorState message={error} onRetry={reload} />;
  if (!data) return null;

  const timezone = data.timezone ?? prefs.timezone;
  // The hero is whatever is best right now: a live game outranks a tip-off in
  // three hours, because you can act on it this second.
  const hero = data.live[0] ?? data.upcoming[0];
  const restLive = data.live.filter((r) => r.game.id !== hero?.game.id);
  const restUpcoming = data.upcoming.filter((r) => r.game.id !== hero?.game.id);

  if (!hero && data.finished.length === 0) {
    return (
      <>
        <Empty>Nothing on today across your leagues.</Empty>
        <FreshnessNote freshness={data.freshness} />
      </>
    );
  }

  return (
    <>
      {hero && <HeroPick ranked={hero} timezone={timezone} patch={patches.get(hero.game.id)} />}

      {restLive.length > 0 && (
        <Section title="Also live">
          <div className="stack">
            {restLive.map((ranked) => (
              <GameRow
                key={ranked.game.id}
                ranked={ranked}
                timezone={timezone}
                patch={patches.get(ranked.game.id)}
              />
            ))}
          </div>
        </Section>
      )}

      {restUpcoming.length > 0 && (
        <Section title={`Rest of ${dayIn(data.date, timezone)}`}>
          <div className="stack">
            {restUpcoming.map((ranked) => (
              <GameRow key={ranked.game.id} ranked={ranked} timezone={timezone} />
            ))}
          </div>
        </Section>
      )}

      {data.finished.length > 0 && (
        <Section title="Final">
          <div className="stack">
            {data.finished.map((ranked) => (
              <GameRow
                key={ranked.game.id}
                ranked={ranked}
                timezone={timezone}
                patch={patches.get(ranked.game.id)}
              />
            ))}
          </div>
        </Section>
      )}

      <FreshnessNote freshness={data.freshness} />
    </>
  );
}
