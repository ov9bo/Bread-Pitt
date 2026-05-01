# Integrations

This document explains the optional integrations used by Bread Pitt: Telegram and Google Calendar.

Related docs: [user-manual.md](user-manual.md), [security.md](security.md), [troubleshooting.md](troubleshooting.md)

## 1) Integration philosophy

- Integrations are optional.
- Core app behavior must work without them.
- SQLite remains source of truth for process state.
- Integrations should mirror and notify, not own state.

## 2) Telegram integration

## What it provides

- reminder delivery
- quick command interaction (`/today`, `/status`, `/done`, `/snooze`)
- pairing flow from settings
- optional photo-based observations

## Required configuration

- `TELEGRAM_BOT_TOKEN`
- `TELEGRAM_WEBHOOK_SECRET`
- public base URL reachable by Telegram (`PUBLIC_BASE_URL`)

## Setup steps

1. Create Telegram bot via BotFather.
2. Set env vars.
3. Configure webhook:

```bash
curl "https://api.telegram.org/bot$TELEGRAM_BOT_TOKEN/setWebhook" \
  -d "url=$PUBLIC_BASE_URL/api/telegram/webhook" \
  -d "secret_token=$TELEGRAM_WEBHOOK_SECRET"
```

4. In app settings, generate pairing code.
5. Send `/start <code>` to the bot from your Telegram account.

## Runtime behavior

- scheduler sends due reminders to paired chat id
- webhook processes commands and writes updates to DB
- quiet hours and notification toggles are respected

## Failure patterns

- missing token/secret
- webhook URL unreachable
- pairing code expired
- user not paired (`telegramChatId` missing)

## 3) Google Calendar integration

## What it provides

- mirrors process steps as calendar events
- keeps calendar in sync with lifecycle transitions

## Required configuration

- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `GOOGLE_OAUTH_REDIRECT_URL`

OAuth redirect must match the app callback route.

## Setup steps

1. Create OAuth credentials in Google Cloud Console.
2. Enable Calendar API.
3. Configure redirect URI to `/api/google/oauth/callback`.
4. Set env vars and restart app.
5. In settings, click connect and finish consent.

## Runtime behavior

- OAuth start route builds signed state and redirects to Google.
- Callback exchanges code for tokens and stores account linkage.
- Sync layer ensures target calendar and upserts/cancels events.
- User can disable sync or disconnect account from settings.

## Failure patterns

- invalid redirect URI
- missing env vars
- state verification failure
- expired/revoked refresh token

## 4) Data touchpoints

Telegram-related:

- `users.telegramChatId`
- `reminders` dispatch status fields

Google-related:

- `google_accounts`
- `google_events`
- process step IDs used as sync anchors

## 5) Security notes

- Telegram webhook secret must be random and rotated if leaked.
- OAuth state signature uses `SESSION_SECRET`.
- Google tokens are currently plaintext in DB; protect host and backups carefully.
- Do not log secrets or access tokens.

## 6) Operations notes

- Integration failures should not break core process actions.
- Treat network/API failures as retriable where appropriate.
- Ensure public URL and TLS are stable for webhook/OAuth reliability.

## 7) Verification checklist

- Telegram:
  - webhook successfully registered
  - pairing succeeds
  - reminder command roundtrip works
- Google:
  - connect flow completes
  - calendar events appear for active process steps
  - pause/resume/complete updates are reflected in calendar

