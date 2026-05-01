# Bread Pitt

A personal sourdough companion. Track a starter from Day 1, run a bake-day
timeline, mind the discard jar, and get gentle Telegram nudges when something
needs your attention. Single-user, self-hosted, single SQLite file.

```
Next.js 15 · React 19 · SQLite + Drizzle · grammY · Tailwind v4 · Framer + GSAP
```

The recipe-of-record lives in two markdown files at the repo root —
`sourdough_complete_guide.md` and `sourdough_discard_and_starter_care.md`.
They are parsed at boot and become the library, the troubleshooter, and the
process step templates. Edit those files and re-sync; the app updates with you.

---

## Quick start (local)

Prerequisites: **Node 20+** (24 works), **pnpm 9+**, and on Windows the
**Visual Studio C++ build tools** so `better-sqlite3` can compile its native
binding.

```bash
# 1. install deps (this also compiles better-sqlite3)
pnpm install

# 2. configure environment
cp .env.example .env
# at minimum, replace SESSION_SECRET with: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# 3. set up the database
pnpm db:generate     # produces drizzle/*.sql from the schema (only needed first time / after schema edits)
pnpm db:migrate      # applies migrations + creates the FTS5 search table

# 4. ingest the markdown guides into the DB
pnpm knowledge:sync

# 5. seed the single user (password is yours to pick)
pnpm seed:admin <password> [display-name]

# 6. run it
pnpm dev
```

Open <http://localhost:3000>, log in, and start a process from `/processes`.

---

## How the application works

Bread Pitt is built around five ideas. Knowing them makes the rest of the UI
feel inevitable.

### 1. The two markdown files are the source of truth

Everything the app knows about sourdough comes from those two files. On boot,
`lib/knowledge/parse.ts` walks them with **remark + rehype**, splits sections
on headings, anchors every header, extracts the troubleshooting tables into a
structured form, and writes the result to:

- `guide_sections` — one row per heading, with rendered HTML and a slug
- `guide_search` — an **SQLite FTS5** virtual table for instant fuzzy search
- `troubleshoot_rows` — symptom / cause / fix triples

The `/library` page reads from these tables. `/library/troubleshoot` issues an
FTS5 `MATCH` query against the index. Edit the markdown, run `pnpm
knowledge:sync`, refresh — the library reflects the change.

### 2. Processes are timelines, not state machines

A process is one run of one routine: a starter build, a bake day, a weekly
maintenance cycle, a discard purge, a fridge-revival. Each has a **template**
(`lib/processes/templates/*.ts`) that is a pure function:

```
(startedAt, kitchenTemp, options) → { steps[], reminders[] }
```

When you click *Start* on `/processes/[type]/start`, the engine:

1. Inserts a `processes` row.
2. Materializes every step into `process_steps` with a precomputed
   `scheduledFor` timestamp.
3. Materializes every Telegram reminder into the durable `reminders` queue
   with a `fireAt` timestamp.

Pause cancels all pending reminders and freezes scheduled times. Resume
re-anchors remaining steps to *now + the same offsets* and reschedules.
Restart archives the old run and starts a fresh one — old runs stay queryable
in `/journal` so you can see how the last starter behaved differently.

### 3. The reminder queue survives reboots

A pure in-memory scheduler would lose pending reminders whenever the VPS
restarts. So everything goes into the `reminders` table:

- `lib/scheduler/cron.ts` runs a **30-second tick** (`node-cron`) that
  `SELECT`s pending reminders with `fireAt <= now()` and dispatches them.
- Each dispatch sends via **grammY**, marks the row `sent`, and retries up to
  three times with exponential backoff on failure.
- On boot, a reconciliation pass coalesces anything that fired during downtime
  into a single "you missed:" digest message.
- Quiet hours from `preferences` defer overnight reminders until the next
  allowed minute.

The scheduler boots automatically via `instrumentation.ts`.

### 4. Telegram is the live channel

`grammY` runs as a webhook (not long-polling) at `/api/telegram/webhook`.
Pairing flow lives in `/settings`:

1. Click *Generate pairing code* — a 6-digit code is written to your `users`
   row with a 15-minute TTL.
2. Send `/start <code>` to your bot in Telegram.
3. The webhook matches the code, captures `chatId`, and you're paired.

Once paired, the bot understands a small command set: `/today`, `/done`,
`/snooze 30m`, `/photo` (with attachment), `/status`. Outbound message tone is
deliberately warm and short — see `lib/telegram/templates.ts`.

If you don't set `TELEGRAM_BOT_TOKEN`, the app still works fully — reminders
just stay queued and visible in the UI.

### 5. The discard jar is a real thing the app tracks

`/discard` is a working scoreboard: how much is in the jar right now, when it
was opened, what bakes have come out of it. Each archived jar is a snapshot of
a chapter in your starter's life. Recipes are graded by effort
(`survive` / `weekend` / `project`) so picking what to do is easy.

---

## Pages

| Route | Purpose |
| --- | --- |
| `/` | Today — live starter status, next 24 hours of scheduled actions, quick-log |
| `/journal` | Vertical timeline of every process you've run, scrubbed with GSAP |
| `/journal/[id]` | A single run, day by day, with photos and observations |
| `/processes` | Catalog — start a new starter build, bake, weekly maintenance, etc. |
| `/processes/[type]/start` | Configuration sheet for the new run |
| `/library` | Both guides as books on a shelf; editorial reading view inside |
| `/library/troubleshoot` | FTS5-backed search over both troubleshooting tables |
| `/discard` | Live jar fill, recent uses, recipe browser, archived jars |
| `/settings` | Telegram pairing, kitchen temp, quiet hours, password, sign-out |
| `/login` | Single-user gate |
| `/api/health` | `200` if the process is up — used by the Docker healthcheck |
| `/api/telegram/webhook` | grammY webhook (Telegram → app) |

The `(app)` route group is auth-gated by middleware. `/login`, the webhook,
and static assets are the only public routes.

---

## Environment variables

| name | required | notes |
| --- | --- | --- |
| `SESSION_SECRET` | yes | 32+ bytes of hex; rotating it invalidates sessions |
| `DATABASE_URL` | yes | for SQLite this is metadata only — actual path is `data/bread-pitt.db` |
| `PUBLIC_BASE_URL` | yes | used in pairing flow and Telegram links |
| `TELEGRAM_BOT_TOKEN` | for nudges | from [@BotFather](https://t.me/BotFather) |
| `TELEGRAM_WEBHOOK_SECRET` | for nudges | random; verifies the `X-Telegram-Bot-Api-Secret-Token` header |
| `ADMIN_PASSWORD` | first boot only | seeds the single user inside the Docker entrypoint |
| `ADMIN_PASSWORD_HASH` | alternative | bcrypt hash if you don't want to pass plaintext |
| `ADMIN_DISPLAY_NAME` | optional | default `Baker` |
| `TZ` | optional | container timezone, e.g. `America/New_York` |

Generate a fresh secret:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

---

## Common operations

| You want to … | Run |
| --- | --- |
| Edit the schema | edit `lib/db/schema.ts` → `pnpm db:generate` → `pnpm db:migrate` |
| Edit the guides | edit the two `.md` files → `pnpm knowledge:sync` |
| Add a new process type | drop a template in `lib/processes/templates/` and register it in `engine.ts` |
| Reset everything locally | delete `data/bread-pitt.db*` and re-run steps 3–5 of Quick start |
| Inspect the DB | `pnpm db:studio` |
| Type-check | `npx tsc --noEmit` |

---

## Deployment (VPS, Docker)

The image is multi-stage (Node 22 slim → standalone runtime), runs as a
non-root user, uses `tini` as PID 1, and exposes a healthcheck against
`/api/health`.

```bash
# 1. Create the env the compose stack reads:
cat > .env <<EOF
DOMAIN=bread-pitt.example.com
ACME_EMAIL=you@example.com
SESSION_SECRET=$(openssl rand -hex 32)
PUBLIC_BASE_URL=https://bread-pitt.example.com
TELEGRAM_BOT_TOKEN=
TELEGRAM_WEBHOOK_SECRET=$(openssl rand -hex 16)
ADMIN_PASSWORD=changeme-on-first-boot
TZ=UTC
EOF

# 2. Build and run:
docker compose up -d --build

# 3. Tail logs to confirm migrations + knowledge sync ran:
docker compose logs -f bread-pitt
```

`docker/entrypoint.sh` runs migrations, syncs knowledge, optionally seeds the
admin from `ADMIN_PASSWORD` if no users exist yet, then hands off to the
standalone Next server. **All of that happens on every boot**, so updates are
just `git pull && docker compose up -d --build`.

Caddy fronts the app, terminates TLS for `$DOMAIN`, and reverse-proxies to the
container. To run without Caddy, comment out the `caddy` service in
`docker-compose.yml` and uncomment the `ports:` block on the `bread-pitt`
service.

### Telegram webhook (one-time, after the public domain is reachable)

```bash
curl "https://api.telegram.org/bot$TELEGRAM_BOT_TOKEN/setWebhook" \
  -d "url=$PUBLIC_BASE_URL/api/telegram/webhook" \
  -d "secret_token=$TELEGRAM_WEBHOOK_SECRET"
```

Then pair your account in `/settings`.

### Backups

`scripts/backup.sh` writes a gzipped SQLite snapshot to `data/backups/` (using
`sqlite3 .backup` so it's safe under WAL with the app running) and prunes
files older than `RETAIN_DAYS` (default 14).

```cron
0 3 * * * cd /opt/bread-pitt && ./scripts/backup.sh >> data/backups/backup.log 2>&1
```

To restore: `gunzip` the snapshot, `docker compose down`, replace
`data/bread-pitt.db`, `docker compose up -d`.

---

## Project layout

```
app/
  (auth)/login/             single-user login
  (app)/                    auth-gated shell (today, journal, processes, library, discard, settings)
  api/health/               healthcheck
  api/telegram/webhook/     grammY webhook
components/
  ui/                       custom primitives (Button, Card, Input, …)
  brand/                    bespoke SVG/Lottie pieces (StarterJar, DiscardJar)
  motion/                   FadeStagger, ScrollReveal, SpringCounter
lib/
  auth/                     password hashing, session cookies, setup tokens
  db/                       Drizzle schema + better-sqlite3 client + WAL pragmas
  discard/                  jar bookkeeping + the recipe catalog
  knowledge/                markdown → DB pipeline + FTS5 search
  processes/
    engine.ts               start / pause / resume / restart, the single brain
    templates/              one file per process type (starter-build, bake-day, …)
  scheduler/                30-second tick + boot reconciliation
  telegram/                 grammY bot, message templates, pairing flow
content/                    optional symlinks (the canonical files live at repo root)
drizzle/                    generated SQL migrations
scripts/
  migrate.ts                applies migrations + creates FTS5 table
  sync-knowledge.ts         re-parses the two markdown files
  seed-admin.ts             one-time admin user
  backup.sh                 gzipped SQLite snapshot
  server-only-shim.ts       tsx-only shim so CLI scripts can import lib/* files that use `server-only`
docker/
  entrypoint.sh             migrate → sync knowledge → seed → exec server
public/
  lottie/                   the starter-jar animation
data/                       SQLite + uploads + backups (gitignored, mounted in compose)
sourdough_complete_guide.md
sourdough_discard_and_starter_care.md
Dockerfile
docker-compose.yml
Caddyfile
```

---

## Design choices worth knowing

- **Dark mode first.** The palette is built around bread (`crust`, `crumb`,
  `flour`, `char`, `butter`, `levain`, `hooch`). Light mode is supported but
  the app was designed to feel like an evening kitchen.
- **Editorial typography.** Fraunces (variable, optical-sized) for headers and
  numerals, Geist Sans for UI, JetBrains Mono for grams and timers. The
  display sizes are deliberately large.
- **Motion you can disable.** Framer Motion handles component transitions,
  GSAP + ScrollTrigger drive the journal scroll choreography, and Lenis adds
  smooth scrolling. All three respect `prefers-reduced-motion`.
- **No Redis, no BullMQ.** A SQLite-backed queue + a 30-second cron is enough
  for one user, durable across reboots, and trivial to back up.
- **No multi-tenant code paths.** The single-user assumption is everywhere
  (no `userId` filters in scopes that don't need them, one row in `users`).
  This is on purpose.

---

## Out of scope (deliberate)

- Multi-user / sharing
- A native mobile app (the web app is responsive and PWA-installable)
- User-authored recipes (the two markdown files are the canon)
- AI crumb analysis
- Public deployment / SaaS-ification — this is a personal app, full stop
