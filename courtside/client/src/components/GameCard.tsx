import { Link } from 'wouter';
import type { RankedGame } from '../../../shared/types.ts';
import type { ScorePatch } from '../lib/api.ts';
import { describeClock } from '../../../shared/leagues.ts';
import { BUCKET_COLOR, BUCKET_LABEL, timeIn, untilKickoff } from '../lib/format.ts';
import { TeamChip, readableOn } from './ui.tsx';
import { useFlash } from '../lib/useFlash.ts';

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
  const flashing = useFlash(live ? `${live.awayScore}-${live.homeScore}` : undefined);

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
              <b className={flashing ? 'flash' : undefined} style={{ color: 'var(--text)' }}>
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
  const flashing = useFlash(live ? `${live.awayScore}-${live.homeScore}` : undefined);

  return (
    <section
      className="hero"
      style={{
        ['--accent' as string]: accent,
        ['--home-color' as string]: home.colors[0],
        ['--away-color' as string]: away.colors[0],
      }}
    >
      <div className="hero-eyebrow">
        {isLive ? <span className="live-dot" /> : null}
        {isLive ? 'On now' : "Tonight's pick"} · {BUCKET_LABEL[watch.bucket]} · {Math.round(watch.score)}/100
      </div>

      <div className="matchup">
        <div className="crest">
          <span
            className="crest-badge"
            style={{ background: away.colors[0], color: readableOn(away.colors[0]) }}
            aria-hidden
          >
            {away.abbrev}
          </span>
          <span className="crest-name">{away.shortName}</span>
          <span className="crest-record">
            {away.record.w}-{away.record.l}
            {away.record.d > 0 ? `-${away.record.d}` : ''}
          </span>
        </div>

        {isLive && live ? (
          <span className={`bigscore${flashing ? ' flash' : ''}`}>
            {live.awayScore}–{live.homeScore}
          </span>
        ) : (
          <span className="versus">vs</span>
        )}

        <div className="crest">
          <span
            className="crest-badge"
            style={{ background: home.colors[0], color: readableOn(home.colors[0]) }}
            aria-hidden
          >
            {home.abbrev}
          </span>
          <span className="crest-name">{home.shortName}</span>
          <span className="crest-record">
            {home.record.w}-{home.record.l}
            {home.record.d > 0 ? `-${home.record.d}` : ''}
          </span>
        </div>
      </div>

      <div className="hero-meta">
        {isLive && live
          ? describeClock(game.leagueId, live.period, live.clock)
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
