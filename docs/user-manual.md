# User Manual

This guide explains how to use Bread Pitt day to day.

Audience: bakers and support engineers helping bakers.

Related docs: [product-overview.md](product-overview.md), [integrations.md](integrations.md), [troubleshooting.md](troubleshooting.md)

## 1) Before you begin

- You need a seeded account and password.
- Open the app URL in your browser.
- Sign in on `/login`.

If login fails, see [troubleshooting.md](troubleshooting.md).

## 2) Navigation basics

Main sections in the app:

- `/`: Today dashboard
- `/processes`: start new routines
- `/journal`: view all runs
- `/library`: learning content
- `/library/troubleshoot`: symptom lookup
- `/discard`: discard tracking
- `/settings`: personal preferences and integrations

## 3) Daily workflow (recommended)

1. Open `/` and check what is due next.
2. Use quick actions to complete or snooze steps.
3. Add notes/observations when needed.
4. Review full timeline in `/journal/[processId]`.
5. If you are stuck, search `/library/troubleshoot`.

## 4) Starting a process

1. Go to `/processes`.
2. Pick a process type:
   - starter build
   - bake day
   - weekly maintenance
   - discard purge
   - revival
3. Fill optional fields (nickname, kitchen temperature, process-specific options).
4. Confirm start.

Result:

- a new process run appears in journal
- timeline steps are generated
- reminders are queued

## 5) Managing an active process

From Today or Journal detail page, you can:

- complete step
- skip step
- add observation
- snooze reminder
- pause process
- resume process
- restart process
- abandon process

What each does:

- Pause: freezes run and cancels pending reminders.
- Resume: shifts remaining schedule by time spent paused.
- Restart: closes old run and starts a new one.
- Abandon: closes current run without finishing all steps.

## 6) Observations and notes

You can record:

- free-form notes
- step-linked observations
- Telegram photo observations (if paired)

Why this matters: historical notes improve future bake decisions.

## 7) Using the Library

### `/library`

- Browse guide chapters and sections.
- Read curated sourdough content from internal knowledge files.

### `/library/troubleshoot`

- Search symptoms.
- Review probable diagnosis and suggested fixes.

## 8) Using Discard tracking

On `/discard`, you can:

- track current grams in active jar
- log where discard was used
- rate outcomes
- close/archive jars

This helps reduce waste and keeps usage history visible.

## 9) Settings

In `/settings`, manage:

- display and starter nickname preferences
- kitchen temperature default
- notification enable/disable
- quiet hours
- Telegram pairing
- Google Calendar connection
- password change
- sign out

## 10) Telegram quick start (optional)

1. In settings, generate pairing code.
2. In Telegram, send `/start <code>` to your bot.
3. Once paired, use commands:
   - `/today`
   - `/status`
   - `/done`
   - `/snooze`

If reminders are late overnight, quiet hours may be delaying delivery.

## 11) Google Calendar quick start (optional)

1. Open settings and choose connect for Google.
2. Complete OAuth consent.
3. Confirm sync toggle is enabled.

Process steps then appear as calendar events and update as lifecycle changes occur.

## 12) Common user scenarios

### I missed reminders while server was down

- On restart, the app may send a digest of missed reminders.
- Open Today/Journal and verify current status.

### I changed my kitchen temperature

- Update preference in settings.
- New process runs use the new default.

### I want to start over

- Use restart for a clean run while keeping history.

## 13) Verification checklist

- You can log in and reach `/`.
- Starting a process generates timeline steps.
- Completing a step updates Today and Journal.
- Settings updates persist after refresh.
- Optional integrations work when enabled and do not block core usage when disabled.

