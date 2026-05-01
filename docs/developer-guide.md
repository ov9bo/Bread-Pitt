# Developer Guide

This guide helps engineers set up, run, and contribute to Bread Pitt.

Related docs: [architecture.md](architecture.md), [data-model.md](data-model.md), [api-and-actions.md](api-and-actions.md)

## 1) Prerequisites

- Node.js 20+ (Node 22 recommended)
- npm or pnpm (repo scripts use pnpm in examples)
- Git
- Optional: Docker and Docker Compose for containerized runs

On Windows, make sure native module build requirements for `better-sqlite3` are available.

## 2) Local setup

```bash
pnpm install
cp .env.example .env
```

Set at least:

- `SESSION_SECRET` (strong random value)
- `PUBLIC_BASE_URL` (usually `http://localhost:3000`)

Optional but common:

- Telegram vars for bot features
- Google vars for calendar integration

## 3) Database workflow

### Generate migrations after schema changes

```bash
pnpm db:generate
```

### Apply migrations

```bash
pnpm db:migrate
```

### Seed admin user

```bash
pnpm seed:admin <password> [display-name]
```

### Start knowledge sync

```bash
pnpm knowledge:sync
```

## 4) Development run loop

```bash
pnpm dev
```

Typical flow:

1. make code change
2. refresh browser
3. if schema changed, run migration flow
4. if guide markdown changed, run knowledge sync

## 5) Repository structure for contributors

- `app`: routes, layouts, server actions
- `components`: reusable view components
- `lib`: business logic and integrations
- `scripts`: operational/developer scripts
- `drizzle`: migration SQL and metadata
- `docs`: project documentation

## 6) Coding guidelines for this codebase

- Keep UI logic in routes/components, not in low-level services.
- Put process domain rules in `lib/processes`.
- Keep DB schema as source of truth in `lib/db/schema.ts`.
- Prefer explicit table writes over hidden side effects.
- Keep integration adapters isolated (`lib/telegram`, `lib/google`).

## 7) Key scripts reference

- `pnpm dev`: start dev server
- `pnpm build`: production build
- `pnpm start`: start built app
- `pnpm lint`: lint checks
- `pnpm db:generate`: generate migration SQL
- `pnpm db:migrate`: apply migrations
- `pnpm db:studio`: open Drizzle Studio
- `pnpm seed:admin`: create first user
- `pnpm knowledge:sync`: sync markdown knowledge into DB

## 8) Making common changes

### Add a field to a table

1. edit `lib/db/schema.ts`
2. run `pnpm db:generate`
3. run `pnpm db:migrate`
4. update UI/actions consuming the field
5. update docs

### Add a new process template

1. create template file in `lib/processes/templates`
2. register template in the templates index
3. update any process selection UI
4. verify engine lifecycle functions still behave correctly

### Update library knowledge content

1. edit root markdown guides
2. run `pnpm knowledge:sync`
3. verify `/library` and `/library/troubleshoot`

## 9) Integration development notes

- Telegram webhook route is public and must validate secret token.
- Google OAuth callback requires matching redirect URI and state verification.
- Calendar sync should never become source of truth for process state.

## 10) Debugging tips

- Check app logs for scheduler and integration errors.
- Query DB directly to inspect process/reminder rows.
- Verify env vars first when integration behavior fails.
- Use `/api/health` to confirm runtime liveness.

## 11) Pull request checklist

- Code compiles and lint passes.
- Migrations included if schema changed.
- Documentation updated in `docs/`.
- Security impact considered for new env vars/endpoints.
- Manual test notes captured.

## 12) Verification checklist

- Fresh clone can be set up end-to-end using this guide.
- New process run can be created and stepped through.
- Optional integrations still optional when vars are unset.

