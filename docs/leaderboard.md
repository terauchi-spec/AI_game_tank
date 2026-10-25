# Shared scoreboard

The title menu opens a public overall board plus the six normal stage boards. Each
board holds at most 30 entries and one personal best per browser identity. Overall
means the player's highest single-run score across normal stages, not a sum.
Equal scores retain the first submission (server time). Names, rank, skill and
all earned run titles are snapshots from that best run, including repeat titles.
Names are rendered as text and title artwork comes only from the known catalog.

Normal completed/failure results submit after scoring; debug-used runs, area debug
and test stages are excluded. Existing local progression remains unchanged. Past
local high scores lack full run metadata and are not imported. Queued offline
scores retain only a best per normal stage and retry on later results, board visits
or online events. No polling or gameplay-frame requests are introduced.

## Deployment

`wrangler.json` adds the Worker entry point and a SQLite Durable Object binding.
The `v1-scoreboard` migration provisions its namespace automatically during the
existing `npx wrangler deploy --assets . --compatibility-date 2026-10-01` command.
Do not delete/rename that migration or Durable Object class after deployment.
No database ID, secret or manual schema command is needed. Source/configuration
is excluded by `.assetsignore`. Only `/api/*` invokes the Worker before assets;
the normal static asset serving path remains intact.

`GET /api/leaderboard?board=overall` returns scores (or a normal stage ID).
`POST /api/leaderboard` validates and saves a result. The Worker issues a Secure,
HttpOnly, SameSite cookie with a random browser identity. Identity IDs are never
included in public rows. Storage transactions update both boards atomically.
Rankings and cookies persist across deployments. Local data reset keeps online
records; deleting browser cookies creates a new identity. Different devices or
browsers are separate players; no login/account linking is provided.

This is a casual, client-reported scoreboard. Validation bounds the payload and
rejects declared debug runs, but it does not prove the client ran unmodified code.
It is not a cheat-resistant competitive backend. The server stores only the bounded
leaderboards, not an unbounded history of every submitted score.

## Validation

Run `node --test tests/leaderboard*.test.cjs` for validation, best-score ordering,
concurrent transactional updates, cookie handling, DOM rendering, exclusion,
offline retry and submission snapshots. Integration with the actual Cloudflare
account must be verified after deployment via the API and two browser sessions.

Successful score submissions also return `updated: [{board, position}]`, limited
to boards whose top-30 row actually changed for that player. Unchanged personal
bests and scores outside the retained thirty return an empty array. The client
uses only this server confirmation for unlock-screen scoreboard notices, including
when there are no stage/skill/title unlocks. Late results append to an open notice;
if evaluation has already opened they produce a score-only notice once. A delayed
submission never interrupts another sortie. The instructor bubble uses the outcome
of the run and does not add another animation timer.
