import type { GameEvent, Preferences, RankedGame } from '../../../shared/types.ts';
import { useLiveStream, useResource, type Freshness } from '../lib/api.ts';
import { describeClock } from '../../../shared/leagues.ts';
import { BUCKET_COLOR, relative } from '../lib/format.ts';
import { ScoreBadge } from '../components/GameCard.tsx';
import { Empty, ErrorState, FreshnessNote, Section, Skeleton, TeamChip } from '../components/ui.tsx';
import { Link } from 'wouter';

interface LiveResponse {
  games: Array<RankedGame & { events: GameEvent[] }>;
  recent: GameEvent[];
  freshness: Freshness;
}

const URGENT: GameEvent['type'][] = ['DROP_EVERYTHING', 'CLOSE_GAME', 'LEAD_CHANGE'];

export function EventFeed({ events }: { events: GameEvent[] }) {
  if (events.length === 0) return null;
  return (
    <ul className="event-feed">
      {events.map((event) => (
        <li key={event.id} className={URGENT.includes(event.type) ? 'urgent' : ''}>
          <span className="when">{relative(event.createdAt)}</span>
          <span className="what">
            <b>{event.headline}</b> — {event.detail}
          </span>
        </li>
      ))}
    </ul>
  );
}

export default function Live({ prefs }: { prefs: Preferences }) {
  const { data, error, loading, reload } = useResource<LiveResponse>('/live');
  const { patches, events, connected } = useLiveStream();

  if (loading && !data) return <Skeleton count={2} height={190} />;
  if (error) return <ErrorState message={error} onRetry={reload} />;
  if (!data) return null;

  if (data.games.length === 0) {
    return (
      <>
        <Empty>
          Nothing is live right now.
          <br />
          <span className="dim">The poller drops to a five-minute heartbeat until something starts.</span>
        </Empty>
        {data.recent.length > 0 && (
          <Section title="Recent events">
            <div className="card">
              <EventFeed events={data.recent.slice(0, 10)} />
            </div>
          </Section>
        )}
        <FreshnessNote freshness={data.freshness} />
      </>
    );
  }

  return (
    <>
      {!connected && (
        <div className="notice" style={{ marginBottom: 12 }}>
          <span aria-hidden>⚡</span>
          <div>Live stream disconnected — reconnecting. Scores below may be a few seconds behind.</div>
        </div>
      )}

      <div className="stack">
        {data.games.map((ranked) => {
          const patch = patches.get(ranked.game.id);
          const live = patch?.live ?? ranked.game.live;
          if (!live) return null;

          const streamed = events.filter((e) => e.gameId === ranked.game.id);
          const feed = [...streamed, ...ranked.events]
            .filter((e, i, all) => all.findIndex((x) => x.dedupeKey === e.dedupeKey) === i)
            .slice(0, 6);

          return (
            <div
              key={ranked.game.id}
              className="card"
              style={{ ['--accent' as string]: BUCKET_COLOR[ranked.watch.bucket] }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
                <span className="live-dot" />
                <span className="dim" style={{ fontSize: 12 }}>
                  {describeClock(ranked.game.leagueId, live.period, live.clock)}
                  {ranked.game.live?.situation ? ` · ${ranked.game.live.situation}` : ''}
                </span>
                <div style={{ marginLeft: 'auto' }}>
                  <ScoreBadge score={patch?.watchScore ?? ranked.watch.score} bucket={ranked.watch.bucket} />
                </div>
              </div>

              <div className="scoreline">
                <div className="side">
                  <TeamChip abbrev={ranked.away.abbrev} colors={ranked.away.colors} />
                  <div style={{ minWidth: 0 }}>
                    <div className="name">{ranked.away.shortName}</div>
                    <div className="pts">{live.awayScore}</div>
                  </div>
                </div>
                <div className="clock">{ranked.game.venue}</div>
                <div className="side away">
                  <div style={{ minWidth: 0 }}>
                    <div className="name">{ranked.home.shortName}</div>
                    <div className="pts">{live.homeScore}</div>
                  </div>
                  <TeamChip abbrev={ranked.home.abbrev} colors={ranked.home.colors} />
                </div>
              </div>

              {feed.length > 0 ? (
                <EventFeed events={feed} />
              ) : (
                <div
                  className="dim"
                  style={{ fontSize: 12, marginTop: 12, paddingTop: 12, borderTop: '1px solid var(--border)' }}
                >
                  No events recorded yet — this game was already in progress when polling started.
                </div>
              )}

              <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
                <Link href={`/game/${encodeURIComponent(ranked.game.id)}`} className="btn btn-sm">
                  Full detail
                </Link>
                <Link href={`/team/${encodeURIComponent(ranked.home.id)}`} className="btn btn-sm">
                  {ranked.home.shortName}
                </Link>
              </div>
            </div>
          );
        })}
      </div>

      <FreshnessNote freshness={data.freshness} />
      <div className="dim" style={{ fontSize: 11, marginTop: 8, textAlign: 'center' }}>
        {connected ? 'Streaming live · ' : 'Offline · '}
        {prefs.timezone}
      </div>
    </>
  );
}
