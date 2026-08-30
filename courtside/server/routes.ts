import { Router } from 'express';
import type { Game } from '../shared/types.ts';
import { eventsForGame, recentEvents } from './db.ts';
import { aiBudgetStatus, insightsForTeam } from './insights/ai.ts';
import { getPoller } from './live/poller.ts';
import { buildNotifier } from './live/notify.ts';
import { hub } from './live/sse.ts';
import { getPreferences, savePreferences } from './preferences.ts';
import { getProvider, providerHealth } from './providers/index.ts';
import { buildSchedule } from './scoring/difficulty.ts';
import { allTeams, gamesBetween, invalidateRosters, localDayRange, rankGames, rosterFor, teamsById } from './world.ts';

const router = Router();
const DAY_MS = 86_400_000;

const asError = (error: unknown) => (error instanceof Error ? error.message : String(error));

/**
 * Every read endpoint reports freshness alongside the data. The client renders
 * "as of HH:MM" rather than implying the numbers are live when they are not.
 */
function freshness() {
  const health = providerHealth();
  return {
    lastSuccessAt: health.lastSuccessAt,
    stale: health.lastError !== null,
    provider: health.provider,
  };
}

router.get('/tonight', async (req, res) => {
  try {
    const prefs = getPreferences();
    const offset = Number(req.query['offset'] ?? 0);
    const { from, to } = localDayRange(prefs, offset);

    const games = await gamesBetween(from, to);
    const ranked = await rankGames(games);

    res.json({
      date: from.toISOString(),
      timezone: prefs.timezone,
      live: ranked.filter((r) => r.game.state === 'live'),
      upcoming: ranked.filter((r) => r.game.state === 'scheduled'),
      finished: ranked.filter((r) => r.game.state === 'final'),
      freshness: freshness(),
    });
  } catch (error) {
    res.status(503).json({ error: asError(error), freshness: freshness() });
  }
});

router.get('/live', async (_req, res) => {
  try {
    const live = await getProvider().getLiveGames();
    const ranked = await rankGames(live);
    res.json({
      games: ranked.map((r) => ({ ...r, events: eventsForGame(r.game.id, 6) })),
      recent: recentEvents(20),
      freshness: freshness(),
    });
  } catch (error) {
    res.status(503).json({ error: asError(error), freshness: freshness() });
  }
});

router.get('/games/:id', async (req, res) => {
  try {
    const id = req.params.id;
    const now = new Date();
    const games = await gamesBetween(new Date(now.getTime() - 3 * DAY_MS), new Date(now.getTime() + 3 * DAY_MS));
    const game = games.find((g) => g.id === id);
    if (!game) return res.status(404).json({ error: 'Game not found' });

    const [ranked] = await rankGames([game]);
    res.json({ ...ranked, events: eventsForGame(id, 20), freshness: freshness() });
  } catch (error) {
    res.status(503).json({ error: asError(error), freshness: freshness() });
  }
});

router.get('/teams', async (_req, res) => {
  try {
    res.json({ teams: await allTeams(), freshness: freshness() });
  } catch (error) {
    res.status(503).json({ error: asError(error), freshness: freshness() });
  }
});

router.get('/teams/:id', async (req, res) => {
  try {
    const teamId = req.params.id;
    const teams = await teamsById();
    const team = teams.get(teamId);
    if (!team) return res.status(404).json({ error: 'Team not found' });

    const now = new Date();
    const provider = getProvider();

    const [upcoming, history, roster, standings] = await Promise.all([
      provider.getSchedule(teamId, now, new Date(now.getTime() + 45 * DAY_MS)),
      provider.getSchedule(teamId, new Date(now.getTime() - 21 * DAY_MS), now),
      rosterFor(teamId),
      provider.getStandings(team.leagueId).catch(() => []),
    ]);

    const next15 = upcoming
      .filter((g: Game) => g.state !== 'final')
      .slice(0, 15);

    const schedule = buildSchedule(team, next15, teams, history.slice(-6));
    const ranked = await rankGames(next15.slice(0, 8));

    res.json({
      team,
      schedule,
      ranked,
      roster,
      injuries: roster.filter((p) => p.injury),
      standings: standings.slice(0, 20),
      freshness: freshness(),
    });
  } catch (error) {
    res.status(503).json({ error: asError(error), freshness: freshness() });
  }
});

router.get('/teams/:id/insights', async (req, res) => {
  try {
    const force = req.query['force'] === 'true';
    res.json({
      ...(await insightsForTeam(req.params.id, force)),
      budget: aiBudgetStatus(),
    });
  } catch (error) {
    res.status(503).json({ error: asError(error) });
  }
});

router.get('/schedule', async (req, res) => {
  try {
    const prefs = getPreferences();
    const now = new Date();
    const teamIds = req.query['team'] ? [String(req.query['team'])] : prefs.trackedTeamIds;
    const provider = getProvider();

    const perTeam = await Promise.all(
      teamIds.map((id) =>
        provider.getSchedule(id, now, new Date(now.getTime() + 30 * DAY_MS)).catch(() => []),
      ),
    );

    const unique = new Map<string, Game>();
    for (const game of perTeam.flat()) unique.set(game.id, game);

    res.json({ games: await rankGames([...unique.values()]), freshness: freshness() });
  } catch (error) {
    res.status(503).json({ error: asError(error), freshness: freshness() });
  }
});

router.get('/preferences', (_req, res) => {
  res.json(getPreferences());
});

router.put('/preferences', (req, res) => {
  const next = savePreferences(req.body ?? {});
  invalidateRosters();
  res.json(next);
});

router.get('/health/providers', (_req, res) => {
  res.json({
    ...providerHealth(),
    poller: getPoller().status,
    ai: aiBudgetStatus(),
  });
});

router.post('/notify/test', async (_req, res) => {
  const notifier = buildNotifier();
  const now = new Date().toISOString();
  const delivered = await notifier.deliver({
    id: `test-${Date.now()}`,
    gameId: 'test',
    type: 'DROP_EVERYTHING',
    headline: 'Courtside test alert',
    detail: 'If you can read this, alerts are wired up correctly.',
    dedupeKey: `test-${Date.now()}`,
    homeScore: 0,
    awayScore: 0,
    period: 1,
    clock: '--',
    createdAt: now,
  });
  res.json({ delivered, channel: notifier.channelName });
});

router.get('/stream', (req, res) => {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache, no-transform',
    Connection: 'keep-alive',
    'X-Accel-Buffering': 'no',
  });
  res.write('retry: 3000\n\n');
  hub.add(res);

  // Comment frames keep intermediaries from closing an idle connection.
  const keepAlive = setInterval(() => res.write(': keep-alive\n\n'), 20_000);
  req.on('close', () => clearInterval(keepAlive));
});

export default router;
