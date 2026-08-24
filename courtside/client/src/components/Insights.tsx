import { useState } from 'react';
import type { TeamInsights } from '../../../shared/types.ts';
import { api, useResource } from '../lib/api.ts';
import { relative, signed } from '../lib/format.ts';
import { ErrorState, Skeleton } from './ui.tsx';

interface InsightsResponse extends TeamInsights {
  budget: { configured: boolean; model: string; tokensUsed: number; tokenBudget: number; exhausted: boolean };
}

const verdictColor = (v: number) =>
  v >= 62 ? 'var(--worth-it)' : v <= 38 ? 'var(--brutal)' : 'var(--check-score)';

export default function Insights({ teamId, unit }: { teamId: string; unit: string }) {
  const { data, error, loading, reload } = useResource<InsightsResponse>(`/teams/${encodeURIComponent(teamId)}/insights`);
  const [regenerating, setRegenerating] = useState(false);
  const [showAll, setShowAll] = useState(false);

  const regenerate = async () => {
    setRegenerating(true);
    try {
      await api.get(`/teams/${encodeURIComponent(teamId)}/insights?force=true`);
      reload();
    } finally {
      setRegenerating(false);
    }
  };

  if (loading && !data) return <Skeleton count={2} height={110} />;
  if (error) return <ErrorState message={error} onRetry={reload} />;
  if (!data) return null;

  const metrics = showAll ? data.metrics : data.metrics.slice(0, 6);

  return (
    <div className="card">
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 4 }}>
        <div style={{ fontSize: 14, fontWeight: 600 }}>Utilization</div>
        <div className="dim" style={{ fontSize: 11.5, marginLeft: 'auto', textAlign: 'right' }}>
          {data.source === 'ai' ? `${data.model}` : 'rule-based'} · {relative(data.generatedAt)}
        </div>
      </div>

      <div className="dim" style={{ fontSize: 12, marginBottom: 12, lineHeight: 1.45 }}>
        {data.source === 'ai'
          ? 'Every number below was computed from box scores before the model saw it. The model explains the numbers; it never produces them.'
          : data.budget.configured
            ? 'Model unavailable for this request — showing the rule-based analysis computed from the same box scores.'
            : 'No ANTHROPIC_API_KEY configured — showing the rule-based analysis computed from box scores. Numbers are identical either way.'}
      </div>

      {data.insights.map((insight, i) => (
        <div key={i} className="insight" style={{ borderLeftColor: verdictColor(insight.confidence === 'high' ? 70 : 50) }}>
          <h4>{insight.headline}</h4>
          <p>{insight.recommendation}</p>
          <ul>
            {insight.evidence.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
          <div className="dim" style={{ fontSize: 11, marginTop: 6 }}>
            {insight.confidence} confidence · from last {data.gamesPlayed} games
          </div>
        </div>
      ))}

      <div style={{ marginTop: 16, paddingTop: 12, borderTop: '1px solid var(--border)' }}>
        <div className="section-title" style={{ margin: '0 0 8px' }}>
          Computed metrics
        </div>
        {metrics.map((m) => (
          <div key={m.playerId} className="player-row" style={{ gridTemplateColumns: '1fr auto auto' }}>
            <div style={{ minWidth: 0 }}>
              <div className="player-name">{m.playerName}</div>
              <div className="player-meta tabnum">
                {m.minutesPerGame} min · {m.per36Primary} per 36 · on/off {signed(m.onOffDiff)}
                {m.minutesTrend !== 0 && ` · trend ${signed(m.minutesTrend)}`}
              </div>
            </div>
            <div className="verdict-bar" title={`Utilization verdict ${m.utilizationVerdict}/100`}>
              <i style={{ width: `${m.utilizationVerdict}%`, background: verdictColor(m.utilizationVerdict) }} />
            </div>
            <span className="player-stat tabnum" style={{ width: 26 }}>
              {m.utilizationVerdict}
            </span>
          </div>
        ))}

        {data.metrics.length > 6 && (
          <button className="btn btn-sm" style={{ marginTop: 10 }} onClick={() => setShowAll(!showAll)}>
            {showAll ? 'Show fewer' : `Show all ${data.metrics.length}`}
          </button>
        )}
      </div>

      <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 14 }}>
        <button className="btn btn-sm" onClick={regenerate} disabled={regenerating}>
          {regenerating ? 'Regenerating…' : 'Regenerate'}
        </button>
        {data.budget.configured && (
          <span className="dim tabnum" style={{ fontSize: 11 }}>
            {data.budget.tokensUsed.toLocaleString()} / {data.budget.tokenBudget.toLocaleString()} tokens this month
          </span>
        )}
      </div>
      <div className="dim" style={{ fontSize: 11, marginTop: 6 }}>
        Verdict above 62 means the data supports more minutes; below 38, fewer. Unit: {unit}.
      </div>
    </div>
  );
}
