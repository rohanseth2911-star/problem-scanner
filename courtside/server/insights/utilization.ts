import type { BoxScore, Player, UtilizationMetric } from '../../shared/types.ts';

/**
 * Utilization analysis, computed in code from real box scores.
 *
 * The model never sees a raw stat line and is never asked to do arithmetic.
 * It receives these finished numbers and explains them — which is the only way
 * an "AI insight" about playing time can be checked against reality.
 */

/** Least-squares slope, expressed as the total change across the window. */
export function trendAcrossWindow(values: number[]): number {
  const n = values.length;
  if (n < 2) return 0;
  const meanX = (n - 1) / 2;
  const meanY = values.reduce((a, b) => a + b, 0) / n;

  let numerator = 0;
  let denominator = 0;
  for (let i = 0; i < n; i++) {
    numerator += (i - meanX) * ((values[i] ?? 0) - meanY);
    denominator += (i - meanX) ** 2;
  }
  if (denominator === 0) return 0;
  return (numerator / denominator) * (n - 1);
}

const mean = (values: number[]) =>
  values.length === 0 ? 0 : values.reduce((a, b) => a + b, 0) / values.length;

const median = (values: number[]) => {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? ((sorted[mid - 1] ?? 0) + (sorted[mid] ?? 0)) / 2 : sorted[mid] ?? 0;
};

const round1 = (n: number) => Math.round(n * 10) / 10;

export function computeUtilization(
  players: Player[],
  boxScores: BoxScore[],
): UtilizationMetric[] {
  const byPlayer = new Map<string, Array<{ minutes: number; primary: number; efficiency: number; plusMinus: number }>>();

  for (const box of boxScores) {
    for (const line of box.lines) {
      const list = byPlayer.get(line.playerId) ?? [];
      list.push({
        minutes: line.minutes,
        primary: line.primary,
        efficiency: line.efficiency,
        plusMinus: line.plusMinus,
      });
      byPlayer.set(line.playerId, list);
    }
  }

  const raw = players.map((player) => {
    const lines = byPlayer.get(player.id) ?? [];
    const minutes = lines.map((l) => l.minutes);
    const mpg = mean(minutes);
    const per36 = mpg > 0 ? (mean(lines.map((l) => l.primary)) / mpg) * 36 : 0;

    return {
      player,
      mpg,
      per36,
      minutesTrend: trendAcrossWindow(minutes),
      efficiency: mean(lines.map((l) => l.efficiency)),
      onOffDiff: mean(lines.map((l) => l.plusMinus)),
      games: lines.length,
    };
  });

  // Compare each player against their own team, not a league constant — a
  // 20-point per-36 scorer means something different on each roster.
  const per36Median = median(raw.filter((r) => r.mpg > 5).map((r) => r.per36));
  const efficiencyMedian = median(raw.filter((r) => r.mpg > 5).map((r) => r.efficiency));

  return raw
    .filter((r) => r.games > 0)
    .map(({ player, mpg, per36, minutesTrend, efficiency, onOffDiff }) => {
      const flags: string[] = [];
      const young = player.age <= 23 || player.yearsPro <= 2;
      const veteran = player.age >= 33;

      if (young) flags.push('young player');
      if (veteran) flags.push('veteran');
      if (minutesTrend >= 4) flags.push('minutes trending up');
      if (minutesTrend <= -4) flags.push('minutes trending down');
      if (per36 > per36Median * 1.15 && mpg < 22) flags.push('produces in limited minutes');
      if (per36 < per36Median * 0.85 && mpg > 28) flags.push('heavy minutes, below-median production');
      if (onOffDiff >= 4) flags.push('team is better with them on');
      if (onOffDiff <= -4) flags.push('team is worse with them on');
      if (efficiency > efficiencyMedian * 1.1) flags.push('efficient');

      // Deterministic verdict. Above 60 means "play them more", below 40 "less".
      let verdict = 50;
      if (per36Median > 0) verdict += Math.max(-18, Math.min(18, ((per36 - per36Median) / per36Median) * 40));
      if (efficiencyMedian > 0) verdict += Math.max(-8, Math.min(8, ((efficiency - efficiencyMedian) / efficiencyMedian) * 30));
      verdict += Math.max(-10, Math.min(10, onOffDiff * 1.6));
      // Room to grow matters as much as merit: a 34-minute starter has none.
      verdict += mpg < 18 ? 10 : mpg > 30 ? -12 : 0;
      if (young && minutesTrend > 0) verdict += 4;
      if (veteran && minutesTrend < 0 && mpg > 28) verdict -= 10;

      return {
        playerId: player.id,
        playerName: player.name,
        minutesPerGame: round1(mpg),
        minutesTrend: round1(minutesTrend),
        per36Primary: round1(per36),
        usageRate: player.stats.usageRate,
        onOffDiff: round1(onOffDiff),
        efficiency: round1(efficiency),
        flags,
        utilizationVerdict: Math.round(Math.max(0, Math.min(100, verdict))),
      } satisfies UtilizationMetric;
    })
    .sort((a, b) => b.utilizationVerdict - a.utilizationVerdict);
}

/**
 * Rule-based insights. This is the fallback when no API key is configured, and
 * it is also the floor the model's output is checked against: every number it
 * cites has to come from here.
 */
/** English article for a number: "an 8-minute role", "a 24-minute role". */
const article = (n: number): string => (n === 8 || n === 11 || n === 18 ? 'an' : 'a');

/** Minimum minutes before a per-36 extrapolation is worth acting on. */
const MIN_SAMPLE_MINUTES = 10;

/**
 * Rule-based insights. This is the fallback when no API key is configured, and
 * it is also the floor the model's output is checked against: every number it
 * cites has to come from here.
 *
 * The recommendation and its evidence must agree. A player producing above the
 * team median is never told to play less no matter what the composite verdict
 * says — citing good production under "trim his minutes" destroys trust in
 * every other line on the page.
 */
export function heuristicInsights(metrics: UtilizationMetric[], unit: string) {
  const insights = [];
  const per36Median = median(metrics.filter((m) => m.minutesPerGame > 5).map((m) => m.per36Primary));

  const underused = metrics
    .filter(
      (m) =>
        m.utilizationVerdict >= 62 &&
        m.minutesPerGame < 26 &&
        // Per-36 off a six-minute cameo is noise, not a finding.
        m.minutesPerGame >= MIN_SAMPLE_MINUTES,
    )
    .slice(0, 3);

  for (const m of underused) {
    const bump = m.minutesPerGame < 15 ? '6-8' : '4-6';
    const thin = m.minutesPerGame < 14;
    insights.push({
      playerId: m.playerId,
      headline: `${m.playerName} has earned a bigger role`,
      recommendation: `Give ${m.playerName} ${bump} more minutes a game.`,
      evidence: [
        `${m.per36Primary} ${unit} per 36 in ${article(Math.round(m.minutesPerGame))} ${Math.round(m.minutesPerGame)}-minute role`,
        `Team is ${m.onOffDiff >= 0 ? '+' : ''}${m.onOffDiff} with them on the floor`,
        ...(m.minutesTrend !== 0
          ? [`Minutes ${m.minutesTrend > 0 ? 'up' : 'down'} ${Math.abs(m.minutesTrend)} across the window`]
          : []),
        ...(thin ? [`Small sample: only ${m.minutesPerGame} minutes a game to extrapolate from`] : []),
      ],
      confidence: (thin ? 'low' : m.onOffDiff >= 3 ? 'high' : 'medium') as 'high' | 'medium' | 'low',
    });
  }

  const overused = metrics
    .filter(
      (m) =>
        m.minutesPerGame > 26 &&
        // The recommendation has to match the evidence: only a player who is
        // *actually* underproducing for his minutes gets trimmed.
        m.per36Primary < per36Median &&
        m.onOffDiff <= 0,
    )
    .slice(0, 2);

  for (const m of overused) {
    insights.push({
      playerId: m.playerId,
      headline: `${m.playerName} is carrying more minutes than the production supports`,
      recommendation: `Trim ${m.playerName} by 4-6 minutes and redistribute to the second unit.`,
      evidence: [
        `${m.per36Primary} ${unit} per 36 on ${m.minutesPerGame} minutes a game, against a team median of ${round1(per36Median)}`,
        `Team is ${m.onOffDiff >= 0 ? '+' : ''}${m.onOffDiff} with them on the floor`,
        ...m.flags.filter((f) => f !== 'veteran').slice(0, 2),
      ],
      confidence: (m.onOffDiff <= -3 ? 'high' : 'low') as 'high' | 'medium' | 'low',
    });
  }

  if (insights.length === 0) {
    insights.push({
      headline: 'Rotation looks correctly weighted',
      recommendation: 'No minute reallocation is indicated by the current window.',
      evidence: [
        `${metrics.length} players analysed`,
        'Nobody is both above the production median and short of minutes, or below it and heavily used',
      ],
      confidence: 'medium' as const,
    });
  }

  return insights;
}
