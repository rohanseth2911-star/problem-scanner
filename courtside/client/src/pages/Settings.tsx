import { useState } from 'react';
import type { AlertTier, Preferences, Team } from '../../../shared/types.ts';
import { ALERT_TIER_LABELS, LEAGUE_LABELS } from '../../../shared/types.ts';
import { api, useResource } from '../lib/api.ts';
import { relative } from '../lib/format.ts';
import { ErrorState, Section, Skeleton } from '../components/ui.tsx';

interface Health {
  provider: string;
  callsToday: number;
  dailyLimit: number;
  cacheHitRate: number;
  lastError: string | null;
  lastSuccessAt: string | null;
  byEndpoint: Array<{ endpoint: string; calls: number; hits: number; misses: number }>;
  poller: { running: boolean; lastTickAt: string | null; intervalMs: number; channel: string; sseClients: number };
  ai: { configured: boolean; model: string; tokensUsed: number; tokenBudget: number };
}

const TIERS: AlertTier[] = ['all', 'key', 'clutch', 'final', 'off'];
const SERVICES = ['NBA League Pass', 'ESPN+', 'ESPN', 'Peacock', 'Netflix', 'TNT', 'ABC', 'NBC', 'CBS', 'FOX', 'USA Network', 'Tennis Channel'];

export default function Settings({
  prefs,
  onSave,
}: {
  prefs: Preferences;
  onSave: (next: Preferences) => void;
}) {
  const teams = useResource<{ teams: Team[] }>('/teams');
  const health = useResource<Health>('/health/providers');
  const [saving, setSaving] = useState(false);
  const [testResult, setTestResult] = useState<string | null>(null);

  const save = async (patch: Partial<Preferences>) => {
    setSaving(true);
    try {
      onSave(await api.put<Preferences>('/preferences', patch));
    } finally {
      setSaving(false);
    }
  };

  const toggleTeam = (teamId: string) => {
    const tracked = prefs.trackedTeamIds.includes(teamId)
      ? prefs.trackedTeamIds.filter((id) => id !== teamId)
      : [...prefs.trackedTeamIds, teamId];
    void save({ trackedTeamIds: tracked });
  };

  const toggleService = (service: string) => {
    const subs = prefs.subscriptions.includes(service)
      ? prefs.subscriptions.filter((s) => s !== service)
      : [...prefs.subscriptions, service];
    void save({ subscriptions: subs });
  };

  const sendTest = async () => {
    setTestResult('Sending…');
    try {
      const result = await api.post<{ delivered: boolean; channel: string }>('/notify/test');
      setTestResult(
        result.delivered
          ? `Sent via ${result.channel}.`
          : `Not delivered via ${result.channel} — check the server log.`,
      );
    } catch (err) {
      setTestResult((err as Error).message);
    }
  };

  if (teams.error) return <ErrorState message={teams.error} onRetry={teams.reload} />;
  if (!teams.data) return <Skeleton count={4} height={90} />;

  const byLeague = new Map<string, Team[]>();
  for (const team of teams.data.teams) {
    byLeague.set(team.leagueId, [...(byLeague.get(team.leagueId) ?? []), team]);
  }

  return (
    <>
      <Section title="Alerts">
        <div className="card">
          <div className="field">
            <label htmlFor="default-tier">Default tier for tracked teams</label>
            <select
              id="default-tier"
              value={prefs.defaultAlertTier}
              onChange={(e) => void save({ defaultAlertTier: e.target.value as AlertTier })}
            >
              {TIERS.map((tier) => (
                <option key={tier} value={tier}>
                  {ALERT_TIER_LABELS[tier]}
                </option>
              ))}
            </select>
            {prefs.defaultAlertTier === 'all' && (
              <div className="notice">
                <span aria-hidden>⚠</span>
                <div>
                  Every score change is roughly <b>180 notifications per NBA game</b>. Most people
                  want "Key moments".
                </div>
              </div>
            )}
          </div>

          <div className="field">
            <label htmlFor="drop">Drop-everything threshold</label>
            <input
              id="drop"
              type="number"
              min={50}
              max={100}
              value={prefs.dropEverythingThreshold}
              onChange={(e) => void save({ dropEverythingThreshold: Number(e.target.value) })}
            />
            <div className="hint">
              A game at or above this watchability score that reaches clutch time will alert you
              regardless of tier — unless you have explicitly muted both teams.
            </div>
          </div>

          <div style={{ display: 'flex', gap: 9, alignItems: 'center', flexWrap: 'wrap' }}>
            <button className="btn btn-sm" onClick={sendTest}>
              Send test alert
            </button>
            {testResult && <span className="dim" style={{ fontSize: 12 }}>{testResult}</span>}
          </div>
        </div>
      </Section>

      <Section title="Per-team alert tiers">
        <div className="card">
          {prefs.trackedTeamIds.map((teamId) => {
            const team = teams.data!.teams.find((t) => t.id === teamId);
            if (!team) return null;
            return (
              <div key={teamId} className="toggle-row">
                <div>
                  <div className="name">{team.name}</div>
                  <div className="sub">{LEAGUE_LABELS[team.leagueId]}</div>
                </div>
                <select
                  aria-label={`Alert tier for ${team.name}`}
                  value={prefs.alertTiers[teamId] ?? prefs.defaultAlertTier}
                  onChange={(e) =>
                    void save({
                      alertTiers: { ...prefs.alertTiers, [teamId]: e.target.value as AlertTier },
                    })
                  }
                >
                  {TIERS.map((tier) => (
                    <option key={tier} value={tier}>
                      {ALERT_TIER_LABELS[tier]}
                    </option>
                  ))}
                </select>
              </div>
            );
          })}
        </div>
      </Section>

      <Section title="Teams you follow">
        {[...byLeague.entries()].map(([leagueId, leagueTeams]) => (
          <div key={leagueId} style={{ marginBottom: 12 }}>
            <div className="dim" style={{ fontSize: 12, margin: '10px 2px 6px' }}>
              {LEAGUE_LABELS[leagueId as keyof typeof LEAGUE_LABELS]}
            </div>
            <div className="checks">
              {leagueTeams.map((team) => (
                <button
                  key={team.id}
                  className="check"
                  data-on={prefs.trackedTeamIds.includes(team.id)}
                  onClick={() => toggleTeam(team.id)}
                  disabled={saving}
                >
                  {team.shortName}
                </button>
              ))}
            </div>
          </div>
        ))}
      </Section>

      <Section title="What you can watch">
        <div className="checks">
          {SERVICES.map((service) => (
            <button
              key={service}
              className="check"
              data-on={prefs.subscriptions.includes(service)}
              onClick={() => toggleService(service)}
              disabled={saving}
            >
              {service}
            </button>
          ))}
        </div>
        <div className="hint" style={{ marginTop: 9 }}>
          Games not carried on your services are scored lower, never hidden.
        </div>
      </Section>

      <Section title="System">
        <div className="card">
          {health.data ? (
            <>
              <div className="kv">
                <span className="k">Provider</span>
                <span className="v">{health.data.provider}</span>
              </div>
              <div className="kv">
                <span className="k">Upstream calls today</span>
                <span className="v">
                  {health.data.callsToday} / {health.data.dailyLimit}
                </span>
              </div>
              <div className="kv">
                <span className="k">Cache hit rate</span>
                <span className="v">{Math.round(health.data.cacheHitRate * 100)}%</span>
              </div>
              <div className="kv">
                <span className="k">Poller</span>
                <span className="v">
                  {health.data.poller.running
                    ? `every ${Math.round(health.data.poller.intervalMs / 1000)}s · ${relative(health.data.poller.lastTickAt)}`
                    : 'stopped'}
                </span>
              </div>
              <div className="kv">
                <span className="k">Alert channel</span>
                <span className="v">{health.data.poller.channel}</span>
              </div>
              <div className="kv">
                <span className="k">Live subscribers</span>
                <span className="v">{health.data.poller.sseClients}</span>
              </div>
              <div className="kv">
                <span className="k">AI model</span>
                <span className="v">
                  {health.data.ai.configured ? health.data.ai.model : 'not configured'}
                </span>
              </div>
              {health.data.lastError && (
                <div className="notice error" style={{ marginTop: 12 }}>
                  <span aria-hidden>⚠</span>
                  <div>Last upstream error: {health.data.lastError}</div>
                </div>
              )}
              <button className="btn btn-sm" style={{ marginTop: 12 }} onClick={health.reload}>
                Refresh
              </button>
            </>
          ) : (
            <Skeleton count={1} height={140} />
          )}
        </div>
      </Section>

      <div className="dim" style={{ fontSize: 11.5, textAlign: 'center', marginTop: 20 }}>
        Times shown in {prefs.timezone}. Set USER_TIMEZONE to change it.
      </div>
    </>
  );
}
