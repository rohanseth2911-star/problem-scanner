import Anthropic from '@anthropic-ai/sdk';
import type { Insight, TeamInsights, UtilizationMetric } from '../../shared/types.ts';
import {
  clearInsights,
  readInsights,
  recordAiUsage,
  tokensUsedThisMonth,
  writeInsights,
} from '../db.ts';
import { getProvider } from '../providers/index.ts';
import { rosterFor, teamsById } from '../world.ts';
import { computeUtilization, heuristicInsights } from './utilization.ts';

const MODEL = process.env.AI_MODEL ?? 'claude-opus-5';
const TOKEN_BUDGET = Number(process.env.AI_MONTHLY_TOKEN_BUDGET ?? 2_000_000);
const WINDOW = 10;

const PRIMARY_UNIT: Record<string, string> = {
  nba: 'points',
  nfl: 'yards',
  epl: 'goal contributions',
  tennis: 'points',
};

const SYSTEM_PROMPT = `You are analysing pre-computed basketball, football and soccer statistics for one team.

Rules, without exception:
- Cite only numbers present in the input. Never invent, estimate, or round a statistic into something the input does not say.
- Never reference a player who is not in the input.
- If the data is insufficient for a conclusion, say so plainly instead of reaching.
- Every recommendation must be actionable and specific: name the player, name the change (minutes up or down, and by how much), and cite the numbers behind it.
- Prefer three to five recommendations. Fewer is fine when the data does not support more.

Respond with JSON only, no prose around it, in exactly this shape:
{"insights":[{"playerId":"...","headline":"...","recommendation":"...","evidence":["...","..."],"confidence":"high|medium|low"}]}`;

function buildPrompt(teamName: string, unit: string, metrics: UtilizationMetric[]): string {
  const rows = metrics
    .slice(0, 12)
    .map(
      (m) =>
        `- ${m.playerName} (id=${m.playerId}): ${m.minutesPerGame} min/g, ` +
        `minutes trend ${m.minutesTrend >= 0 ? '+' : ''}${m.minutesTrend} across the window, ` +
        `${m.per36Primary} ${unit} per 36, usage ${m.usageRate}%, ` +
        `on/off ${m.onOffDiff >= 0 ? '+' : ''}${m.onOffDiff}, efficiency ${m.efficiency}, ` +
        `computed utilization verdict ${m.utilizationVerdict}/100` +
        (m.flags.length ? `, flags: ${m.flags.join('; ')}` : ''),
    )
    .join('\n');

  return `Team: ${teamName}
Window: last ${WINDOW} games.
"Utilization verdict" is a deterministic 0-100 score already computed from these numbers: above 60 means the data supports more playing time, below 40 means less.

Players:
${rows}

Write the recommendations.`;
}

function parseInsights(text: string): Insight[] | null {
  // The model is asked for bare JSON, but a stray fence should not lose the run.
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start === -1 || end <= start) return null;

  try {
    const parsed = JSON.parse(text.slice(start, end + 1)) as { insights?: unknown };
    if (!Array.isArray(parsed.insights)) return null;

    return parsed.insights
      .filter((raw): raw is Record<string, unknown> => typeof raw === 'object' && raw !== null)
      .map((raw) => ({
        playerId: typeof raw['playerId'] === 'string' ? raw['playerId'] : undefined,
        headline: String(raw['headline'] ?? ''),
        recommendation: String(raw['recommendation'] ?? ''),
        evidence: Array.isArray(raw['evidence']) ? raw['evidence'].map(String) : [],
        confidence: (raw['confidence'] === 'high' || raw['confidence'] === 'low'
          ? raw['confidence']
          : 'medium') as Insight['confidence'],
      }))
      .filter((i) => i.headline && i.recommendation);
  } catch {
    return null;
  }
}

export async function insightsForTeam(teamId: string, force = false): Promise<TeamInsights> {
  const teams = await teamsById();
  const team = teams.get(teamId);
  if (!team) throw new Error(`Unknown team ${teamId}`);

  const [roster, boxScores] = await Promise.all([
    rosterFor(teamId),
    getProvider().getBoxScores(teamId, WINDOW),
  ]);

  const metrics = computeUtilization(roster, boxScores);
  const unit = PRIMARY_UNIT[team.leagueId] ?? 'points';
  const gamesPlayed = boxScores.length;
  const cacheKey = `${teamId}:${gamesPlayed}`;

  if (force) clearInsights(teamId);
  else {
    // Regenerate only when new games exist — not on every page view.
    const cached = readInsights<TeamInsights>(cacheKey);
    if (cached) return cached;
  }

  const base: TeamInsights = {
    teamId,
    gamesPlayed,
    generatedAt: new Date().toISOString(),
    source: 'heuristic',
    insights: heuristicInsights(metrics, unit),
    metrics,
  };

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey || metrics.length === 0) {
    writeInsights(cacheKey, teamId, base);
    return base;
  }

  if (tokensUsedThisMonth() >= TOKEN_BUDGET) {
    console.warn('[ai] monthly token budget exhausted — serving heuristic insights');
    writeInsights(cacheKey, teamId, base);
    return base;
  }

  try {
    const client = new Anthropic({ apiKey });
    const response = await client.messages.create({
      model: MODEL,
      max_tokens: 16000,
      thinking: { type: 'adaptive' },
      output_config: { effort: 'medium' },
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: buildPrompt(team.name, unit, metrics) }],
    });

    recordAiUsage(response.usage.input_tokens, response.usage.output_tokens);

    const text = response.content
      .filter((block): block is Anthropic.TextBlock => block.type === 'text')
      .map((block) => block.text)
      .join('\n');

    const insights = parseInsights(text);
    if (!insights || insights.length === 0) {
      console.warn('[ai] unparseable response — falling back to heuristic insights');
      writeInsights(cacheKey, teamId, base);
      return base;
    }

    // Guard against a hallucinated player: anything not in the computed metrics
    // is dropped rather than shown.
    const knownIds = new Set(metrics.map((m) => m.playerId));
    const verified = insights.filter((i) => !i.playerId || knownIds.has(i.playerId));

    const result: TeamInsights = {
      ...base,
      source: 'ai',
      model: MODEL,
      generatedAt: new Date().toISOString(),
      insights: verified.length > 0 ? verified : base.insights,
    };
    writeInsights(cacheKey, teamId, result);
    return result;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`[ai] insight generation failed: ${message}`);
    writeInsights(cacheKey, teamId, base);
    return base;
  }
}

export function aiBudgetStatus() {
  const used = tokensUsedThisMonth();
  return {
    configured: Boolean(process.env.ANTHROPIC_API_KEY),
    model: MODEL,
    tokensUsed: used,
    tokenBudget: TOKEN_BUDGET,
    exhausted: used >= TOKEN_BUDGET,
  };
}
