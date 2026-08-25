# Courtside

A personal, phone-first sports command center across NBA, NFL, Premier League and
tennis. It answers three questions: **what should I watch tonight and why**,
**what is happening right now**, and **how are my teams and players actually doing**.

The whole app runs with **zero API keys** against a fixture provider that
includes a genuinely advancing live game — so the scoring engines, the diff
engine and the alert pipeline are all demonstrable before you spend a cent.

**Requires Node 22.5 or newer** — persistence uses the built-in `node:sqlite`,
which does not exist on older runtimes. Check with `node -v`.

```bash
npm install
npm run dev          # open http://localhost:5173
```

That is the whole setup. No database to provision, no API key, no signup. The
live view will already have a game in progress.

## What it actually does

**Ranks tonight's games and explains the ranking.** A deterministic 0–100
`watchScore` — not a model call — combines seven weighted components:

| Component | Weight | What it measures |
|---|---|---|
| `stakes` | 0.22 | Seeding and title implications, rivalry, season phase |
| `quality` | 0.18 | **The weaker team's** rating, so a blowout never ranks high |
| `competitiveness` | 0.18 | How close the implied win probability is to a coin flip |
| `starPower` | 0.15 | Star ratings of players *projected available* — injuries discount it |
| `personalFit` | 0.15 | Your teams, your tracked players, rivals of your teams |
| `storyline` | 0.07 | Streaks, first meetings, milestone chases |
| `convenience` | 0.05 | Starts in your watchable hours, on a service you have |

Every score ships with `reasons: string[]`. The UI never renders the number
without them.

**Reads a schedule as a shape, not a list.** Difficulty per game folds in
opponent rating, home/away, rest days, back-to-backs, 3-in-4 density, travel
distance (haversine from the previous venue), timezone changes and altitude.
Runs of four or more games are then classified as **gauntlets**, **soft
stretches** or **trap games** — using the quartiles of rolling window averages,
so a run of three brutal games and one winnable one is still correctly a
gauntlet.

**Turns polling into events.** The worker diffs each poll against the last
known state and derives `SCORE_CHANGE`, `LEAD_CHANGE`, `PERIOD_END`, `FINAL`,
`CLOSE_GAME`, `UPSET_BREWING` and the one that justifies the whole app:

> ‼️ **Turn on Warriors–Thunder** — 2-point game with 4:51 left.

Polling is tiered so quota goes where it matters — 15s for your teams, 30s for
any game scoring ≥75, 60s for everything else live, a 5-minute heartbeat when
nothing is on, and a full stop overnight.

**Grounds the AI in arithmetic it did not do.** Minutes trend (least-squares
slope), per-36 production, usage, on/off differential and rookie/veteran flags
are all computed in code from box scores. Only then are those finished numbers
handed to the model, with a system prompt that forbids inventing a statistic —
and any player the model names who is not in the computed metrics is dropped
before display. Without `ANTHROPIC_API_KEY` the app falls back to a rule-based
analysis over the identical numbers and says so on screen.

## Honesty rules the code actually enforces

- **No fabricated data.** Failures render an explicit unavailable state with the
  last-successful-fetch timestamp; they never render as zeroes or blanks.
- **Freshness everywhere.** Every screen shows how old its data is and which
  provider served it.
- **The mock provider is labelled on every screen.** Club names, cities and
  venue coordinates are real, because travel and altitude are meaningless
  otherwise. Every *person* and every *statistic* in mock mode is invented —
  attaching made-up numbers to a real athlete's name is the exact failure this
  app refuses to ship.
- **Recommendations must agree with their evidence.** A player producing above
  the team median is never told to play less, whatever the composite verdict
  says, and per-36 extrapolations from cameo minutes are suppressed rather than
  dressed up. Both are enforced by tests.

## Architecture

```
shared/          types + per-league shape (periods, clutch thresholds, draws)
server/
  providers/     SportsProvider interface · MockProvider · ApiSportsProvider
                 CachedProvider wraps any of them with TTL cache, token-bucket
                 rate limiting, jittered backoff and per-endpoint call logging
  scoring/       watchability.ts, difficulty.ts — pure, deterministic, tested
  live/          events.ts (diff engine) · poller.ts (tiers) · sse.ts · notify.ts
  insights/      utilization.ts (arithmetic) · ai.ts (explanation + verification)
  db.ts          node:sqlite — cache, events, alert log, insights, preferences
client/          React + Vite PWA, installable, dark, mobile-first
```

Persistence is Node's built-in `node:sqlite` — real SQL, no native module to
compile. The schema is Postgres-shaped; swapping in a `pg` pool leaves the
queries intact.

**Alert delivery is idempotent at the database level.** `alert_log`'s primary
key is the event's dedupe key `(gameId, type, gameClock)`, so a re-poll, a
restart or a duplicate upstream frame can never double-buzz your phone.

## Switching to real data

```bash
SPORTS_PROVIDER=api-sports
SPORTS_API_KEY=...        # one API-SPORTS account covers all four leagues
API_DAILY_LIMIT=1000
```

> The API-SPORTS adapter is written against the documented response shapes but
> **has not been exercised against a live key here.** Its mappers are
> deliberately strict — an unexpected shape throws rather than silently
> producing a half-populated roster, because a plausible-looking wrong roster is
> worse than a visible error. Verify each endpoint against your account and
> watch `/api/health/providers` for the first failure.

Alerts default to console logging. Set `TELEGRAM_BOT_TOKEN` and
`TELEGRAM_CHAT_ID` to reach a phone — no VAPID keys, no service worker, no PWA
install required. `WebPushChannel` is stubbed behind the same interface.

## Deployment note

The polling worker must run somewhere **always-on**. On a scale-to-zero host it
sleeps when nobody is browsing, which means no alert ever fires unless you
already have the app open — which defeats the entire point. Use an always-on
instance, or a one-minute scheduler, and accept up to 60s of alert latency.

## Commands

```bash
npm run dev         # API on :3001, client on :5173
npm run build       # client bundle + server typecheck
npm start           # production: server serves the built client
npm test            # 66 tests across the scoring, diff and utilization engines
npm run typecheck   # both tsconfigs
```

## Environment

| Variable | Default | Purpose |
|---|---|---|
| `SPORTS_PROVIDER` | `mock` | `mock` or `api-sports` |
| `SPORTS_API_KEY` | — | Required for `api-sports` |
| `API_DAILY_LIMIT` | `1000` | Sizes the token bucket |
| `ANTHROPIC_API_KEY` | — | Without it, insights fall back to rules |
| `AI_MODEL` | `claude-opus-5` | Model for the explanation layer |
| `AI_MONTHLY_TOKEN_BUDGET` | `2000000` | Degrades to cached-only when exceeded |
| `ENABLE_POLLER` | `false` | Off by default so dev servers do not burn quota |
| `TELEGRAM_BOT_TOKEN` / `TELEGRAM_CHAT_ID` | — | Alert transport |
| `USER_TIMEZONE` | `America/New_York` | All displayed times |
| `MOCK_SIM_SPEED` | `2` | Simulated game-clock seconds per real second |
| `PORT` / `DB_PATH` | `3001` / `./courtside.db` | |
