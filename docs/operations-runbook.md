# Operations Runbook

This runbook covers deployment, maintenance, backup/restore, and incident response for Bread Pitt.

Related docs: [security.md](security.md), [troubleshooting.md](troubleshooting.md), [architecture.md](architecture.md)

## 1) Runtime components

- `bread-pitt` container: Next.js standalone app + scheduler
- `caddy` container: TLS termination and reverse proxy
- `data/` volume: SQLite DB, uploads, backups

Core files:

- `Dockerfile`
- `docker-compose.yml`
- `Caddyfile`
- `docker/entrypoint.sh`

## 2) Bootstrap sequence

On container startup, entrypoint runs:

1. migrations (`scripts/migrate.ts`)
2. knowledge sync (`scripts/sync-knowledge.ts`)
3. optional admin seed (if `ADMIN_PASSWORD` set and no users exist)
4. app server start

Operational implication: startup can fail before serving traffic if any setup step fails.

## 3) Deployment procedure

## Pre-deploy checklist

- validate `.env` values
- confirm backup exists
- review pending migration risk
- confirm domain and TLS settings

## Deploy

```bash
docker compose up -d --build
```

## Post-deploy checks

```bash
docker compose ps
docker compose logs --tail=200 bread-pitt
curl -fsS https://<your-domain>/api/health
```

Expected:

- containers are healthy/running
- migration and knowledge sync logs show success
- health endpoint returns 200

## 4) Environment variable operations

Important runtime vars:

- `DOMAIN`, `ACME_EMAIL`
- `SESSION_SECRET`
- `PUBLIC_BASE_URL`
- `TELEGRAM_BOT_TOKEN`, `TELEGRAM_WEBHOOK_SECRET` (optional)
- `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_OAUTH_REDIRECT_URL` (optional)
- `ADMIN_PASSWORD`, `ADMIN_DISPLAY_NAME` (bootstrap only)

Note: current DB client uses fixed path in code; `DATABASE_URL` is not currently the effective source of truth.

## 5) Health monitoring

Minimum checks:

- `/api/health` availability
- container restart count
- scheduler error logs
- webhook callback errors
- migration failures on startup

Recommended:

- centralize container logs
- configure alerting on repeated restart loops

## 6) Backup operations

Backup script:

```bash
./scripts/backup.sh
```

Behavior:

- creates SQLite-safe backup snapshot
- compresses output (`.db.gz`)
- prunes old backups by retention days

Recommended schedule:

- run daily via host cron
- periodically verify backup integrity by test restore

## 7) Restore procedure (manual)

1. stop app container:

```bash
docker compose stop bread-pitt
```

2. restore DB file from selected backup (decompress first if needed)
3. ensure DB file permissions are correct
4. start app:

```bash
docker compose up -d bread-pitt
```

5. validate `/api/health` and key UI routes

## 8) Upgrade and rollback strategy

## Upgrade

1. pull new code
2. run backup
3. deploy (`docker compose up -d --build`)
4. verify health and basic workflows

## Rollback

1. redeploy prior image/revision
2. if migration introduced incompatible changes, restore DB from pre-upgrade backup
3. validate app behavior and integrations

## 9) Routine maintenance

- rotate secrets periodically
- prune stale logs and backup artifacts
- keep dependencies up to date
- verify Telegram webhook and Google OAuth settings after domain changes

## 10) Incident response quick guide

### Service down

- check `docker compose ps`
- inspect app and caddy logs
- verify env file and disk capacity

### Login issues

- verify session secret consistency
- verify users table exists and has account row

### Reminder failures

- verify scheduler logs
- verify Telegram config and pairing state
- inspect reminder status/attempt fields

### Calendar sync failures

- verify Google env vars and redirect URL
- inspect OAuth callback errors
- inspect account token expiry state

## 11) Verification checklist

- deployment path can be executed by a new operator
- backup and restore procedures are tested at least once
- failures produce actionable logs
- security controls in [security.md](security.md) are applied

