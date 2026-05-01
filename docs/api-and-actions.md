# API and Server Actions

This document describes HTTP API routes and server action patterns in Bread Pitt.

Related docs: [architecture.md](architecture.md), [integrations.md](integrations.md), [data-model.md](data-model.md)

## 1) API routes

## `/api/health`

Purpose:

- liveness check for runtime and container health checks

Expected behavior:

- returns HTTP 200 with a simple healthy response

Used by:

- Docker healthcheck in `Dockerfile`

## `/api/telegram/webhook`

Purpose:

- receives Telegram webhook updates for bot commands/messages

Expected behavior:

- validates secret token through bot middleware/config
- processes commands and interactions
- responds quickly to Telegram delivery request

Security notes:

- endpoint is intentionally public
- protected by webhook secret and bot-side validation logic

## `/api/google/oauth/start`

Purpose:

- initiates Google OAuth flow for Calendar integration

Behavior:

- checks required env vars
- builds signed OAuth state
- redirects user to Google consent page

## `/api/google/oauth/callback`

Purpose:

- handles OAuth callback code/state and finalizes account connection

Behavior:

- verifies state signature and expiration
- exchanges auth code for token data
- upserts connected Google account
- ensures target calendar and backfills event sync

## 2) Server action usage model

Bread Pitt primarily uses Next.js Server Actions for mutations.

Common action locations:

- `app/(auth)/login/actions.ts`
- `app/(app)/processes/actions.ts`
- `app/(app)/settings/actions.ts`
- `app/(app)/discard/actions.ts`

Pattern:

1. validate authenticated user where required
2. parse and normalize form values
3. call domain functions in `lib/*`
4. persist state through Drizzle
5. revalidate paths or redirect as needed

## 3) Auth-related actions

### Login action

- validates credentials with bcrypt
- creates DB-backed session + signed cookie
- redirects to target app page

### Logout action

- deletes server-side session row
- clears cookie
- redirects to login

### Password update actions

- run in authenticated settings context
- validate current/new password
- update hash in `users`

## 4) Process actions

Typical process action operations:

- start process
- complete step
- skip/snooze step
- pause/resume/restart/abandon process
- add observation
- maturity decision helpers (confirm/extend)

These actions delegate heavy logic to `lib/processes/engine.ts`.

## 5) Discard actions

Typical operations:

- open/add-to jar
- log recipe use
- archive jar
- adjust current grams

State is persisted in `discard_jars` and `discard_uses`.

## 6) Settings actions

Typical operations:

- save display and process preferences
- toggle notifications and quiet hours
- Telegram pairing/unpairing lifecycle
- Google sync toggle and disconnect
- password change and sign out

## 7) Error-handling conventions

- user-facing actions return understandable messages where practical
- severe integration errors are logged server-side
- callback routes may redirect to settings with status indicators

## 8) Security boundaries for actions/routes

- middleware restricts authenticated app routes
- public API routes are minimal and explicit
- session validation combines JWT verification + DB lookup
- OAuth state signing uses `SESSION_SECRET`

## 9) Adding a new API route

1. create route under `app/api/.../route.ts`
2. keep handler small; delegate business logic to `lib/*`
3. validate all untrusted input
4. add explicit success/error responses
5. update docs and operational checks

## 10) Adding a new server action

1. place action near route surface that owns UI interaction
2. call shared domain helpers, avoid duplicated logic
3. keep DB writes atomic where possible
4. revalidate necessary pages
5. add troubleshooting notes for likely failures

## 11) Verification checklist

- Health endpoint returns 200.
- Login and logout mutate session table correctly.
- Process action operations create and transition DB rows as expected.
- Telegram webhook handles valid command requests.
- Google OAuth start/callback flow creates account linkage successfully.

