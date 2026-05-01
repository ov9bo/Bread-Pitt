# Troubleshooting

This guide provides symptom-based troubleshooting steps for common Bread Pitt issues.

Related docs: [operations-runbook.md](operations-runbook.md), [integrations.md](integrations.md), [developer-guide.md](developer-guide.md)

## 1) Quick triage flow

1. Is app reachable at `/api/health`?
2. Are containers/processes running?
3. Are required env vars present?
4. Did DB migrations complete successfully?
5. Is issue isolated to integration or core app?

## 2) Login and session issues

## Symptom: "Invalid credentials"

Checks:

- confirm correct password used
- confirm admin account exists in DB
- reseed only if no user exists yet

## Symptom: redirected to `/login` repeatedly

Checks:

- verify `SESSION_SECRET` has not changed unexpectedly
- clear browser cookies and retry
- check session table row existence and expiry
- confirm middleware is not misconfigured

## 3) Process workflow issues

## Symptom: process start fails

Checks:

- inspect server logs for action errors
- verify DB is writable
- verify required template registration exists

## Symptom: timeline times look wrong after pause/resume

Checks:

- confirm expected behavior: remaining steps shift by paused duration
- inspect `process_steps.scheduled_for` updates
- check server timezone assumptions

## 4) Reminder and scheduler issues

## Symptom: reminders not being sent

Checks:

- verify scheduler started (`[scheduler] started` log)
- verify `notifications_enabled` is true
- verify current time is outside quiet hours
- verify reminder rows are still `pending`
- verify Telegram pairing exists

## Symptom: reminders marked failed

Checks:

- inspect `last_error` and `attempts`
- verify Telegram bot token and network connectivity
- confirm webhook/bot setup consistency

## Symptom: reminders delayed after restart

Explanation:

- boot reconciliation can send digest for missed reminders after downtime

Action:

- inspect queue states and new fire times

## 5) Telegram integration issues

## Symptom: pairing code rejected

Checks:

- ensure code not expired (short TTL)
- ensure exact `/start <code>` format
- generate new pairing code and retry

## Symptom: webhook events not processed

Checks:

- verify webhook registration URL
- verify `TELEGRAM_WEBHOOK_SECRET`
- inspect `/api/telegram/webhook` logs
- confirm TLS/domain accessibility from public internet

## 6) Google Calendar issues

## Symptom: cannot connect Google account

Checks:

- verify Google env vars are set
- verify callback URI matches cloud console config
- inspect OAuth callback error logs

## Symptom: events not appearing/updating

Checks:

- verify account row exists in `google_accounts`
- verify sync enabled in preferences
- verify process lifecycle action invoked sync path
- check token expiry/refresh behavior

## 7) Database and migration issues

## Symptom: app fails on startup with migration errors

Checks:

- run `pnpm db:migrate` manually and inspect output
- inspect `drizzle` migration files and metadata consistency
- ensure DB file path exists and writable

## Symptom: library/troubleshoot content outdated

Checks:

- run `pnpm knowledge:sync`
- verify source markdown files changed as expected
- refresh pages and inspect guide tables

## 8) Deployment/runtime issues

## Symptom: container restart loop

Checks:

- `docker compose logs bread-pitt`
- verify entrypoint steps (migrate/sync/seed) success
- verify env variables and permissions

## Symptom: site unreachable but containers running

Checks:

- inspect Caddy logs
- verify domain DNS and certificate state
- verify reverse proxy target and app port

## 9) Useful commands

```bash
docker compose ps
docker compose logs --tail=200 bread-pitt
docker compose logs --tail=200 caddy
curl -fsS http://localhost:3000/api/health
pnpm db:migrate
pnpm knowledge:sync
```

## 10) Escalation guidance

Escalate to code-level investigation when:

- issue reproduces consistently with valid config
- DB data is inconsistent with expected action behavior
- integration callback succeeds but state updates do not occur

Capture before escalation:

- exact user action
- timestamp and timezone
- relevant logs
- current env and deployment mode

