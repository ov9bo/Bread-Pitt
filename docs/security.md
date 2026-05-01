# Security

This document defines Bread Pitt's security model, controls, known gaps, and hardening actions.

Related docs: [operations-runbook.md](operations-runbook.md), [integrations.md](integrations.md), [architecture.md](architecture.md)

## 1) Security model summary

Bread Pitt is a single-user, self-hosted web application.

Primary trust assumptions:

- deployment owner controls host, network, and secrets
- only trusted user account should access authenticated UI
- public endpoints are limited and controlled

## 2) Threat surface

Main externally reachable surfaces:

- web app routes (through Caddy)
- `/api/telegram/webhook`
- `/api/google/oauth/callback`

Main sensitive assets:

- session signing secret
- password hash
- Telegram bot token and webhook secret
- Google OAuth client secret and refresh tokens
- SQLite database contents and backups

## 3) Authentication and session controls

Implemented controls:

- bcrypt password verification
- JWT session cookie (`httpOnly`, `sameSite=lax`, secure in production)
- server-side session table validation
- middleware access control for authenticated routes

Operational requirements:

- use strong `SESSION_SECRET` (32+ random bytes)
- rotate secret if compromised (this invalidates sessions)

## 4) Secret management

Secrets currently arrive via environment variables.

Required practices:

- never commit `.env` files
- restrict host and CI access to secret values
- rotate integration tokens after personnel or host changes
- avoid exposing secrets in logs or debug output

## 5) Telegram security controls

Existing controls:

- webhook secret token verification
- short-lived pairing code with expiration

Hardening recommendations:

- rotate `TELEGRAM_WEBHOOK_SECRET` after suspected leak
- rotate bot token after compromise
- monitor webhook request failures and unusual traffic

## 6) Google OAuth security controls

Existing controls:

- signed OAuth state with timestamp and nonce
- callback verification path before token exchange

Known risk:

- access/refresh tokens are stored plaintext in DB currently

Mitigation roadmap:

- encrypt tokens at rest using app-managed encryption key
- protect backups as sensitive credential material
- support token revocation and forced reconnect playbook

## 7) Database and data-at-rest security

Current behavior:

- SQLite file in local `data/`
- WAL mode enabled
- backups generated to `data/backups`

Required controls:

- file permission hardening for data directory
- encrypted disk/volume where possible
- restricted backup access and retention policy

## 8) Secure deployment checklist

- use TLS (Caddy with ACME)
- run app as non-root (already configured in container)
- keep host firewall restrictive
- expose only required ports
- keep dependencies patched
- verify health and logs after deploy

## 9) Known security gaps and debt

- plaintext Google tokens in `google_accounts`
- documentation drift around `ADMIN_PASSWORD_HASH` behavior
- DB path configuration drift (`DATABASE_URL` not effective source of truth)
- callback error details may propagate in redirect query reason text

Track remediation in engineering backlog and update this file when fixed.

## 10) Incident response playbooks

### Suspected secret leak

1. rotate affected secret immediately
2. redeploy containers with updated env
3. invalidate affected sessions/tokens where applicable
4. audit logs and host access

### Account compromise suspicion

1. change account password
2. clear all active sessions
3. rotate `SESSION_SECRET` if needed
4. review integrations and reconnect safely

### Host compromise suspicion

1. isolate host/network
2. restore from known-good backup on clean host
3. rotate all secrets and integration credentials
4. verify integrity before reopening access

## 11) Verification checklist

- session protections behave as expected in production mode
- webhook secret validation blocks invalid Telegram calls
- OAuth state rejection works for tampered callback states
- backups are treated with same sensitivity as production DB

