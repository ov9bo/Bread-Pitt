# Product Overview

This document describes what Bread Pitt does, who it serves, and how users move through the product.

Related docs: [user-manual.md](user-manual.md), [integrations.md](integrations.md), [architecture.md](architecture.md)

## 1) Product mission

Bread Pitt helps a baker run sourdough routines with confidence by turning fuzzy timing into clear, trackable process timelines.

## 2) Target users

- Solo home baker managing starter health and bake routines.
- User who wants reminders and reduced mental load.
- User who self-hosts tools and prefers data ownership.

Current product model is intentionally single-user.

## 3) Core capabilities

- process timelines (starter build, bake day, maintenance, discard purge, revival)
- timed reminders with retry behavior
- observation logging (text and optional Telegram photo flow)
- journaled process history
- in-app sourdough library and troubleshooting search
- discard jar tracking and usage logs
- optional Telegram bot pairing
- optional Google Calendar sync

## 4) Route map

- `/login`: authentication
- `/`: Today dashboard
- `/processes`: process catalog and start flows
- `/journal`: process history
- `/journal/[processId]`: process detail timeline and actions
- `/library`: structured learning guide
- `/library/troubleshoot`: symptom-based search and troubleshooting rows
- `/discard`: discard jar management
- `/settings`: preferences, integrations, password, sign out
- `/api/health`: health endpoint
- `/api/telegram/webhook`: Telegram webhook
- `/api/google/oauth/start`, `/api/google/oauth/callback`: Google OAuth

## 5) End-to-end user journey

### First setup

1. Admin account is seeded by script or container entrypoint.
2. User logs in at `/login`.
3. User visits `/settings` and configures preferences.
4. Optional: user pairs Telegram and/or connects Google.

### Daily usage

1. User checks `/` for due actions and next timeline.
2. User completes or snoozes steps.
3. User records observations.
4. User reviews history in `/journal`.
5. User uses `/library` or `/library/troubleshoot` when uncertain.

## 6) Primary workflows

### Process lifecycle workflow

- start a process from `/processes`
- steps/reminders are generated
- user executes steps over time
- process can be paused/resumed/restarted/abandoned
- completed process remains in historical journal

### Reminder workflow

- pending reminders stored in DB
- scheduler dispatches to Telegram when due
- failures retried with backoff
- quiet hours defer dispatch

### Knowledge workflow

- markdown source files sync into DB
- UI reads section hierarchy and searchable troubleshooting content

## 7) Product boundaries

In scope:

- personal baking workflow support
- schedule guidance and lightweight productivity tooling

Out of scope:

- multi-user team collaboration
- cloud-hosted SaaS account system
- advanced inventory/commerce/planning systems

## 8) Success indicators

- user consistently completes timelines with fewer missed steps
- process history and observations are retained and useful
- reminders remain reliable through restarts/downtime
- integrations stay optional and do not block core value

## 9) Known constraints

- single-user account model
- SQLite local file persistence
- scheduler runs in same process as web app
- external integrations depend on third-party APIs and credentials

## 10) Verification checklist

- create one run for each process type and confirm expected route flows
- confirm timeline and journal states update after lifecycle operations
- test app with integrations disabled and verify full core usability

