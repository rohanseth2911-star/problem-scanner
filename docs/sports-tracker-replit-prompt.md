# Personal Sports Command Center — Replit build kit

Two parts:

1. **Answer these 12 questions first** — each one changes the architecture, not just the copy. Answering them before you paste turns a vague build into a deterministic one.
2. **The prompt** — paste it into Replit Agent as-is once you've filled in the `<<< >>>` blanks.

---

# PART 1 — What to decide before you paste

## The one that matters most: where does the data come from?

Replit Agent will happily "build" a sports app that invents scores. Live scores, rosters, and injuries have to come from a paid or keyed feed. Pick one before you start or you'll get a beautiful shell with fake data inside.

| Option | Covers | Live scores | Rosters | Injuries | Notes |
|---|---|---|---|---|---|
| **API-SPORTS** (api-basketball / api-american-football / api-football / api-tennis) | NBA, NFL, EPL, ATP/WTA — all four under one account | Yes, ~15s refresh on paid tiers | Yes | Partial | Best single-vendor fit for your exact league mix. Free tier ~100 req/day = dev only. |
| **SportsDataIO** | NBA, NFL, EPL, more | Yes | Yes | **Yes, strong injury feeds** | Priciest; the only one with genuinely good depth-chart + injury data. |
| **balldontlie** | NBA only | Limited/paid tier | Yes | Paid tier | Cheap, great for NBA box scores and per-game stats. |
| **TheSportsDB** | Broad, community-sourced | Weak | Patchy | No | Fine for logos/metadata, not for anything live. |
| **ESPN's undocumented JSON endpoints** | Everything | Yes | Yes | Yes | Free and excellent — and unsupported, unstable, and against ToS for redistribution. Fine for a private personal app; do not build a product on it. |

**Decide:** one paid vendor (simplest), or a hybrid (ESPN for live + balldontlie for NBA stats). Also decide your **monthly API budget** — it sets the polling cadence, which sets everything else.

## The other 11

**1. Personal or multi-user?**
Just you = skip auth entirely, hardcode your preferences in a seed file, ship in a third of the time. Anyone-can-sign-up = Replit Auth + per-user preference tables + per-user notification subscriptions. These are very different apps.

**2. Exactly which teams and players do you follow?**
Write the literal list: e.g. `NBA: Warriors, Thunder · NFL: Eagles · EPL: Manchester City · Tennis: Alcaraz, Sinner, Gauff`. Seed it as data instead of letting the agent guess. Tennis has no "team" — decide whether you track *players*, *tournaments* (all of Wimbledon), or both, because it needs its own schedule model.

**3. How do you want to be notified?**

- **Web Push** — free, no vendor, but needs VAPID keys + a service worker, and on iPhone it only works if you install the PWA to your home screen (iOS 16.4+). Best default.
- **Telegram or Discord bot** — 20 lines of code, instant, rock solid, arrives on every device. Genuinely the easiest thing that works.
- **SMS via Twilio** — costs per message and "every score change" in an NBA game is ~50 messages. Don't.
- **Email** — too slow for live.

Pick primary + fallback. Also decide: does "every score change" really mean *every* one? An NBA game has ~180. You almost certainly want **tiers** (see the prompt's alert tiers) with "every change" available as an opt-in per game.

**4. Reserved VM or Autoscale?**
This decides whether live alerts work at all. Autoscale deployments **sleep when no one is browsing** — so nothing polls, and no alert fires while you're asleep or at dinner. A live-alerts app needs a **Reserved VM** (always-on) or Replit **Scheduled Deployments** for the polling worker. Budget for it.

**5. Timezone and "watchable window."**
Your local zone, plus the hours you can realistically watch. A 3am EPL kickoff should be scored differently from a 7pm one. This feeds directly into the watchability ranking.

**6. What can you actually watch?**
League Pass, Peacock, ESPN+, a bar, VPN, nothing? A "must-watch" you can't legally see is noise. Even a hand-maintained list of your subscriptions makes the recommendations dramatically more useful.

**7. How deep should "AI coaching insights" go?**
Three very different builds:
- **(a) Narrative** — LLM writes a paragraph from the box score. Easy, sounds smart, is mostly vibes.
- **(b) Grounded stats** — compute usage rate, minutes trend, per-36 splits, on/off net rating from real box scores, then have the LLM *explain the numbers you computed*. Much better, needs a stats-quality API.
- **(c) Full model** — lineup-level RAPM, plus/minus regressions. Out of scope for Replit Agent.
Recommend **(b)**, and say so explicitly in the prompt or you'll get (a).

**8. History depth.**
Do you want last season's data for trends, or just live + upcoming? History multiplies API cost and storage but is what makes "this rookie deserves more minutes" credible.

**9. Phone-first or desktop-first?**
Live alerts imply phone. That means PWA + installable + big touch targets, and the desktop view is secondary.

**10. Which model for the AI layer?**
Recommend **Claude Sonnet 4.5** via the Anthropic API (`claude-sonnet-4-5`) — good reasoning-per-dollar for structured sports analysis. Note that Replit's built-in AI integration may default to something else; specify it. Set a monthly token cap and cache insights per-game rather than regenerating on every page load.

**11. What does "done" look like for v1?**
The single most useful thing you can add to the prompt. My suggestion: *"On a Tuesday morning I open it on my phone and in 10 seconds I know which one game tonight I should watch and why — and if I miss it, my phone tells me when it becomes close in the 4th."* Everything else is v2.

---

# PART 2 — The prompt

> Fill in every `<<< >>>` and delete this line and everything above it before pasting.

---

## PROJECT

Build **"Courtside"** — a personal, phone-first sports command center that tracks my specific teams and players across NBA, NFL, Premier League, and ATP/WTA tennis. Its job is to answer three questions fast: **what should I watch tonight and why**, **what's happening right now in games I care about**, and **how are my teams and players actually doing**.

This is a real application backed by real data feeds — not a mockup. Never fabricate scores, rosters, standings, or stats. If a feed is unavailable, the UI must show an explicit "data unavailable" state with the last-successful-fetch timestamp. Fake data anywhere is a build failure.

## SCOPE (v1)

- Users: `<<< personal, single-user, no auth | multi-user with Replit Auth >>>`
- My teams/players: `<<< NBA: … | NFL: … | EPL: Manchester City | Tennis: … >>>`
- Timezone: `<<< e.g. America/Los_Angeles >>>`
- Watchable hours: `<<< e.g. weekdays after 6pm, weekends anytime >>>`
- I have access to: `<<< League Pass, Peacock, ESPN+, … >>>`
- v1 is done when: `<<< your one-sentence definition >>>`

## STACK

- **Frontend:** React + TypeScript + Vite, Tailwind, `wouter` for routing, TanStack Query for server state. Installable PWA (manifest + service worker + maskable icons), designed mobile-first, dark by default.
- **Backend:** Node + Express + TypeScript in the same repl. Server-Sent Events (`/api/stream`) for live push to open clients — SSE, not WebSockets: it survives Replit's proxy better and auto-reconnects.
- **Database:** Replit PostgreSQL with Drizzle ORM + `drizzle-kit push`. No raw SQL strings in route handlers.
- **Worker:** a polling loop in the same process, started only when `ENABLE_POLLER=true`, so dev repls don't burn API quota.
- **Secrets:** every key in Replit Secrets, read via `process.env`. Never commit a key, never send a key to the browser, never hardcode a fallback key.

## DATA LAYER — build this first, and build it behind an interface

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
- `MockProvider` — realistic fixture JSON, including a **simulated live game that advances its score every few seconds**. Every screen must be fully buildable and demoable against this with zero API keys.
- `<<< your chosen vendor >>>Provider` — the real one, selected by `SPORTS_PROVIDER` env var.

Rules for the real provider:
- Every response cached in Postgres with a TTL: rosters 24h, schedules 6h, standings 1h, live scores 20s.
- A token-bucket rate limiter in front of every outbound call, configured from `API_DAILY_LIMIT`.
- Exponential backoff with jitter on 429/5xx; never retry a 4xx other than 429.
- A `/api/health/providers` endpoint showing per-endpoint call counts today, cache hit rate, and last error. I need to see my quota burn.

## FEATURE 1 — Watchability engine ("what should I watch tonight")

This is the heart of the app. Implement it as a pure, unit-tested function in `server/scoring/watchability.ts`. **Do not ask an LLM to produce this score** — compute it deterministically, then optionally have the LLM write the one-line explanation of the numbers.

`watchScore` = 0–100, weighted sum of normalized 0–1 components:

| Component | Weight | Definition |
|---|---|---|
| `stakes` | 0.22 | Playoff/relegation/seeding implications; elimination games; title races; late-season > early-season; rivalry flag |
| `quality` | 0.18 | **min(** teamA rating, teamB rating **)** — not the average, so a great team stomping a bad one doesn't score high |
| `competitiveness` | 0.18 | `1 - 2*abs(0.5 - impliedWinProb)` from ratings or market odds. A coin-flip game maxes this |
| `starPower` | 0.15 | Sum of star ratings for players **projected available** — auto-discounted when a star is OUT/QUESTIONABLE |
| `personalFit` | 0.15 | My teams and tracked players; head-to-head against a rival; a tracked player's revenge/milestone game |
| `storyline` | 0.07 | Win/loss streaks, first meeting since a notable event, milestone chase, coach return, debut |
| `convenience` | 0.05 | Kickoff inside my watchable hours in my timezone; on a service I have. Penalize, don't zero out |

Every score carries a **`reasons: string[]`** — the top 2–3 contributing components rendered as plain English ("Both top-5 in the East", "Haaland back from injury", "Winner takes top seed"). **Never show a bare number.** The reason is the product.

Buckets: **90+ Appointment · 75–89 Must-watch · 55–74 Worth it · 35–54 Check the score · <35 Skip.**

**Tonight view (the home screen):** every game today involving my leagues, ranked by `watchScore`, with the top pick pulled out as a hero card — matchup, tipoff in my local time, where to watch, the 2–3 reasons, and a "remind me 15 min before" button. Below it, a ranked list. Above it, anything live right now.

## FEATURE 2 — Schedule difficulty analysis

For each tracked team, show the next 15 games as a **horizontal difficulty strip** (one colored cell per game, easy→hard).

`difficultyScore` per game, again deterministic:
- Opponent strength (net rating / xG / Elo, league-appropriate)
- Home vs away
- Rest: days since last game; flag **back-to-backs** and **3-in-4** / **4-in-6** stretches
- Travel: distance from previous game's city, plus a timezone-change penalty; altitude flag for Denver/Utah
- Opponent's rest advantage relative to mine
- Key injuries on both sides at time of viewing

Then surface derived insight above the strip:
- **Gauntlet stretches** — any run of 4+ games averaging top-quartile difficulty, labeled with dates ("Nov 12–21: five games, four on the road, three vs top-6 teams")
- **Soft stretches** — the mirror image, framed as "this is where they need to bank wins"
- **Trap games** — an easy opponent sandwiched between two hard ones, or the game right after a marquee matchup
- **Projected record** over the strip, from per-game win probabilities

Tennis needs its own model: draw-based, not schedule-based. Show my tracked player's bracket path, seeded opponents by round, and the round where they'd meet each higher seed.

## FEATURE 3 — Roster & availability

Per team: full roster grouped as **Starters / Rotation / Bench / Injured / Out**, sortable, with headshot, position, age, years pro, and a compact stat line appropriate to the sport.

Injury panel: player, status (`OUT / DOUBTFUL / QUESTIONABLE / PROBABLE / GTD`), description, expected return, source timestamp. **Always show how stale the injury data is** — an hour-old injury report is a different thing from a five-day-old one.

Depth chart view for NFL and EPL (probable XI / formation).

## FEATURE 4 — Utilization & coaching insights

Compute the numbers in code first, from real box scores over a configurable window (default: last 10 games and season-to-date):

- Minutes per game and its trend line (slope over the window)
- Usage rate, per-36 (or per-90) production
- On/off net rating differential where the data supports it
- Efficiency vs. role: is production per minute rising while minutes are flat?
- Rookie/young-player flag: age ≤ 23 or ≤ 2 years experience
- Veteran-decline flag: production per minute falling while minutes stay high

Then, and only then, send those computed numbers to **`<<< claude-sonnet-4-5 >>>`** with a strict system prompt: *"You are analyzing pre-computed statistics. Cite only numbers present in the input. Never invent a statistic. If the data is insufficient for a conclusion, say so."*

Output per team: 3–5 **actionable** recommendations, each stating the player, the recommended change, the numbers behind it, and the confidence level. "Give Player X 6–8 more minutes: 22.4 per-36 points on 61% TS in a 19-minute role, and the team is +7.1 with him on the floor over 10 games." Not "Player X is playing well."

Cache each insight against `(teamId, gamesPlayed)` so it regenerates only when new games exist. Show the generation timestamp. Add a manual "regenerate" button. Track token spend against `AI_MONTHLY_TOKEN_BUDGET` and degrade to cached-only when exceeded.

## FEATURE 5 — Live scores and alerts

**Polling worker**, tiered so quota goes where it matters:
- Games involving my teams, live: every **15s**
- Any game with `watchScore ≥ 75`, live: every **30s**
- Other live games in my leagues: every **60s**
- Nothing live: **5 min** heartbeat to catch start times
- Between 2am–8am my time with nothing live: pause entirely

Each poll **diffs against last known state** and emits typed events: `SCORE_CHANGE`, `LEAD_CHANGE`, `PERIOD_START/END`, `FINAL`, `CLOSE_GAME`, `INJURY`, `RED_CARD`, `EJECTION`, `MILESTONE`, `UPSET_BREWING`, `TENNIS_SET_POINT`, `TENNIS_MATCH_POINT`, `PENALTY_SHOOTOUT`, `RED_ZONE`, `FOURTH_DOWN_GOING_FOR_IT`.

Events fan out to (a) SSE for any open browser tab and (b) the notification channel.

**Alert tiers — configurable per team, and this is what keeps the app usable:**
- **All** — literally every score change (available, off by default, warn me it's ~180 notifications per NBA game)
- **Key moments** *(default)* — lead changes, period ends, injuries, cards/ejections, milestones, finals
- **Clutch only** — under 5 minutes left with a margin ≤ 5 points; last 10 minutes of a one-goal match; any tennis set/match point
- **Final only**
- Plus a **"drop what you're doing"** alert: any game hits `watchScore ≥ 85` **and** enters clutch time → *"Warriors–Thunder is tied with 3:40 left. Turn it on."* This is the single best feature in the app.

Notification transport: `<<< Web Push with VAPID | Telegram bot | Discord webhook >>>`. Implement it behind a `NotificationChannel` interface with a `ConsoleChannel` for local dev. Every alert is idempotent — dedupe on `(gameId, eventType, gameClock)` so a re-poll never double-fires.

**Live game view:** big score, game clock, period, last 5 events as a feed, win-probability bar if derivable, and a per-game alert toggle.

## DATA MODEL

`leagues · teams · players · games · game_events · box_scores · injuries · standings · user_preferences · tracked_entities · notification_subscriptions · alert_log · api_call_log · ai_insights`

Index for the two hot paths: "all games in a date range for my tracked teams" and "all currently-live games." Store all timestamps as UTC `timestamptz`; convert at the edge only.

## SCREENS

1. **Tonight** *(home)* — live-now strip, hero pick, ranked list of today's games
2. **Live** — every in-progress game I care about, auto-updating via SSE
3. **Team** — difficulty strip, next 5 games, roster, injuries, insights, standings context
4. **Player** — tracked player's stats, minutes trend, next matchups, utilization verdict
5. **Schedule** — calendar/list across all my teams, filterable by league and watchScore
6. **Settings** — tracked teams/players, alert tiers per team, timezone, services I subscribe to, notification test button, API usage dashboard

## BUILD ORDER — ship each milestone working before starting the next

1. Schema + `MockProvider` + Tonight screen ranking mock games — **the watchability engine visibly working, no API keys needed**
2. Real provider behind the interface, with caching, rate limiting, and the health endpoint
3. Live polling + SSE + the live view
4. Notification channel + alert tiers + dedupe
5. Schedule difficulty + gauntlet detection
6. Rosters + injuries
7. AI utilization insights
8. PWA polish: installable, offline shell, home-screen icon

## NON-NEGOTIABLES

- No fabricated data, ever. Empty and error states everywhere, always with a timestamp.
- The watchability and difficulty scores are pure functions with unit tests covering their edge cases (missing ratings, injured stars, unknown start time).
- Loading skeletons, not spinners. Nothing on screen jumps as data arrives.
- Every timestamp displayed in my local timezone, with the zone abbreviation shown.
- No API key ever reaches the client bundle.
- `README.md` documents every env var, how to get each key, and how to run with `SPORTS_PROVIDER=mock`.

## ENV VARS

```
SPORTS_PROVIDER=mock|<<<vendor>>>
SPORTS_API_KEY=
API_DAILY_LIMIT=
ANTHROPIC_API_KEY=
AI_MODEL=<<<claude-sonnet-4-5>>>
AI_MONTHLY_TOKEN_BUDGET=
ENABLE_POLLER=false
VAPID_PUBLIC_KEY=
VAPID_PRIVATE_KEY=
TELEGRAM_BOT_TOKEN=
TELEGRAM_CHAT_ID=
USER_TIMEZONE=
DATABASE_URL=
```

## DEPLOYMENT

Deploy the web app on Replit. **The polling worker must run on an always-on Reserved VM, not Autoscale** — Autoscale sleeps when idle, which means no alerts fire when I'm not already looking at the app, which defeats the entire point. If cost rules that out, fall back to Replit Scheduled Deployments running the poller every minute, and say clearly in the README that alert latency is then up to 60 seconds.

**Start with milestone 1 and show me the Tonight screen ranking mock games before writing a single line of provider integration code.**
