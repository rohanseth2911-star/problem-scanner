import { Link } from 'wouter';
import type { RankedGame } from '../../../shared/types.ts';
import type { ScorePatch } from '../lib/api.ts';
import { describeClock } from '../../../shared/leagues.ts';
import { BUCKET_COLOR, BUCKET_LABEL, timeIn, untilKickoff } from '../lib/format.ts';
import { TeamChip } from './ui.tsx';

export function ScoreBadge({ score, bucket }: { score: number; bucket: RankedGame['watch']['bucket'] }) {
  return (
    <div
      className="score-badge"
      style={{ ['--accent' as string]: BUCKET_COLOR[bucket] }}
      title={`${BUCKET_LABEL[bucket]} — watchability ${score.toFixed(1)} of 100`}
    >
      <b>{Math.round(score)}</b>
      <span>watch</span>
    </div>
  );
}

export function GameRow({
  ranked,
  timezone,
  patch,
}: {
  ranked: RankedGame;
  timezone: string;
  patch?: ScorePatch;
}) {
  const { game, home, away, watch } = ranked;
  const live = patch?.live ?? game.live;
  const isLive = (patch?.state ?? game.state) === 'live';
  const isFinal = (patch?.state ?? game.state) === 'final';

  return (
    <Link href={`/game/${encodeURIComponent(game.id)}`} className="game-row">
      <ScoreBadge score={patch?.watchScore ?? watch.score} bucket={watch.bucket} />

      <div style={{ minWidth: 0 }}>
        <div className="game-teams">
          {away.shortName} <span className="dim">@</span> {home.shortName}
        </div>
        <div className="game-sub">
          {isLive && live ? (
            <>
              <span className="live-dot" />
              <b style={{ color: 'var(--text)' }}>
                {live.awayScore}–{live.homeScore}
              </b>
              <span>{describeClock(game.leagueId, live.period, live.clock)}</span>
            </>
          ) : isFinal && live ? (
            <>
              <span>Final</span>
              <b style={{ color: 'var(--text)' }}>
                {live.awayScore}–{live.homeScore}
              </b>
            </>
          ) : (
            <>
              <span>{timeIn(game.startsAt, timezone)}</span>
              <span className="dim">{untilKickoff(game.startsAt)}</span>
            </>
          )}
          {game.broadcast.length > 0 && !isLive && <span className="dim">· {game.broadcast[0]}</span>}
        </div>
        {watch.reasons[0] && <div className="game-reason">{watch.reasons[0]}</div>}
      </div>

      <div style={{ display: 'flex', gap: 5 }}>
        <TeamChip abbrev={away.abbrev} colors={away.colors} />
        <TeamChip abbrev={home.abbrev} colors={home.colors} />
      </div>
    </Link>
  );
}

export function HeroPick({
  ranked,
  timezone,
  patch,
}: {
  ranked: RankedGame;
  timezone: string;
  patch?: ScorePatch;
}) {
  const { game, home, away, watch, unavailableOn } = ranked;
  const accent = BUCKET_COLOR[watch.bucket];
  const live = patch?.live ?? game.live;
  const isLive = (patch?.state ?? game.state) === 'live';

  return (
    <section className="hero" style={{ ['--accent' as string]: accent }}>
      <div className="hero-eyebrow">
        {isLive ? <span className="live-dot" /> : null}
        {isLive ? 'On now' : "Tonight's pick"} · {BUCKET_LABEL[watch.bucket]} · {Math.round(watch.score)}/100
      </div>

      <h2 className="hero-matchup">
        {away.name} <span className="dim" style={{ fontWeight: 400 }}>at</span> {home.name}
      </h2>

      <div className="hero-meta">
        {isLive && live
          ? `${live.awayScore}–${live.homeScore} · ${describeClock(game.leagueId, live.period, live.clock)}`
          : `${timeIn(game.startsAt, timezone)} · ${untilKickoff(game.startsAt)}`}
        {game.broadcast.length > 0 && ` · ${game.broadcast.join(', ')}`}
      </div>

      <ul className="hero-reasons">
        {watch.reasons.map((reason) => (
          <li key={reason}>{reason}</li>
        ))}
      </ul>

      {unavailableOn.length > 0 && (
        <div className="notice" style={{ marginTop: 14 }}>
          <span aria-hidden>◐</span>
          <div>Not on your services — carried on {unavailableOn.join(', ')}. Check your listings.</div>
        </div>
      )}

      <div className="hero-actions">
        <Link href={`/game/${encodeURIComponent(game.id)}`} className="btn btn-primary">
          {isLive ? 'Watch live' : 'Game detail'}
        </Link>
        <Link href={`/team/${encodeURIComponent(home.id)}`} className="btn">
          {home.shortName}
        </Link>
        <Link href={`/team/${encodeURIComponent(away.id)}`} className="btn">
          {away.shortName}
        </Link>
      </div>
    </section>
  );
}
