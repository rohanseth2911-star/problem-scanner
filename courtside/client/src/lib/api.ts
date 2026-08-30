import { useCallback, useEffect, useRef, useState } from 'react';
import type { GameEvent } from '../../../shared/types.ts';

export interface Freshness {
  lastSuccessAt: string | null;
  stale: boolean;
  provider: string;
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`/api${path}`, {
    headers: { 'content-type': 'application/json' },
    ...init,
  });
  if (!response.ok) {
    const body = (await response.json().catch(() => ({}))) as { error?: string };
    throw new Error(body.error ?? `Request failed (${response.status})`);
  }
  return (await response.json()) as T;
}

export const api = {
  get: <T,>(path: string) => request<T>(path),
  put: <T,>(path: string, body: unknown) =>
    request<T>(path, { method: 'PUT', body: JSON.stringify(body) }),
  post: <T,>(path: string, body?: unknown) =>
    request<T>(path, { method: 'POST', body: JSON.stringify(body ?? {}) }),
};

export interface Resource<T> {
  data: T | null;
  error: string | null;
  loading: boolean;
  reload: () => void;
}

/** Fetch-on-mount with an explicit error state — never a silent empty screen. */
export function useResource<T>(path: string | null, deps: unknown[] = []): Resource<T> {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(path !== null);
  const [nonce, setNonce] = useState(0);

  useEffect(() => {
    if (!path) return;
    let cancelled = false;
    setLoading(true);

    api
      .get<T>(path)
      .then((result) => {
        if (cancelled) return;
        setData(result);
        setError(null);
      })
      .catch((err: Error) => {
        if (!cancelled) setError(err.message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [path, nonce, ...deps]);

  const reload = useCallback(() => setNonce((n) => n + 1), []);
  return { data, error, loading, reload };
}

export interface ScorePatch {
  gameId: string;
  live: { homeScore: number; awayScore: number; period: number; clock: string } | null;
  state: string;
  watchScore: number;
}

/**
 * Subscribes to the server's event stream. EventSource reconnects on its own,
 * so the only job here is to surface connection state honestly — a disconnected
 * ticker must not look like a quiet game.
 */
export function useLiveStream() {
  const [connected, setConnected] = useState(false);
  const [patches, setPatches] = useState<Map<string, ScorePatch>>(new Map());
  const [events, setEvents] = useState<GameEvent[]>([]);
  const sourceRef = useRef<EventSource | null>(null);

  useEffect(() => {
    const source = new EventSource('/api/stream');
    sourceRef.current = source;

    source.onopen = () => setConnected(true);
    source.onerror = () => setConnected(false);

    source.addEventListener('scores', (message) => {
      const payload = JSON.parse((message as MessageEvent<string>).data) as {
        games: ScorePatch[];
      };
      setPatches(new Map(payload.games.map((g) => [g.gameId, g])));
      setConnected(true);
    });

    source.addEventListener('game-event', (message) => {
      const event = JSON.parse((message as MessageEvent<string>).data) as GameEvent;
      setEvents((prev) => [event, ...prev].slice(0, 40));
    });

    return () => {
      source.close();
      sourceRef.current = null;
    };
  }, []);

  return { connected, patches, events };
}
