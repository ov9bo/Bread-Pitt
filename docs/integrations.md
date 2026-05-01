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

**1. Create the bot**

1. Open Telegram and search for **@BotFather**.
2. Send `/newbot` and follow the prompts.
3. Copy the bot token (format: `123456:ABC-DEF...`).

**2. Add env vars to `.env`**

```
TELEGRAM_BOT_TOKEN=your-token-here
TELEGRAM_WEBHOOK_SECRET=any-random-string
```

Restart the dev server after saving.

**3. Expose localhost with a tunnel (local dev only)**

Telegram needs to reach your machine over the internet. Install [ngrok](https://ngrok.com), then run:

```bash
ngrok http 3000
```

Copy the `https://xxxx.ngrok-free.app` URL it gives you. Set `PUBLIC_BASE_URL` in `.env` to this URL and restart the server.

> Note: ngrok URLs change on every restart. Re-register the webhook (step 4) each time. Use a paid ngrok plan with a fixed domain to avoid this.

**4. Register the webhook with Telegram**

```bash
curl "https://api.telegram.org/bot$TELEGRAM_BOT_TOKEN/setWebhook" \
  -d "url=$PUBLIC_BASE_URL/api/telegram/webhook" \
  -d "secret_token=$TELEGRAM_WEBHOOK_SECRET"
```

You should get `{"ok":true}` back. You can also do this in the browser by visiting the URL directly.

**5. Pair the bot to your account**

1. Open the app → **Settings → Telegram**.
2. Click **Generate pairing code** — you'll get a 6-digit code.
3. Open your bot in Telegram and send: `/start 123456` (your code).
4. The bot replies confirming it's linked.

## Available commands once paired

| Command | What it does |
|---------|-------------|
| `/today` | Lists what's due in the next 24 hours |
| `/status` | Shows health of all active processes |
| `/done` | Marks the most recent due step complete |
| `/snooze 30m` | Delays the next reminder (accepts `m`/`h`) |
| Send a photo | Logs it as an observation on the current step |

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

**1. Create a Google Cloud project and OAuth credentials**

1. Go to [console.cloud.google.com](https://console.cloud.google.com/).
2. Create a new project (or select an existing one).
3. In the left menu go to **APIs & Services → Library**.
4. Search for **Google Calendar API** and click **Enable**.
5. Go to **APIs & Services → Credentials**.
6. Click **Create Credentials → OAuth client ID**.
7. Set application type to **Web application**.
8. Under **Authorized redirect URIs**, add:
   ```
   http://localhost:3000/api/google/oauth/callback
   ```
   (Replace with your `PUBLIC_BASE_URL` if different, e.g. your ngrok URL.)
9. Click **Create** and copy the **Client ID** and **Client Secret**.

**2. Configure the OAuth consent screen**

1. Go to **APIs & Services → OAuth consent screen**.
2. Choose **External** (for personal use this is fine).
3. Fill in the app name, your email, and save.
4. Under **Scopes**, add `https://www.googleapis.com/auth/calendar`.
5. Under **Test users**, add your Google account email.

> While the app is in "Testing" mode, only added test users can connect. This is fine for personal/local use.

**3. Add env vars to `.env`**

```
GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-client-secret
GOOGLE_OAUTH_REDIRECT_URL=http://localhost:3000/api/google/oauth/callback
```

Restart the dev server after saving.

**4. Connect your Google account in the app**

1. Open the app → **Settings → Google Calendar**.
2. Click **Connect Google Calendar**.
3. You'll be redirected to Google's consent screen — approve it.
4. You'll be redirected back to the app and the connection will show as active.

**5. Verify**

Start a process — its steps should appear as events in your Google Calendar within a few seconds.

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

