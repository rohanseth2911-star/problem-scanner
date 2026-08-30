import { useState } from 'react';
import type { Player, RosterRole } from '../../../shared/types.ts';
import { relative } from '../lib/format.ts';
import { Pill } from './ui.tsx';

const GROUPS: Array<{ key: RosterRole | 'injured'; label: string }> = [
  { key: 'injured', label: 'Injured / out' },
  { key: 'starter', label: 'Starters' },
  { key: 'rotation', label: 'Rotation' },
  { key: 'bench', label: 'Bench' },
];

const SIDELINED = new Set(['OUT', 'DOUBTFUL', 'QUESTIONABLE', 'GTD']);

export default function Roster({ players, unit }: { players: Player[]; unit: string }) {
  const [open, setOpen] = useState<Set<string>>(new Set(['injured', 'starter']));

  const toggle = (key: string) =>
    setOpen((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });

  const bucketed = new Map<string, Player[]>();
  for (const player of players) {
    // Availability outranks depth chart: a starter who is out belongs with the
    // injured, because that is the question you are actually asking.
    const key = player.injury && SIDELINED.has(player.injury.status) ? 'injured' : player.role;
    bucketed.set(key, [...(bucketed.get(key) ?? []), player]);
  }

  return (
    <div className="card">
      {GROUPS.map(({ key, label }) => {
        const group = bucketed.get(key) ?? [];
        if (group.length === 0) return null;
        const isOpen = open.has(key);

        return (
          <div key={key} className="roster-group">
            <button
              onClick={() => toggle(key)}
              aria-expanded={isOpen}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                width: '100%',
                background: 'none',
                border: 'none',
                padding: '8px 0',
                fontSize: 12,
                fontWeight: 650,
                letterSpacing: '0.06em',
                textTransform: 'uppercase',
                color: key === 'injured' ? 'var(--tough)' : 'var(--text-dim)',
              }}
            >
              <span aria-hidden style={{ fontSize: 10 }}>{isOpen ? '▾' : '▸'}</span>
              {label}
              <span style={{ opacity: 0.6 }}>{group.length}</span>
            </button>

            {isOpen &&
              group.map((player) => (
                <div key={player.id} className="player-row">
                  <span className="player-num">{player.number}</span>
                  <div style={{ minWidth: 0 }}>
                    <div className="player-name">{player.name}</div>
                    <div className="player-meta">
                      {player.position} · {player.age}y · {player.yearsPro === 0 ? 'rookie' : `${player.yearsPro}y pro`}
                      {player.injury && SIDELINED.has(player.injury.status) && (
                        <>
                          {' · '}
                          <span style={{ color: 'var(--tough)' }}>{player.injury.description}</span>
                          {player.injury.expectedReturn && ` · back in ~${player.injury.expectedReturn}`}
                          {' · reported '}
                          {relative(player.injury.reportedAt)}
                        </>
                      )}
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    {player.injury && SIDELINED.has(player.injury.status) ? (
                      <Pill kind={player.injury.status}>{player.injury.status}</Pill>
                    ) : (
                      <span className="player-stat">
                        {player.stats.minutesPerGame} min · {player.stats.primary} {unit}
                      </span>
                    )}
                  </div>
                </div>
              ))}
          </div>
        );
      })}
    </div>
  );
}
