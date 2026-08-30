import { useState } from 'react';
import type { Team, TeamSchedule } from '../../../shared/types.ts';
import { dayIn, TIER_COLOR } from '../lib/format.ts';

const KIND_COLOR = {
  gauntlet: 'var(--brutal)',
  soft: 'var(--easy)',
  trap: 'var(--tough)',
} as const;

const KIND_LABEL = {
  gauntlet: 'Gauntlet',
  soft: 'Soft stretch',
  trap: 'Trap game',
} as const;

/**
 * Fifteen games as fifteen cells. The point is the shape of the run — where the
 * hard weeks cluster — which a list of fixtures never shows you.
 */
export default function DifficultyStrip({
  schedule,
  teamsById,
  teamId,
  timezone,
}: {
  schedule: TeamSchedule;
  teamsById: Map<string, Team>;
  teamId: string;
  timezone: string;
}) {
  const [selected, setSelected] = useState<string | null>(null);
  const chosen = schedule.games.find((g) => g.game.id === selected) ?? null;

  return (
    <div className="card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 12 }}>
        <div style={{ fontSize: 14, fontWeight: 600 }}>Next {schedule.games.length} games</div>
        <div className="dim tabnum" style={{ fontSize: 12.5 }}>
          projected {schedule.projectedRecord.w}–{schedule.projectedRecord.l}
        </div>
      </div>

      <div className="strip" role="group" aria-label="Schedule difficulty">
        {schedule.games.map(({ game, difficulty }) => {
          const oppId = game.homeTeamId === teamId ? game.awayTeamId : game.homeTeamId;
          const opponent = teamsById.get(oppId);
          const isHome = game.homeTeamId === teamId;
          return (
            <button
              key={game.id}
              className="strip-cell"
              aria-pressed={selected === game.id}
              onClick={() => setSelected(selected === game.id ? null : game.id)}
              style={{ background: TIER_COLOR[difficulty.tier] }}
              title={`${isHome ? 'vs' : '@'} ${opponent?.shortName ?? '—'} · difficulty ${difficulty.score}`}
            >
              <span className="opp">{opponent?.abbrev ?? '—'}</span>
              <span className="ha">{isHome ? 'H' : 'A'}</span>
            </button>
          );
        })}
      </div>

      <div className="strip-legend">
        {(['easy', 'moderate', 'tough', 'brutal'] as const).map((tier) => (
          <span key={tier}>
            <i style={{ background: TIER_COLOR[tier] }} />
            {tier}
          </span>
        ))}
      </div>

      {chosen && (
        <div style={{ marginTop: 14, paddingTop: 12, borderTop: '1px solid var(--border)' }}>
          <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 3 }}>
            {chosen.game.homeTeamId === teamId ? 'vs ' : '@ '}
            {teamsById.get(
              chosen.game.homeTeamId === teamId ? chosen.game.awayTeamId : chosen.game.homeTeamId,
            )?.shortName}
          </div>
          <div className="dim tabnum" style={{ fontSize: 12.5, marginBottom: 9 }}>
            {dayIn(chosen.game.startsAt, timezone)} · difficulty {chosen.difficulty.score} ·{' '}
            {Math.round(chosen.difficulty.winProb * 100)}% win probability
          </div>
          {chosen.difficulty.factors.length > 0 ? (
            <div className="checks">
              {chosen.difficulty.factors.map((factor) => (
                <span key={factor} className="check">
                  {factor}
                </span>
              ))}
            </div>
          ) : (
            <div className="dim" style={{ fontSize: 12.5 }}>
              Nothing unusual — normal rest, no travel penalty.
            </div>
          )}
        </div>
      )}

      {schedule.stretches.length > 0 && (
        <div className="stack" style={{ marginTop: 14 }}>
          {schedule.stretches.map((stretch, i) => (
            <div
              key={`${stretch.kind}-${i}`}
              className="stretch"
              style={{ ['--kind-color' as string]: KIND_COLOR[stretch.kind] }}
            >
              <div>
                <div className="label">{KIND_LABEL[stretch.kind]}</div>
                <div className="dim tabnum" style={{ fontSize: 11.5 }}>
                  {stretch.label}
                </div>
              </div>
              <div className="detail">{stretch.detail}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
