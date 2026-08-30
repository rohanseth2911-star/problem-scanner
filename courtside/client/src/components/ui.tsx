import type { ReactNode } from 'react';
import type { Freshness } from '../lib/api.ts';
import { relative } from '../lib/format.ts';

export function Section({ title, action, children }: { title: string; action?: ReactNode; children: ReactNode }) {
  return (
    <>
      <div className="section-title">
        {title}
        {action}
      </div>
      {children}
    </>
  );
}

export function Skeleton({ height = 74, count = 3 }: { height?: number; count?: number }) {
  return (
    <div className="stack" aria-busy="true" aria-label="Loading">
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="skeleton" style={{ height }} />
      ))}
    </div>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="notice error">
      <span aria-hidden>⚠</span>
      <div style={{ flex: 1 }}>
        <div style={{ fontWeight: 600, marginBottom: 2 }}>Data unavailable</div>
        <div className="dim">{message}</div>
        {onRetry && (
          <button className="btn btn-sm" style={{ marginTop: 9 }} onClick={onRetry}>
            Try again
          </button>
        )}
      </div>
    </div>
  );
}

export function Empty({ children }: { children: ReactNode }) {
  return <div className="empty">{children}</div>;
}

/**
 * Freshness is shown everywhere data is. The app never implies numbers are live
 * when they came from a cache — the timestamp is part of the answer.
 */
export function FreshnessNote({ freshness }: { freshness?: Freshness }) {
  if (!freshness) return null;
  return (
    <div className="notice info" style={{ marginTop: 14 }}>
      <span aria-hidden>◷</span>
      <div>
        Data as of {relative(freshness.lastSuccessAt)} via <b>{freshness.provider}</b>
        {freshness.provider === 'mock' && ' — fixture data for development. Team names and venues are real; every person and statistic is invented.'}
        {freshness.stale && ' · last fetch errored, showing cached values'}
      </div>
    </div>
  );
}

export function TeamChip({ abbrev, colors }: { abbrev: string; colors: [string, string] }) {
  return (
    <span
      className="team-chip"
      style={{ background: colors[0], color: readableOn(colors[0]) }}
      aria-hidden
    >
      {abbrev}
    </span>
  );
}

/** Picks black or white text for a background, by relative luminance. */
export function readableOn(hex: string): string {
  const value = hex.replace('#', '');
  const full = value.length === 3 ? value.split('').map((c) => c + c).join('') : value;
  const r = parseInt(full.slice(0, 2), 16) / 255;
  const g = parseInt(full.slice(2, 4), 16) / 255;
  const b = parseInt(full.slice(4, 6), 16) / 255;
  const channel = (c: number) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
  const luminance = 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
  return luminance > 0.45 ? '#0b0e14' : '#f4f7fc';
}

export function Pill({ kind, children }: { kind: string; children: ReactNode }) {
  return <span className={`pill ${kind.toLowerCase()}`}>{children}</span>;
}
