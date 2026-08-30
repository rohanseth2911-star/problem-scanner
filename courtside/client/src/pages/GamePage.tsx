import { Link } from 'wouter';
import type { GameEvent, Preferences, RankedGame } from '../../../shared/types.ts';
import { useLiveStream, useResource, type Freshness } from '../lib/api.ts';
import { describeClock } from '../../../shared/leagues.ts';
import { BUCKET_COLOR, BUCKET_LABEL, dayIn, timeIn, untilKickoff } from '../lib/format.ts';
import { ErrorState, FreshnessNote, Section, Skeleton, TeamChip } from '../components/ui.tsx';
import { EventFeed } from './Live.tsx';
import { WEIGHT_LABELS } from '../lib/weights.ts';

interface GameResponse extends RankedGame {
  events: GameEvent[];
  freshness: Freshness;
}

export default function GamePage({ id, prefs }: { id: string; prefs: Preferences }) {
  const { data, error, loading, reload } = useResource<GameResponse>(`/games/${encodeURIComponent(id)}`);
  const { patches, events } = useLiveStream();

  if (loading && !data) return <Skeleton count={3} height={130} />;
  if (error) return <ErrorState message={error} onRetry={reload} />;
  if (!data) return null;

  const { game, home, away, watch } = data;
  const patch = patches.get(game.id);
  const live = patch?.live ?? game.live;
  const state = patch?.state ?? game.state;
  const accent = BUCKET_COLOR[watch.bucket];

  const feed = [...events.filter((e) => e.gameId === game.id), ...data.events]
    .filter((e, i, all) => all.findIndex((x) => x.dedupeKey === e.dedupeKey) === i)
    .slice(0, 15);

  return (
    <>
      <div className="card" style={{ ['--accent' as string]: accent }}>
        <div className="dim" style={{ fontSize: 12, marginBottom: 12 }}>
          {state === 'live' && <span className="live-dot" style={{ display: 'inline-block', marginRight: 7 }} />}
          {state === 'live'
            ? describeClock(game.leagueId, live?.period ?? 1, live?.clock ?? '')
            : state === 'final'
              ? 'Final'
              : `${dayIn(game.startsAt, prefs.timezone)} · ${timeIn(game.startsAt, prefs.timezone)} · ${untilKickoff(game.startsAt)}`}
          {game.venue && ` · ${game.venue}`}
        </div>

        <div className="scoreline">
          <div className="side">
            <TeamChip abbrev={away.abbrev} colors={away.colors} />
            <div style={{ minWidth: 0 }}>
              <div className="name">{away.shortName}</div>
              {live ? <div className="pts">{live.awayScore}</div> : <div className="dim" style={{ fontSize: 12 }}>{away.record.w}–{away.record.l}</div>}
            </div>
          </div>
          <div className="clock">{game.broadcast.join(', ') || '—'}</div>
          <div className="side away">
            <div style={{ minWidth: 0 }}>
              <div className="name">{home.shortName}</div>
              {live ? <div className="pts">{live.homeScore}</div> : <div className="dim" style={{ fontSize: 12 }}>{home.record.w}–{home.record.l}</div>}
            </div>
            <TeamChip abbrev={home.abbrev} colors={home.colors} />
          </div>
        </div>

        {feed.length > 0 && <EventFeed events={feed} />}

        <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
          <Link href={`/team/${encodeURIComponent(away.id)}`} className="btn btn-sm">
            {away.shortName}
          </Link>
          <Link href={`/team/${encodeURIComponent(home.id)}`} className="btn btn-sm">
            {home.shortName}
          </Link>
        </div>
      </div>

      <Section title="Why this score">
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 12 }}>
            <span style={{ fontSize: 30, fontWeight: 680, color: accent, letterSpacing: '-0.03em' }}>
              {Math.round(watch.score)}
            </span>
            <span style={{ color: accent, fontWeight: 600 }}>{BUCKET_LABEL[watch.bucket]}</span>
            <span className="dim tabnum" style={{ marginLeft: 'auto', fontSize: 12 }}>
              {Math.round(watch.impliedWinProb * 100)}% {home.shortName}
            </span>
          </div>

          <ul className="hero-reasons" style={{ ['--accent' as string]: accent, marginBottom: 16 }}>
            {watch.reasons.map((reason) => (
              <li key={reason}>{reason}</li>
            ))}
          </ul>

          {Object.entries(watch.components)
            .sort(([, a], [, b]) => b - a)
            .map(([key, value]) => (
              <div key={key} className="kv">
                <span className="k">{WEIGHT_LABELS[key] ?? key}</span>
                <span className="v" style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                  <span className="verdict-bar">
                    <i style={{ width: `${Math.round(value * 100)}%`, background: accent }} />
                  </span>
                  {Math.round(value * 100)}
                </span>
              </div>
            ))}
        </div>
      </Section>

      {game.notes.length > 0 && (
        <Section title="Storylines">
          <div className="card">
            <ul className="hero-reasons" style={{ ['--accent' as string]: accent }}>
              {game.notes.map((note) => (
                <li key={note}>{note}</li>
              ))}
            </ul>
          </div>
        </Section>
      )}

      <FreshnessNote freshness={data.freshness} />
    </>
  );
}
