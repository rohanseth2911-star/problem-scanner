# Courtside — paste-ready Replit prompt

Everything below the line is fillable-free. Only edit the **My teams** line if my guesses are wrong.

---

## PROJECT

Build **"Courtside"** — a personal, phone-first sports command center that tracks my specific teams and players across NBA, NFL, Premier League, and ATP/WTA tennis. Its job is to answer three questions fast: **what should I watch tonight and why**, **what's happening right now in games I care about**, and **how are my teams and players actually doing**.

This is a real application backed by real data feeds — not a mockup. Never fabricate scores, rosters, standings, or stats. If a feed is unavailable, the UI must show an explicit "data unavailable" state with the last-successful-fetch timestamp. Fake data anywhere is a build failure.

## MY SETUP

- **Single user, no auth.** It's just me. Seed my preferences from a config file; no signup, no login, no user table beyond one row.
- **My teams:** NBA — Golden State Warriors, Oklahoma City Thunder. NFL — Philadelphia Eagles. Premier League — Manchester City. Tennis — Carlos Alcaraz, Jannik Sinner, Coco Gauff (track players and their tournament draws, not teams).
- **Timezone:** America/New_York. Display every time in ET with the zone shown.
- **Watchable hours:** weekdays after 6pm, weekends anytime. Score early-morning EPL kickoffs lower for convenience but never hide them.
- **I have:** NBA League Pass, ESPN+, Peacock, Netflix. Flag anything not on those as "check your listings" rather than hiding it.
- **v1 is done when:** on a Tuesday morning I open it on my phone and within 10 seconds I know which one game tonight I should watch and why — and if I miss the start, my phone tells me when it gets close in the 4th.

## STACK

- **Frontend:** React + TypeScript + Vite, Tailwind, `wouter` for routing, TanStack Query for server state. Installable PWA (manifest + service worker + maskable icons), mobile-first, dark by default.
- **Backend:** Node + Express + TypeScript in the same repl. Server-Sent Events (`/api/stream`) for live push to open clients — SSE, not WebSockets: it survives Replit's proxy better and auto-reconnects.
- **Database:** Replit PostgreSQL with Drizzle ORM + `drizzle-kit push`. No raw SQL strings in route handlers.
- **Worker:** a polling loop in the same process, started only when `ENABLE_POLLER=true`, so dev repls don't burn API quota.
- **Secrets:** every key in Replit Secrets, read via `process.env`. Never commit a key, never send a key to the browser, never hardcode a fallback key.

## DATA LAYER — build this first, behind an interface

Create `server/providers/` with a single `SportsProvider` interface:

```ts
interface SportsProvider {
  getSchedule(teamId: string, from: Date, to: Date): Promise<Game[]>;
  getLiveGames(): Promise<LiveGame[]>;
  getBoxScore(gameId: string): Promise<BoxScore>;
  getRoster(teamId: string): Promise<Player[]>;
  getInjuries(teamId: string): Promise<InjuryReport[]>;
  getStandings(leagueId: string): Promise<StandingsRow[]>;
}
```

Implementations:
- `MockProvider` — realistic fixture JSON, including a **simulated live game whose score advances every few seconds**. Every screen must be fully buildable and demoable against this with zero API keys.
- `ApiSportsProvider` — the real one, hitting **API-SPORTS** (api-basketball, api-american-football, api-football, api-tennis — one account covers all four of my leagues). Selected by the `SPORTS_PROVIDER` env var.

Rules for the real provider:
- Every response cached in Postgres with a TTL: rosters 24h, schedules 6h, standings 1h, live scores 20s.
- A token-bucket rate limiter in front of every outbound call, configured from `API_DAILY_LIMIT`.
- Exponential backoff with jitter on 429/5xx; never retry a 4xx other than 429.
- A `/api/health/providers` endpoint showing per-endpoint call counts today, cache hit rate, and last error. I need to see my quota burn.

## FEATURE 1 — Watchability engine ("what should I watch tonight")

The heart of the app. Implement as a pure, unit-tested function in `server/scoring/watchability.ts`. **Do not ask an LLM to produce this score** — compute it deterministically, then have the LLM write only the one-line explanation of the numbers.

`watchScore` = 0–100, weighted sum of normalized 0–1 components:

| Component | Weight | Definition |
|---|---|---|
| `stakes` | 0.22 | Playoff/relegation/seeding implications; elimination games; title races; late-season > early-season; rivalry flag |
| `quality` | 0.18 | **min(** teamA rating, teamB rating **)** — not the average, so a great team stomping a bad one doesn't score high |
| `competitiveness` | 0.18 | `1 - 2*abs(0.5 - impliedWinProb)` from ratings or market odds. A coin-flip game maxes this |
| `starPower` | 0.15 | Sum of star ratings for players **projected available** — auto-discounted when a star is OUT/QUESTIONABLE |
| `personalFit` | 0.15 | My teams and tracked players; head-to-head vs a rival; a tracked player's revenge or milestone game |
| `storyline` | 0.07 | Win/loss streaks, first meeting since a notable event, milestone chase, coach return, debut |
| `convenience` | 0.05 | Start time inside my watchable hours in ET; on a service I have. Penalize, don't zero out |

Every score carries a **`reasons: string[]`** — the top 2–3 contributing components rendered as plain English ("Both top-5 in the West", "Haaland back from injury", "Winner takes the top seed"). **Never show a bare number.** The reason is the product.

Buckets: **90+ Appointment · 75–89 Must-watch · 55–74 Worth it · 35–54 Check the score · <35 Skip.**

**Tonight view (home screen):** every game today across my leagues, ranked by `watchScore`, with the top pick pulled out as a hero card — matchup, tipoff in ET, where to watch, the 2–3 reasons, and a "remind me 15 min before" button. Below it, the ranked list. Above it, anything live right now.

## FEATURE 2 — Schedule difficulty analysis

For each tracked team, show the next 15 games as a **horizontal difficulty strip** (one colored cell per game, easy→hard).

`difficultyScore` per game, again deterministic:
- Opponent strength (net rating / xG / Elo, league-appropriate)
- Home vs away
- Rest: days since last game; flag **back-to-backs** and **3-in-4** / **4-in-6** stretches
- Travel: distance from the previous game's city, plus a timezone-change penalty; altitude flag for Denver and Utah
- Opponent's rest advantage relative to mine
- Key injuries on both sides at time of viewing

Then surface derived insight above the strip:
- **Gauntlet stretches** — any run of 4+ games averaging top-quartile difficulty, labeled with dates ("Nov 12–21: five games, four on the road, three vs top-6 teams")
- **Soft stretches** — the mirror image, framed as "this is where they need to bank wins"
- **Trap games** — an easy opponent sandwiched between two hard ones, or the game right after a marquee matchup
- **Projected record** over the strip, from per-game win probabilities

Tennis gets its own model — draw-based, not schedule-based: show each tracked player's bracket path, seeded opponents by round, and the round where they'd meet each higher seed.

## FEATURE 3 — Roster & availability

Per team: full roster grouped as **Starters / Rotation / Bench / Injured / Out**, sortable, with headshot, position, age, years pro, and a compact stat line appropriate to the sport.

Injury panel: player, status (`OUT / DOUBTFUL / QUESTIONABLE / PROBABLE / GTD`), description, expected return, source timestamp. **Always show how stale the injury data is** — an hour-old report is a different thing from a five-day-old one.

Depth chart view for the Eagles (offense/defense) and Man City (probable XI + formation).

## FEATURE 4 — Utilization & coaching insights

Compute the numbers in code first, from real box scores over a configurable window (default: last 10 games and season-to-date):

- Minutes per game and its trend line (slope over the window)
- Usage rate, per-36 (or per-90) production
- On/off net rating differential where the data supports it
- Efficiency vs. role: is production per minute rising while minutes stay flat?
- Rookie/young-player flag: age ≤ 23 or ≤ 2 years experience
- Veteran-decline flag: production per minute falling while minutes stay high

Then, and only then, send those computed numbers to **`claude-sonnet-4-5`** via the Anthropic API with a strict system prompt: *"You are analyzing pre-computed statistics. Cite only numbers present in the input. Never invent a statistic. If the data is insufficient for a conclusion, say so."*

Output per team: 3–5 **actionable** recommendations, each naming the player, the recommended change, the numbers behind it, and a confidence level. "Give Player X 6–8 more minutes: 22.4 per-36 points on 61% TS in a 19-minute role, and the team is +7.1 with him on the floor over 10 games." Not "Player X is playing well."

Cache each insight against `(teamId, gamesPlayed)` so it regenerates only when new games exist. Show the generation timestamp. Add a manual "regenerate" button. Track token spend against `AI_MONTHLY_TOKEN_BUDGET` and degrade to cached-only when exceeded.

## FEATURE 5 — Live scores and alerts

**Polling worker**, tiered so quota goes where it matters:
- Games involving my teams, live: every **15s**
- Any game with `watchScore ≥ 75`, live: every **30s**
- Other live games in my leagues: every **60s**
- Nothing live: **5 min** heartbeat to catch start times
- Between 2am–8am ET with nothing live: pause entirely

Each poll **diffs against last known state** and emits typed events: `SCORE_CHANGE`, `LEAD_CHANGE`, `PERIOD_START/END`, `FINAL`, `CLOSE_GAME`, `INJURY`, `RED_CARD`, `EJECTION`, `MILESTONE`, `UPSET_BREWING`, `TENNIS_SET_POINT`, `TENNIS_MATCH_POINT`, `PENALTY_SHOOTOUT`, `RED_ZONE`, `FOURTH_DOWN_GOING_FOR_IT`.

Events fan out to (a) SSE for any open browser tab and (b) the notification channel.

**Alert tiers — configurable per team:**
- **All** — literally every score change. Available, **off by default**, and the settings UI must warn me it's roughly 180 notifications per NBA game.
- **Key moments** *(default)* — lead changes, period ends, injuries, cards/ejections, milestones, finals
- **Clutch only** — under 5 minutes left with a margin ≤ 5 points; last 10 minutes of a one-goal match; any tennis set or match point
- **Final only**
- Plus a **"drop what you're doing"** alert that fires regardless of tier: any game hits `watchScore ≥ 85` **and** enters clutch time → *"Warriors–Thunder is tied with 3:40 left. Turn it on."*

**Notification transport: a Telegram bot** (`TELEGRAM_BOT_TOKEN` + `TELEGRAM_CHAT_ID`) — it's ~20 lines, works on every device, and needs no VAPID setup or PWA install. Implement it behind a `NotificationChannel` interface with a `ConsoleChannel` for local dev and a `WebPushChannel` stub for later. Every alert is idempotent — dedupe on `(gameId, eventType, gameClock)` so a re-poll never double-fires.

**Live game view:** big score, game clock, period, last 5 events as a feed, win-probability bar if derivable, and a per-game alert toggle.

## DATA MODEL

`leagues · teams · players · games · game_events · box_scores · injuries · standings · user_preferences · tracked_entities · notification_subscriptions · alert_log · api_call_log · ai_insights`

Index for the two hot paths: "all games in a date range for my tracked teams" and "all currently-live games." Store all timestamps as UTC `timestamptz`; convert to ET at the edge only.

## SCREENS

1. **Tonight** *(home)* — live-now strip, hero pick, ranked list of today's games
2. **Live** — every in-progress game I care about, auto-updating via SSE
3. **Team** — difficulty strip, next 5 games, roster, injuries, insights, standings context
4. **Player** — tracked player's stats, minutes trend, next matchups, utilization verdict
5. **Schedule** — calendar/list across all my teams, filterable by league and watchScore
6. **Settings** — tracked teams/players, alert tiers per team, notification test button, API usage dashboard

## BUILD ORDER — ship each milestone working before starting the next

1. Schema + `MockProvider` + Tonight screen ranking mock games — **the watchability engine visibly working, no API keys needed**
2. `ApiSportsProvider` behind the interface, with caching, rate limiting, and the health endpoint
3. Live polling + SSE + the live view
4. Telegram notifications + alert tiers + dedupe
5. Schedule difficulty + gauntlet detection
6. Rosters + injuries
7. AI utilization insights
8. PWA polish: installable, offline shell, home-screen icon

## NON-NEGOTIABLES

- No fabricated data, ever. Empty and error states everywhere, always with a timestamp.
- The watchability and difficulty scores are pure functions with unit tests covering their edge cases (missing ratings, injured stars, unknown start time).
- Loading skeletons, not spinners. Nothing on screen jumps as data arrives.
- Every timestamp displayed in ET with the zone abbreviation shown.
- No API key ever reaches the client bundle.
- `README.md` documents every env var, how to get each key, and how to run with `SPORTS_PROVIDER=mock`.

## ENV VARS

```
SPORTS_PROVIDER=mock
SPORTS_API_KEY=
API_DAILY_LIMIT=1000
ANTHROPIC_API_KEY=
AI_MODEL=claude-sonnet-4-5
AI_MONTHLY_TOKEN_BUDGET=2000000
ENABLE_POLLER=false
TELEGRAM_BOT_TOKEN=
TELEGRAM_CHAT_ID=
USER_TIMEZONE=America/New_York
DATABASE_URL=
```

## DEPLOYMENT

Deploy the web app on Replit. **The polling worker must run on an always-on Reserved VM, not Autoscale** — Autoscale sleeps when idle, so no alerts fire unless I already have the app open, which defeats the entire point. If cost rules that out, fall back to Replit Scheduled Deployments running the poller every minute, and state clearly in the README that alert latency is then up to 60 seconds.

**Start with milestone 1 and show me the Tonight screen ranking mock games before writing a single line of provider integration code.**
