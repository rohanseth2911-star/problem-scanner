# Courtside — working notes

A personal, phone-first sports app across NBA, NFL, Premier League and tennis.
It answers: **what should I watch tonight and why**, **what's happening right
now**, and **how are my teams actually doing**.

Not a general sports app. It is tuned to one person — no auth, no signups, one
row of preferences.

## Run it

```bash
npm install
npm run dev      # http://localhost:5173
```

Needs **Node 22.5+** (`node:sqlite` is built in from that version).
Works with **zero API keys** — the mock provider drives every screen and
includes a live game whose score genuinely advances.

```bash
npm test         # 66 tests
npm run typecheck
npm run probe    # checks a real SPORTS_API_KEY against every endpoint
```

## Invariants — do not break these

These are the decisions that make the app worth using. Several are enforced by
tests; if a change requires breaking one, that is a conversation, not a fix.

1. **The watchability score is deterministic code, never a model call.**
   `server/scoring/watchability.ts` is a pure function. The model is only ever
   asked to phrase reasons the code already computed. If an LLM starts
   producing the number, the number stops being checkable.

2. **Never fabricate data.** Upstream failures render an explicit unavailable
   state with the last-successful-fetch timestamp. Never zeroes, never blanks
   presented as facts. Every screen shows how old its data is.

3. **No invented statistics attached to real people.** In mock mode, club
   names, cities and venue coordinates are real (travel and altitude terms in
   the difficulty model are meaningless otherwise). Every *person* is
   fictional. Do not "improve" the fixtures by swapping in real player names.

4. **A recommendation must agree with the evidence it cites.** A player
   producing above the team median is never told to play less, whatever the
   composite verdict says. Per-36 extrapolations from cameo minutes are
   suppressed, not dressed up. Both are enforced in
   `server/insights/__tests__/utilization.test.ts`.

5. **An explicit mute is absolute.** `alertTiers[teamId] === 'off'` silences
   everything including the drop-everything alert. A team you have simply never
   had an opinion about resolves to `'discover'` — silent, but still able to
   raise a drop-everything. These are different states; collapsing them was a
   real bug.

6. **Alert delivery is idempotent.** `alert_log`'s primary key is the event
   dedupe key `(gameId, type, gameClock)`. A re-poll, a restart or a duplicate
   upstream frame must never double-notify.

## Layout

```
shared/       types.ts, leagues.ts (periods, clutch thresholds, draws)
server/
  providers/  SportsProvider interface · MockProvider · ApiSportsProvider
              CachedProvider wraps any of them: TTL cache, token bucket,
              jittered backoff, per-endpoint call logging
  scoring/    watchability.ts, difficulty.ts — pure, deterministic, tested
  live/       events.ts (diff engine) · poller.ts (tiers) · sse.ts · notify.ts
  insights/   utilization.ts (the arithmetic) · ai.ts (explanation + verify)
  db.ts       node:sqlite — Postgres-shaped schema, swappable for a pg pool
client/       React + Vite PWA, dark, mobile-first
```

The data flow that matters: **poll → diff against last state → typed events →
SSE + notification**. Polling alone only ever produces numbers; `events.ts` is
what turns them into things worth telling someone about.

## Known gaps

- **The API-SPORTS adapter has never run against a live key.** Its mappers are
  deliberately strict — they throw on an unexpected shape rather than return a
  half-populated roster, because a plausible-looking wrong roster is worse than
  a visible error. Expect to fix field mappings on first contact. Run
  `npm run probe` and work from its output.
- **Tennis is modelled as single-competitor "teams"** so schedules, live state
  and scoring share one code path. Draw-based bracket paths are stubbed rather
  than real.
- **No player detail route.** Player data is reachable only through the team
  page roster.
- **Web push is a stub.** `WebPushChannel` exists behind the
  `NotificationChannel` interface; only Console and Telegram are implemented.
- **`starRating` is a fixture concept.** The real provider returns 50 for
  everyone, so `starPower` is inert on live data until it is derived from usage
  and production.

## Deployment

The polling worker must run somewhere **always-on**. On a scale-to-zero host it
sleeps whenever nobody is browsing, so no alert fires unless the user already
has the app open — which removes the reason the app exists. `.replit` sets
`deploymentTarget = "vm"` for this reason.

## Environment

Copy `.env.example` to `.env`. Everything is optional; defaults run in mock mode.
Without `ANTHROPIC_API_KEY` the insights fall back to a rule-based analysis over
the identical computed numbers, and the UI says so.
