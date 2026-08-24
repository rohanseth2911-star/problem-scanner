import type { DifficultyScore, WatchBucket } from '../../../shared/types.ts';

export const BUCKET_COLOR: Record<WatchBucket, string> = {
  appointment: 'var(--appointment)',
  'must-watch': 'var(--must-watch)',
  'worth-it': 'var(--worth-it)',
  'check-score': 'var(--check-score)',
  skip: 'var(--skip)',
};

export const BUCKET_LABEL: Record<WatchBucket, string> = {
  appointment: 'Appointment',
  'must-watch': 'Must-watch',
  'worth-it': 'Worth it',
  'check-score': 'Check score',
  skip: 'Skip',
};

export const TIER_COLOR: Record<DifficultyScore['tier'], string> = {
  easy: 'var(--easy)',
  moderate: 'var(--moderate)',
  tough: 'var(--tough)',
  brutal: 'var(--brutal)',
};

/** Every displayed time is in the user's zone, with the zone named. */
export function timeIn(iso: string, timezone: string): string {
  return new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    hour: 'numeric',
    minute: '2-digit',
    timeZoneName: 'short',
  }).format(new Date(iso));
}

export function dayIn(iso: string, timezone: string): string {
  return new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  }).format(new Date(iso));
}

export function relative(iso: string | null): string {
  if (!iso) return 'never';
  const seconds = Math.round((Date.now() - new Date(iso).getTime()) / 1000);
  if (seconds < 10) return 'just now';
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.round(hours / 24)}d ago`;
}

export function untilKickoff(iso: string): string {
  const minutes = Math.round((new Date(iso).getTime() - Date.now()) / 60_000);
  if (minutes < 0) return 'started';
  if (minutes < 60) return `in ${minutes}m`;
  const hours = Math.floor(minutes / 60);
  return `in ${hours}h ${minutes % 60}m`;
}

export const signed = (n: number): string => (n >= 0 ? `+${n}` : String(n));
